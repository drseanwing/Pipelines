// Audit logging type definitions

export enum AuditAction {
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  CHECKPOINT_APPROVED = 'CHECKPOINT_APPROVED',
  CHECKPOINT_REJECTED = 'CHECKPOINT_REJECTED',
  STAGE_STARTED = 'STAGE_STARTED',
  STAGE_COMPLETED = 'STAGE_COMPLETED',
  DOCUMENT_GENERATED = 'DOCUMENT_GENERATED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  USER_ACTION = 'USER_ACTION',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  WORKFLOW_TRIGGERED = 'WORKFLOW_TRIGGERED'
}

export interface AuditEntry {
  id: string;
  project_id: string;
  timestamp: string;
  action: AuditAction;
  actor?: string;
  details?: Record<string, any>;
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  ip_address?: string;
  session_id?: string;
}
