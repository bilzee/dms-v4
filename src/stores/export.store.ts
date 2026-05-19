import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface ExportStatus {
  id: string;
  dataType: string;
  format: string;
  status: 'idle' | 'processing' | 'completed' | 'error' | 'scheduled';
  progress?: number;
  downloadUrl?: string;
  error?: string;
  scheduledFor?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ExportRequest {
  dataType: string;
  format: 'csv' | 'xlsx' | 'png' | 'svg' | 'pdf';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  filters?: Record<string, unknown>;
  options?: {
    includeCharts?: boolean;
    includeMaps?: boolean;
    includeImages?: boolean;
    pageSize?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    title?: string;
    subtitle?: string;
    watermark?: string;
  };
  recipients?: Array<{
    email: string;
    name?: string;
    format?: 'pdf' | 'csv' | 'html';
  }>;
}

export interface ScheduleExportRequest extends ExportRequest {
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number; // 0-6 (Sunday-Saturday)
    dayOfMonth?: number; // 1-31
    time: string; // HH:MM format
    timezone?: string;
  };
}

export interface ScheduledReport {
  id: string;
  userId: string;
  reportType: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
    timezone?: string;
  };
  recipients: Array<{
    email: string;
    name?: string;
    format?: 'pdf' | 'csv' | 'html';
  }>;
  filters: Record<string, unknown>;
  defaultDateRange: {
    type: string;
    startDate?: string;
    endDate?: string;
  };
  options: {
    includeCharts?: boolean;
    includeMaps?: boolean;
    includeImages?: boolean;
    pageSize?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    title?: string;
    subtitle?: string;
    watermark?: string;
  };
  isActive: boolean;
  createdAt: Date;
  lastRun?: Date;
  nextRun?: Date;
}

interface ExportState {
  // Current export status
  exportStatuses: Record<string, ExportStatus>;
  currentExports: string[]; // Array of export IDs
  
  // UI state
  isModalOpen: boolean;
  modalDataType?: string;
  modalInitialValues?: Partial<ExportRequest>;
  
  // Scheduled reports
  scheduledReports: ScheduledReport[];
  
  // Export options
  availableExportTypes: string[];
  availableFormats: Record<string, string[]>;
  
  // Actions
  startExport: (request: ExportRequest) => Promise<void>;
  scheduleExport: (request: ScheduleExportRequest) => Promise<void>;
  cancelExport: (exportId: string) => void;
  retryExport: (exportId: string) => void;
  downloadExport: (exportId: string) => void;
  getExportStatus: (exportId: string) => ExportStatus | undefined;
  updateExportStatus: (exportId: string, status: Partial<ExportStatus>) => void;
  getExportOptions: (dataType: string) => { availableFormats: string[]; defaultFormat: string };
  
  // Modal actions
  openExportModal: (data: { dataType?: string; initialValues?: Partial<ExportRequest> }) => void;
  closeExportModal: () => void;
  
  // Scheduled reports actions
  loadScheduledReports: () => Promise<void>;
  createScheduledReport: (request: ScheduleExportRequest) => Promise<void>;
  updateScheduledReport: (reportId: string, updates: Partial<ScheduledReport>) => Promise<void>;
  deleteScheduledReport: (reportId: string) => Promise<void>;
  
  // Cleanup
  cleanupOldExports: () => void;
  clearCompletedExports: () => void;
}

export const useExportStore = create<ExportState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        exportStatuses: {},
        currentExports: [],
        isModalOpen: false,
        scheduledReports: [],
        availableExportTypes: ['assessments', 'responses', 'entities', 'incidents', 'commitments'],
        availableFormats: {
          'assessments': ['csv', 'xlsx', 'pdf'],
          'responses': ['csv', 'xlsx', 'pdf'],
          'entities': ['csv', 'xlsx', 'pdf'],
          'incidents': ['csv', 'xlsx', 'pdf'],
          'commitments': ['csv', 'xlsx', 'pdf'],
        },

        // Export actions
        startExport: async (request: ExportRequest) => {
          const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // Set initial status
          const initialStatus: ExportStatus = {
            id: exportId,
            dataType: request.dataType,
            format: request.format,
            status: 'processing',
            progress: 0,
            createdAt: new Date(),
          };
          
          set((state) => ({
            exportStatuses: {
              ...state.exportStatuses,
              [exportId]: initialStatus,
            },
            currentExports: [...state.currentExports, exportId],
          }));

          try {
            // Start export process
            const response = await fetch('/api/v1/exports/csv', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(request),
            });

            if (!response.ok) {
              throw new Error(`Export failed: ${response.statusText}`);
            }

            // Handle successful export based on format
            if (request.format === 'csv' || request.format === 'xlsx') {
              // For CSV/Excel, trigger download
              const blob = await response.blob();
              const downloadUrl = URL.createObjectURL(blob);
              
              set((state) => ({
                exportStatuses: {
                  ...state.exportStatuses,
                  [exportId]: {
                    ...state.exportStatuses[exportId],
                    status: 'completed',
                    downloadUrl,
                    completedAt: new Date(),
                  },
                },
              }));

              // Trigger download
              setTimeout(() => {
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${request.dataType}_export_${new Date().toISOString().split('T')[0]}.${request.format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
              }, 100);
            } else if (request.format === 'pdf') {
              // For PDF reports, check job status
              const result = await response.json();
              
              set((state) => ({
                exportStatuses: {
                  ...state.exportStatuses,
                  [exportId]: {
                    ...state.exportStatuses[exportId],
                    status: 'completed',
                    downloadUrl: result.data.fileUrl,
                    completedAt: new Date(),
                  },
                },
              }));
            } else if (request.format === 'png' || request.format === 'svg') {
              // For chart exports, download directly
              const blob = await response.blob();
              const downloadUrl = URL.createObjectURL(blob);
              
              set((state) => ({
                exportStatuses: {
                  ...state.exportStatuses,
                  [exportId]: {
                    ...state.exportStatuses[exportId],
                    status: 'completed',
                    downloadUrl,
                    completedAt: new Date(),
                  },
                },
              }));

              // Trigger download
              setTimeout(() => {
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${request.dataType}_chart_${new Date().toISOString().split('T')[0]}.${request.format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
              }, 100);
            }
          } catch (error) {
            console.error('Export failed:', error);
            
            set((state) => ({
              exportStatuses: {
                ...state.exportStatuses,
                [exportId]: {
                  ...state.exportStatuses[exportId],
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Unknown error',
                },
              },
            }));
          }
        },

        scheduleExport: async (request: ScheduleExportRequest) => {
          try {
            const response = await fetch('/api/v1/exports/schedule', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(request),
            });

            if (!response.ok) {
              throw new Error(`Failed to schedule export: ${response.statusText}`);
            }

            const result = await response.json();
            
            // Add to scheduled reports
            const newScheduledReport: ScheduledReport = {
              id: result.data.scheduledReportId,
              userId: 'current-user', // This would come from session
              reportType: request.dataType,
              schedule: request.schedule,
              recipients: request.recipients || [],
              filters: request.filters || {},
              defaultDateRange: {
                type: 'last_7_days', // Default, could be configurable
                startDate: undefined,
                endDate: undefined,
              },
              options: request.options || {},
              isActive: true,
              createdAt: new Date(),
              nextRun: new Date(result.data.nextRun),
            };

            set((state) => ({
              scheduledReports: [...state.scheduledReports, newScheduledReport],
            }));

            // Show success message
            if (typeof window !== 'undefined') {
              // In production, use proper notification system
              alert(`Export scheduled successfully for ${new Date(result.data.nextRun).toLocaleDateString()}`);
            }
          } catch (error) {
            console.error('Failed to schedule export:', error);
            
            if (typeof window !== 'undefined') {
              alert(`Failed to schedule export: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        },

        cancelExport: (exportId: string) => {
          set((state) => {
            const updatedStatuses = { ...state.exportStatuses };
            delete updatedStatuses[exportId];
            
            return {
              exportStatuses: updatedStatuses,
              currentExports: state.currentExports.filter(id => id !== exportId),
            };
          });
        },

        retryExport: async (exportId: string) => {
          const status = get().exportStatuses[exportId];
          if (status) {
            // Extract original request and retry
            const request: ExportRequest = {
              dataType: status.dataType,
              format: status.format as 'csv' | 'xlsx' | 'png' | 'svg' | 'pdf',
              dateRange: {
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
              },
            };
            
            get().startExport(request);
          }
        },

        downloadExport: (exportId: string) => {
          const status = get().exportStatuses[exportId];
          
          if (status?.downloadUrl && status.status === 'completed') {
            const a = document.createElement('a');
            a.href = status.downloadUrl;
            a.download = `${status.dataType}_export_${new Date().toISOString().split('T')[0]}.${status.format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        },

        getExportStatus: (exportId: string) => {
          return get().exportStatuses[exportId];
        },

        updateExportStatus: (exportId: string, update: Partial<ExportStatus>) => {
          set((state) => ({
            exportStatuses: {
              ...state.exportStatuses,
              [exportId]: {
                ...state.exportStatuses[exportId],
                ...update,
              },
            },
          }));
        },

        getExportOptions: (dataType: string) => {
          // Return export options for the specified data type
          const state = get();
          return {
            availableFormats: state.availableFormats[dataType] || ['csv', 'xlsx'],
            defaultFormat: 'csv',
          };
        },

        // Modal actions
        openExportModal: ({ dataType, initialValues }) => {
          set({
            isModalOpen: true,
            modalDataType: dataType,
            modalInitialValues: initialValues,
          });
        },

        closeExportModal: () => {
          set({
            isModalOpen: false,
            modalDataType: undefined,
            modalInitialValues: undefined,
          });
        },

        // Scheduled reports actions
        loadScheduledReports: async () => {
          try {
            const response = await fetch('/api/v1/exports/schedule');
            
            if (!response.ok) {
              throw new Error(`Failed to load scheduled reports: ${response.statusText}`);
            }

            const result = await response.json();
            
            set({
              scheduledReports: result.data || [],
            });
          } catch (error) {
            console.error('Failed to load scheduled reports:', error);
          }
        },

        createScheduledReport: async (request: ScheduleExportRequest) => {
          await get().scheduleExport(request);
        },

        updateScheduledReport: async (reportId: string, updates: Partial<ScheduledReport>) => {
          try {
            const response = await fetch(`/api/v1/exports/schedule?id=${reportId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updates),
            });

            if (!response.ok) {
              throw new Error(`Failed to update scheduled report: ${response.statusText}`);
            }

            const result = await response.json();
            
            set((state) => ({
              scheduledReports: state.scheduledReports.map(report =>
                report.id === reportId ? { ...report, ...result.data } : report
              ),
            }));
          } catch (error) {
            console.error('Failed to update scheduled report:', error);
          }
        },

        deleteScheduledReport: async (reportId: string) => {
          try {
            const response = await fetch(`/api/v1/exports/schedule?id=${reportId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              throw new Error(`Failed to delete scheduled report: ${response.statusText}`);
            }

            set((state) => ({
              scheduledReports: state.scheduledReports.filter(report => report.id !== reportId),
            }));
          } catch (error) {
            console.error('Failed to delete scheduled report:', error);
          }
        },

        // Cleanup actions
        cleanupOldExports: () => {
          const now = new Date();
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          
          set((state) => {
            const updatedStatuses = { ...state.exportStatuses };
            const oldExports: string[] = [];
            
            Object.entries(updatedStatuses).forEach(([exportId, status]) => {
              if (status.createdAt < oneWeekAgo) {
                delete updatedStatuses[exportId];
                oldExports.push(exportId);
              }
            });
            
            return {
              exportStatuses: updatedStatuses,
              currentExports: state.currentExports.filter(id => !oldExports.includes(id)),
            };
          });
        },

        clearCompletedExports: () => {
          set((state) => {
            const updatedStatuses = { ...state.exportStatuses };
            const completedExports: string[] = [];
            
            Object.entries(updatedStatuses).forEach(([exportId, status]) => {
              if (status.status === 'completed') {
                delete updatedStatuses[exportId];
                completedExports.push(exportId);
              }
            });
            
            return {
              exportStatuses: updatedStatuses,
              currentExports: state.currentExports.filter(id => !completedExports.includes(id)),
            };
          });
        },
      }),
      {
        name: 'export-store',
        partialize: (state) => ({
          exportStatuses: state.exportStatuses,
          scheduledReports: state.scheduledReports,
        }),
      }
    ),
    {
      name: 'export-store',
    }
  )
);

// Selectors
export const useCurrentExports = () => useExportStore((state) => 
  state.currentExports.map(id => state.exportStatuses[id]).filter(Boolean)
);

export const useScheduledReports = () => useExportStore((state) => state.scheduledReports);

export const useExportModal = () => useExportStore((state) => ({
  isOpen: state.isModalOpen,
  dataType: state.modalDataType,
  initialValues: state.modalInitialValues,
}));