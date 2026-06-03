// Verification Types for Assessment Verification Workflow

export type VerificationStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'AUTO_VERIFIED'
  | 'REJECTED';

export type RejectionReason = 
  | 'INCOMPLETE_DATA'
  | 'INACCURATE_INFORMATION'
  | 'MISSING_DOCUMENTATION'
  | 'LOCATION_MISMATCH'
  | 'DUPLICATE_ASSESSMENT'
  | 'QUALITY_ISSUES'
  | 'OTHER';

export interface VerificationAction {
  id: string;
  assessmentId: string;
  action: 'VERIFY' | 'REJECT';
  performedBy: string;
  performedAt: Date;
  reason?: RejectionReason;
  feedback?: string;
  notes?: string;
}

export interface VerificationQueueItem {
  id: string;
  rapidAssessmentType: string;
  rapidAssessmentDate: Date;
  verificationStatus: VerificationStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: string;
  coordinates?: any;
  gapAnalysis?: any;
  mediaAttachments?: any;
  assessorName?: string;
  versionNumber?: number;
  isOfflineCreated?: boolean;
  incidentId?: string;
  rejectionReason?: string;
  rejectionFeedback?: string;
  responseDate?: Date;
  entity: {
    id: string;
    name: string;
    type: string;
    location: string;
    autoApproveEnabled: boolean;
  };
  assessor: {
    id: string;
    name: string;
    email: string;
  };
  incident?: {
    id: string;
    name: string;
    type: string;
  };
  responder?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationQueueFilters {
  status?: VerificationStatus;
  entityId?: string;
  assessmentType?: string;
  priority?: string;
  assessorId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: string;
  sortOrder?: string;
}

export interface VerificationQueueResponse {
  success?: true;
  data: VerificationQueueItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  queueDepth?: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  metrics?: {
    averageWaitTime: number;
    verificationRate: number;
    oldestPending: string | null;
  };
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

export interface VerificationMetrics {
  totalPending: number;
  totalVerified: number;
  totalRejected: number;
  totalAutoVerified: number;
  averageProcessingTime: number;
  pendingByType: Record<string, number>;
  verificationRate: number;
  rejectionRate: number;
}

// Form interfaces for verification actions
export interface VerifyAssessmentRequest {
  notes?: string;
  metadata?: Record<string, any>;
}

export interface RejectAssessmentRequest {
  reason: RejectionReason;
  feedback: string;
  metadata?: Record<string, any>;
}

// Auto-approval configuration
export interface AutoApprovalConfig {
  entityId: string;
  enabled: boolean;
  conditions?: {
    assessmentTypes?: string[];
    maxPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresDocumentation?: boolean;
  };
  lastModified: Date;
  modifiedBy: string;
}

// Status indicator props
export interface StatusIndicatorProps {
  status: VerificationStatus;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

// Verification history for audit trail
export interface VerificationHistoryItem {
  id: string;
  action: string;
  performedBy: {
    id: string;
    name: string;
  };
  performedAt: Date;
  details: Record<string, any>;
  previousStatus?: VerificationStatus;
  newStatus: VerificationStatus;
}