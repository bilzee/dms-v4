// Offline Bootstrap Service for DRMS
// Ensures critical data is available offline for Assessor and Responder roles

import { offlineDB } from '@/lib/db/offline';
import { useSyncStore } from '@/stores/sync.store';
import { apiGet, extractArray } from '@/lib/api'
import { getAuthToken } from '@/lib/auth/token-utils'

export interface BootstrapProgress {
  stage: 'initializing' | 'entities' | 'incidents' | 'assessments' | 'config' | 'completed';
  progress: number; // 0-100
  message: string;
  errors: string[];
}

export interface CoreDataSets {
  entities: Array<{
    id: string;
    name: string;
    type: string;
    location?: string;
    coordinates?: any;
    isActive: boolean;
  }>;
  incidents: Array<{
    id: string;
    name: string;
    type: string;
    severity: string;
    status: string;
    description: string;
    location: string;
  }>;
  verifiedAssessments: Array<{
    id: string;
    entityId: string;
    incidentId: string;
    assessmentType: string;
    status: string;
    priority: string;
    data: any;
  }>;
  systemConfig: {
    gapFieldSeverities: Array<{
      fieldName: string;
      assessmentType: string;
      severity: string;
      displayName: string;
    }>;
    assessmentTypes: string[];
    responseTypes: string[];
    priorities: string[];
  };
}

export class OfflineBootstrapService {
  private static instance: OfflineBootstrapService;
  private isBootstrapping = false;
  private lastBootstrap?: Date;
  private progressCallback?: (progress: BootstrapProgress) => void;

  private constructor() {}

  static getInstance(): OfflineBootstrapService {
    if (!OfflineBootstrapService.instance) {
      OfflineBootstrapService.instance = new OfflineBootstrapService();
    }
    return OfflineBootstrapService.instance;
  }

  /**
   * Bootstrap critical data for offline operation
   * Called when app first loads or when user role requires specific data
   */
  async bootstrap(
    userRole: 'ASSESSOR' | 'RESPONDER' | 'COORDINATOR' | 'DONOR' | 'ADMIN',
    onProgress?: (progress: BootstrapProgress) => void
  ): Promise<boolean> {
    
    if (this.isBootstrapping) {
      console.log('🔄 Bootstrap already in progress');
      return false;
    }

    this.isBootstrapping = true;
    this.progressCallback = onProgress;
    
    try {
      console.log(`🚀 Starting offline bootstrap for role: ${userRole}`);
      
      // Check if bootstrap is needed
      const needsBootstrap = await this.shouldBootstrap(userRole);
      if (!needsBootstrap) {
        this.updateProgress('completed', 100, 'Already up to date');
        return true;
      }

      // Stage 1: Initialize offline database
      this.updateProgress('initializing', 10, 'Preparing offline storage...');
      await this.ensureOfflineDBReady();

      // Stage 2: Load entities (critical for both Assessors and Responders)
      this.updateProgress('entities', 25, 'Loading entities and locations...');
      await this.loadCoreEntities();

      // Stage 3: Load active incidents
      this.updateProgress('incidents', 45, 'Loading active incidents...');
      await this.loadActiveIncidents();

      // Stage 4: Role-specific data
      if (userRole === 'ASSESSOR') {
        this.updateProgress('assessments', 65, 'Loading assessment templates...');
        await this.loadAssessmentData();
      } else if (userRole === 'RESPONDER') {
        this.updateProgress('assessments', 65, 'Loading verified assessments...');
        await this.loadVerifiedAssessments();
      }

      // Stage 5: System configuration
      this.updateProgress('config', 85, 'Loading system configuration...');
      await this.loadSystemConfig();

      // Complete
      this.updateProgress('completed', 100, 'Offline data ready');
      this.lastBootstrap = new Date();
      
      // Store bootstrap timestamp
      localStorage.setItem('drms_last_bootstrap', this.lastBootstrap.toISOString());
      localStorage.setItem('drms_bootstrap_role', userRole);

      console.log('✅ Offline bootstrap completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Bootstrap failed:', error);
      this.updateProgress('initializing', 0, 'Bootstrap failed', [
        error instanceof Error ? error.message : 'Unknown error'
      ]);
      return false;
    } finally {
      this.isBootstrapping = false;
    }
  }

  /**
   * Check if bootstrap is needed
   */
  private async shouldBootstrap(userRole: string): Promise<boolean> {
    try {
      const lastBootstrapStr = localStorage.getItem('drms_last_bootstrap');
      const lastBootstrapRole = localStorage.getItem('drms_bootstrap_role');
      
      if (!lastBootstrapStr || lastBootstrapRole !== userRole) {
        return true; // First time or role changed
      }

      const lastBootstrap = new Date(lastBootstrapStr);
      const hoursSinceBootstrap = (Date.now() - lastBootstrap.getTime()) / (1000 * 60 * 60);
      
      // Re-bootstrap if more than 24 hours old
      if (hoursSinceBootstrap > 24) {
        return true;
      }

      // Check if core data exists
      const entitiesCount = await offlineDB.entities.count();
      const incidentsCount = await (offlineDB as any).incident ? await (offlineDB as any).incident.count() : 0;
      
      return entitiesCount === 0 || incidentsCount === 0;

    } catch (error) {
      console.warn('Error checking bootstrap status:', error);
      return true; // If can't determine, bootstrap anyway
    }
  }

  /**
   * Ensure offline database is ready
   */
  private async ensureOfflineDBReady(): Promise<void> {
    try {
      await offlineDB.open();
      console.log('📦 Offline database ready');
    } catch (error) {
      throw new Error(`Failed to initialize offline database: ${error}`);
    }
  }

  /**
   * Load core entities (communities, facilities, etc.)
   */
  private async loadCoreEntities(): Promise<void> {
    try {
      // Check if online to fetch latest data
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        if (!getAuthToken()) {
          const entitiesCount = await offlineDB.entities.count()
          if (entitiesCount === 0) throw new Error('No entities available offline and not authenticated')
          console.log(`📍 Using ${entitiesCount} cached entities (no auth)`)
          return
        }

        const result = await apiGet('/api/v1/entities?active=true&limit=1000')

        if (!result.success) {
          throw new Error(`Failed to fetch entities: ${result.error}`)
        }

        const entities = extractArray(result.data)

        // Store in offline DB
        await offlineDB.transaction('rw', offlineDB.entities, async () => {
          await offlineDB.entities.clear(); // Clear old data

          for (const entity of entities) {
            await offlineDB.entities.put({
              uuid: entity.id,
              name: entity.name,
              type: entity.type,
              data: JSON.stringify(entity),
              keyVersion: 1,
              lastModified: new Date(),
              syncStatus: 'synced'
            });
          }
        });

        console.log(`📍 Loaded ${entities.length} entities for offline use`);
      } else {
        // Offline - check if we have cached entities
        const entitiesCount = await offlineDB.entities.count();
        if (entitiesCount === 0) {
          throw new Error('No entities available offline and no internet connection');
        }
        console.log(`📍 Using ${entitiesCount} cached entities (offline mode)`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load entities:', error);
      // Continue with what we have - don't fail bootstrap
    }
  }

  /**
   * Load active incidents
   */
  private async loadActiveIncidents(): Promise<void> {
    try {
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        if (!getAuthToken()) {
          const cached = localStorage.getItem('drms_offline_incidents')
          if (!cached) console.warn('⚠️ No incidents available offline and not authenticated')
          else {
            const { data } = JSON.parse(cached)
            console.log(`🚨 Using ${data.length} cached incidents (no auth)`)
          }
          return
        }

        const result = await apiGet('/api/v1/incidents?status=ACTIVE&limit=100')

        if (result.success) {
          const incidents = extractArray(result.data)

          // Store in localStorage for now (until incident offline DB is ready)
          localStorage.setItem('drms_offline_incidents', JSON.stringify({
            data: incidents,
            timestamp: new Date().toISOString()
          }));

          console.log(`🚨 Loaded ${incidents.length} active incidents for offline use`);
        }
      } else {
        // Check cached incidents
        const cached = localStorage.getItem('drms_offline_incidents');
        if (cached) {
          const { data } = JSON.parse(cached);
          console.log(`🚨 Using ${data.length} cached incidents (offline mode)`);
        } else {
          console.warn('⚠️ No incidents available offline');
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load incidents:', error);
    }
  }

  /**
   * Load assessment templates and forms (for Assessors)
   */
  private async loadAssessmentData(): Promise<void> {
    try {
      // Load assessment type configurations
      const assessmentTypes = ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'];
      
      // Store assessment metadata
      localStorage.setItem('drms_offline_assessment_types', JSON.stringify({
        types: assessmentTypes,
        timestamp: new Date().toISOString()
      }));

      console.log('📋 Assessment templates loaded for offline use');
    } catch (error) {
      console.warn('⚠️ Failed to load assessment data:', error);
    }
  }

  /**
   * Load verified assessments (for Responders)
   */
  private async loadVerifiedAssessments(): Promise<void> {
    try {
      const isOnline = navigator.onLine;
      
      if (isOnline) {
        if (!getAuthToken()) {
          const cached = localStorage.getItem('drms_offline_verified_assessments')
          if (!cached) console.warn('⚠️ No verified assessments available offline and not authenticated')
          else {
            const { data } = JSON.parse(cached)
            console.log(`✅ Using ${data.length} cached verified assessments (no auth)`)
          }
          return
        }

        const result = await apiGet('/api/v1/assessments/verified?limit=500')

        if (result.success) {
          const assessments = result.data as any[]

          // Store verified assessments for response planning
          localStorage.setItem('drms_offline_verified_assessments', JSON.stringify({
            data: assessments,
            timestamp: new Date().toISOString()
          }));

          console.log(`✅ Loaded ${assessments.length} verified assessments for response planning`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load verified assessments:', error);
    }
  }

  /**
   * Load system configuration
   */
  private async loadSystemConfig(): Promise<void> {
    try {
      const config = {
        assessmentTypes: ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION'],
        responseTypes: ['HEALTH', 'WASH', 'SHELTER', 'FOOD', 'SECURITY', 'POPULATION', 'LOGISTICS'],
        priorities: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
        verificationStatuses: ['DRAFT', 'SUBMITTED', 'VERIFIED', 'AUTO_VERIFIED', 'REJECTED']
      };

      localStorage.setItem('drms_offline_system_config', JSON.stringify({
        data: config,
        timestamp: new Date().toISOString()
      }));

      console.log('⚙️ System configuration loaded for offline use');
    } catch (error) {
      console.warn('⚠️ Failed to load system configuration:', error);
    }
  }

  /**
   * Update progress callback
   */
  private updateProgress(
    stage: BootstrapProgress['stage'], 
    progress: number, 
    message: string, 
    errors: string[] = []
  ): void {
    if (this.progressCallback) {
      this.progressCallback({ stage, progress, message, errors });
    }
    console.log(`🔄 Bootstrap ${stage}: ${progress}% - ${message}`);
  }

  /**
   * Get bootstrap status
   */
  getBootstrapStatus(): { 
    isBootstrapping: boolean; 
    lastBootstrap?: Date; 
    needsBootstrap: boolean;
  } {
    const lastBootstrapStr = localStorage.getItem('drms_last_bootstrap');
    const lastBootstrap = lastBootstrapStr ? new Date(lastBootstrapStr) : undefined;
    const hoursSinceBootstrap = lastBootstrap ? 
      (Date.now() - lastBootstrap.getTime()) / (1000 * 60 * 60) : Infinity;

    return {
      isBootstrapping: this.isBootstrapping,
      lastBootstrap,
      needsBootstrap: hoursSinceBootstrap > 24
    };
  }

  /**
   * Force refresh of offline data
   */
  async refreshOfflineData(): Promise<boolean> {
    localStorage.removeItem('drms_last_bootstrap');
    const userRole = localStorage.getItem('drms_bootstrap_role') as any || 'ASSESSOR';
    return await this.bootstrap(userRole);
  }
}

// Export singleton instance
export const offlineBootstrap = OfflineBootstrapService.getInstance();