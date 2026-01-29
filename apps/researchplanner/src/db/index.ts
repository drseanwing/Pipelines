/**
 * Database module index
 * Phase 2.18 - Database Index
 *
 * Central export point for all database functionality
 */

// Re-export client functions
export { createPool, getClient, closePool, getPool } from './client.js';

// Re-export project queries
export {
  createProject,
  getProjectById,
  updateProject,
  updateProjectStatus,
  updateProjectStage,
  getProjectsByOwner,
  getProjectsByStatus,
  softDeleteProject,
} from './queries/projects.js';

// Re-export audit queries
export {
  createAuditEntry,
  getAuditLogByProject,
  getAuditLogByAction,
  getAuditLogByDateRange,
  getRecentAuditEntries,
} from './queries/audit.js';

// Re-export document queries
export {
  createDocumentRecord,
  getDocumentsByProject,
  updateDocumentStatus,
  getDocumentById,
  updateDocumentMetadata,
  deleteDocument,
  getDocumentsByType,
} from './queries/documents.js';

// Re-export reference queries
export {
  createReference,
  bulkInsertReferences,
  getReferencesByProject,
  updateReferenceRelevance,
  getReferencesByRelevance,
  deleteReference,
  findReferenceByDOI,
} from './queries/references.js';
