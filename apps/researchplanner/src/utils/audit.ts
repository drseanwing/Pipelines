/**
 * Audit Logging Utilities
 * Phase 3.3 - Audit trail and action logging
 */

import { v4 as uuidv4 } from 'uuid';
import type { AuditEntry, AuditAction } from '../types/index.js';
import { createAuditEntry } from '../db/queries/audit.js';

/**
 * Log a general action to the audit trail
 * @param projectId - The project UUID
 * @param action - The audit action type
 * @param actor - The actor performing the action (user ID or 'SYSTEM')
 * @param details - Optional additional details
 * @returns The created audit entry
 */
export async function logAction(
  projectId: string,
  action: AuditAction,
  actor: string,
  details?: Record<string, any>
): Promise<AuditEntry> {
  const entry = formatAuditEntry({
    project_id: projectId,
    action,
    actor,
    details,
  });

  return createAuditEntry(entry);
}

/**
 * Log a state change with before/after snapshots
 * @param projectId - The project UUID
 * @param action - The audit action type
 * @param actor - The actor performing the action
 * @param previousState - The state before the change
 * @param newState - The state after the change
 * @returns The created audit entry
 */
export async function logStateChange(
  projectId: string,
  action: AuditAction,
  actor: string,
  previousState: Record<string, any>,
  newState: Record<string, any>
): Promise<AuditEntry> {
  const entry = formatAuditEntry({
    project_id: projectId,
    action,
    actor,
    previous_state: previousState,
    new_state: newState,
  });

  return createAuditEntry(entry);
}

/**
 * Log an error to the audit trail
 * @param projectId - The project UUID
 * @param error - The error that occurred
 * @param actor - Optional actor context
 * @returns The created audit entry
 */
export async function logError(
  projectId: string,
  error: Error,
  actor: string = 'SYSTEM'
): Promise<AuditEntry> {
  const entry = formatAuditEntry({
    project_id: projectId,
    action: 'SYSTEM_ERROR' as AuditAction,
    actor,
    details: {
      error_message: error.message,
      error_name: error.name,
      error_stack: error.stack,
    },
  });

  return createAuditEntry(entry);
}

/**
 * Format an audit entry with required fields
 * @param entry - Partial audit entry data
 * @returns Complete formatted audit entry
 */
export function formatAuditEntry(
  entry: Partial<AuditEntry>
): AuditEntry {
  return {
    id: entry.id || uuidv4(),
    project_id: entry.project_id!,
    timestamp: entry.timestamp || new Date().toISOString(),
    action: entry.action!,
    actor: entry.actor,
    details: entry.details,
    previous_state: entry.previous_state,
    new_state: entry.new_state,
    ip_address: entry.ip_address,
    session_id: entry.session_id,
  };
}
