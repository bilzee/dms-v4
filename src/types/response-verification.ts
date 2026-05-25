// Response Verification Types

export interface ResponseVerificationQueueItem {
  id: string;
  type: string; // ResponseType
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deliveryStatus: string;
  verificationStatus: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'AUTO_VERIFIED' | 'REJECTED';
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  rejectionFeedback?: string;
  description?: string;
  resources?: any; // JSON
  timeline?: any; // JSON
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  entity: {
    id: string;
    name: string;
    type: string;
    location: string;
    autoApproveEnabled: boolean;
  };
  responder: {
    id: string;
    name: string;
    email: string;
  };
  donor?: {
    id: string;
    name: string;
    email: string;
  };
  commitment?: {
    id: string;
    amount?: number;
    type?: string;
    description?: string;
  };
  assessment?: {
    id: string;
    rapidAssessmentType: string;
    rapidAssessmentDate: Date;
  };
}

export interface ResponseVerificationFilters {
  deliveryStatus?: string;
  verificationStatus?: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'AUTO_VERIFIED' | 'REJECTED';
  entityId?: string;
  responseType?: string;
  donorId?: string;
  priority?: string;
  responderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ResponseVerificationQueueResponse {
  success?: true;
  data: ResponseVerificationQueueItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statistics: {
    submitted: number;
    verified: number;
    rejected: number;
    total: number;
  };
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

// Form interfaces for response verification actions
export interface VerifyResponseRequest {
  notes?: string;
  metadata?: Record<string, any>;
}

export interface RejectResponseRequest {
  rejectionReason: string;
  notes?: string;
  metadata?: Record<string, any>;
}