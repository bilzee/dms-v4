'use client';

import { useState } from 'react';
import { useVerificationActions } from '@/hooks/useVerification';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  MessageSquare,
  Clock,
  Shield
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { 
  VerificationQueueItem, 
  RejectionReason,
  VerifyAssessmentRequest,
  RejectAssessmentRequest 
} from '@/types/verification';

interface VerificationActionsProps {
  assessment: VerificationQueueItem;
  className?: string;
  inline?: boolean;
  onActionComplete?: () => void;
}

export function VerificationActions({ 
  assessment, 
  className, 
  inline = true,
  onActionComplete 
}: VerificationActionsProps) {
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>('INCOMPLETE_DATA');
  const [rejectionFeedback, setRejectionFeedback] = useState('');

  const { verifyAssessment, rejectAssessment, isVerifying, isRejecting, isLoading } = useVerificationActions();

  // Check if assessment can be verified/rejected
  const canVerify = assessment.verificationStatus === 'SUBMITTED';
  const isAutoApproveEnabled = assessment.entity.autoApproveEnabled;

  const handleVerify = () => {
    if (!canVerify) return;
    
    const data: VerifyAssessmentRequest = {
      notes: verifyNotes || undefined,
      metadata: {
        entityName: assessment.entity.name,
        assessmentType: assessment.rapidAssessmentType
      }
    };

    verifyAssessment(
      { assessmentId: assessment.id, data },
      {
        onSuccess: () => {
          setShowVerifyDialog(false);
          setVerifyNotes('');
          onActionComplete?.();
        }
      }
    );
  };

  const handleReject = () => {
    if (!canVerify || !rejectionFeedback.trim()) return;
    
    const data: RejectAssessmentRequest = {
      reason: rejectionReason,
      feedback: rejectionFeedback.trim(),
      metadata: {
        entityName: assessment.entity.name,
        assessmentType: assessment.rapidAssessmentType
      }
    };

    rejectAssessment(
      { assessmentId: assessment.id, data },
      {
        onSuccess: () => {
          setShowRejectDialog(false);
          setRejectionReason('INCOMPLETE_DATA');
          setRejectionFeedback('');
          onActionComplete?.();
        }
      }
    );
  };

  const rejectionReasonLabels: Record<RejectionReason, string> = {
    INCOMPLETE_DATA: 'Incomplete Data',
    INACCURATE_INFORMATION: 'Inaccurate Information',
    MISSING_DOCUMENTATION: 'Missing Documentation',
    LOCATION_MISMATCH: 'Location Mismatch',
    DUPLICATE_ASSESSMENT: 'Duplicate Assessment',
    QUALITY_ISSUES: 'Quality Issues',
    OTHER: 'Other'
  };

  if (!canVerify) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Badge variant="outline" className="text-muted-foreground">
          {assessment.verificationStatus === 'VERIFIED' && 'Already Verified'}
          {assessment.verificationStatus === 'AUTO_VERIFIED' && 'Auto-Verified'}
          {assessment.verificationStatus === 'REJECTED' && 'Rejected'}
          {assessment.verificationStatus === 'DRAFT' && 'Draft Status'}
        </Badge>
      </div>
    );
  }

  if (inline) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Quick approve button */}
        <Button
          size="sm"
          onClick={() => setShowVerifyDialog(true)}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          {isVerifying ? 'Verifying...' : 'Approve'}
        </Button>

        {/* Quick reject button */}
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isLoading}
        >
          <XCircle className="h-4 w-4 mr-1" />
          {isRejecting ? 'Rejecting...' : 'Reject'}
        </Button>

        {/* Auto-approve indicator */}
        {isAutoApproveEnabled && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <Shield className="h-3 w-3 mr-1" />
            Auto-Approve
          </Badge>
        )}

        {/* Verification Dialogs */}
        <VerifyDialog
          isOpen={showVerifyDialog}
          onClose={() => setShowVerifyDialog(false)}
          onConfirm={handleVerify}
          assessment={assessment}
          notes={verifyNotes}
          onNotesChange={setVerifyNotes}
          isLoading={isVerifying}
        />

        <RejectDialog
          isOpen={showRejectDialog}
          onClose={() => setShowRejectDialog(false)}
          onConfirm={handleReject}
          assessment={assessment}
          reason={rejectionReason}
          onReasonChange={setRejectionReason}
          feedback={rejectionFeedback}
          onFeedbackChange={setRejectionFeedback}
          isLoading={isRejecting}
          reasonLabels={rejectionReasonLabels}
        />
      </div>
    );
  }

  // Non-inline mode (expanded card view)
  return (
    <div className={cn('space-y-4 p-4 border rounded-lg bg-muted', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Verification Actions</h3>
        {isAutoApproveEnabled && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <Shield className="h-3 w-3 mr-1" />
            Auto-Approve Enabled
          </Badge>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => setShowVerifyDialog(true)}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {isVerifying ? 'Verifying...' : 'Approve Assessment'}
        </Button>

        <Button
          variant="destructive"
          onClick={() => setShowRejectDialog(true)}
          disabled={isLoading}
          className="flex-1"
        >
          <XCircle className="h-4 w-4 mr-2" />
          {isRejecting ? 'Rejecting...' : 'Reject Assessment'}
        </Button>
      </div>

      {/* Status information */}
      <div className="text-sm text-muted-foreground">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-3 w-3" />
          <span>Submitted: {new Date(assessment.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3 w-3" />
          <span>Priority: {assessment.priority}</span>
        </div>
      </div>

      {/* Dialogs */}
      <VerifyDialog
        isOpen={showVerifyDialog}
        onClose={() => setShowVerifyDialog(false)}
        onConfirm={handleVerify}
        assessment={assessment}
        notes={verifyNotes}
        onNotesChange={setVerifyNotes}
        isLoading={isVerifying}
      />

      <RejectDialog
        isOpen={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        onConfirm={handleReject}
        assessment={assessment}
        reason={rejectionReason}
        onReasonChange={setRejectionReason}
        feedback={rejectionFeedback}
        onFeedbackChange={setRejectionFeedback}
        isLoading={isRejecting}
        reasonLabels={rejectionReasonLabels}
      />
    </div>
  );
}

// Verify Dialog Component
interface VerifyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assessment: VerificationQueueItem;
  notes: string;
  onNotesChange: (notes: string) => void;
  isLoading: boolean;
}

function VerifyDialog({
  isOpen,
  onClose,
  onConfirm,
  assessment,
  notes,
  onNotesChange,
  isLoading
}: VerifyDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Approve Assessment
          </DialogTitle>
          <DialogDescription>
            You are about to approve the {assessment.rapidAssessmentType} assessment for{' '}
            <span className="font-semibold">{assessment.entity.name}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="verify-notes">Verification Notes (Optional)</Label>
            <Textarea
              id="verify-notes"
              placeholder="Add any notes about this verification..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-900">This will:</p>
                <ul className="mt-1 text-green-700 list-disc list-inside">
                  <li>Mark the assessment as verified</li>
                  <li>Notify the assessor of approval</li>
                  <li>Make the assessment data available for response planning</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Approving...' : 'Approve Assessment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Reject Dialog Component
interface RejectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assessment: VerificationQueueItem;
  reason: RejectionReason;
  onReasonChange: (reason: RejectionReason) => void;
  feedback: string;
  onFeedbackChange: (feedback: string) => void;
  isLoading: boolean;
  reasonLabels: Record<RejectionReason, string>;
}

function RejectDialog({
  isOpen,
  onClose,
  onConfirm,
  assessment,
  reason,
  onReasonChange,
  feedback,
  onFeedbackChange,
  isLoading,
  reasonLabels
}: RejectDialogProps) {
  const canSubmit = feedback.trim().length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Reject Assessment
          </DialogTitle>
          <DialogDescription>
            You are about to reject the {assessment.rapidAssessmentType} assessment for{' '}
            <span className="font-semibold">{assessment.entity.name}</span>.
            Please provide a reason and feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Select value={reason} onValueChange={(value) => onReasonChange(value as RejectionReason)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reasonLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rejection-feedback">
              Feedback <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="rejection-feedback"
              placeholder="Explain why this assessment is being rejected and what needs to be corrected..."
              value={feedback}
              onChange={(e) => onFeedbackChange(e.target.value)}
              className="mt-1"
              rows={4}
              required
            />
            {feedback.trim().length === 0 && (
              <p className="text-sm text-red-600 mt-1">
                Feedback is required when rejecting an assessment
              </p>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-900">This will:</p>
                <ul className="mt-1 text-red-700 list-disc list-inside">
                  <li>Mark the assessment as rejected</li>
                  <li>Notify the assessor with your feedback</li>
                  <li>Request revision of the assessment</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm} 
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? 'Rejecting...' : 'Reject Assessment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}