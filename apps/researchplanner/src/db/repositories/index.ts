/**
 * QI Research Pipeline - Repository Exports
 *
 * Barrel file exporting all repository classes and related types
 * for database operations in the QI/Research Project Development Pipeline.
 *
 * @module db/repositories
 *
 * @example
 * ```typescript
 * import {
 *   ProjectRepository,
 *   DocumentRepository,
 *   AuditRepository,
 *   NotFoundError,
 *   RepositoryError,
 * } from '@/db/repositories';
 *
 * const projectRepo = new ProjectRepository();
 * const documentRepo = new DocumentRepository();
 * const auditRepo = new AuditRepository();
 * ```
 */

// Import classes for local use
import { ProjectRepository } from './ProjectRepository';
import { DocumentRepository } from './DocumentRepository';
import { AuditRepository } from './AuditRepository';

// ============================================================================
// Base Repository
// ============================================================================

export {
  // Class
  BaseRepository,
  // Errors
  RepositoryError,
  NotFoundError,
  ConstraintError,
  // Types
  type PaginationOptions,
  type PaginatedResult,
  type FilterOptions,
  type QueryOptions,
  type BaseEntity,
} from './BaseRepository';

// ============================================================================
// Project Repository
// ============================================================================

export {
  // Class
  ProjectRepository,
  // Types
  type ListOptions,
  type ListResult,
  type CheckpointName,
  type StageName,
  type StageDataType,
} from './ProjectRepository';

// ============================================================================
// Document Repository
// ============================================================================

export {
  // Class
  DocumentRepository,
  // Types
  type CreateDocumentDTO,
  type DocumentFilterOptions,
} from './DocumentRepository';

// ============================================================================
// Audit Repository
// ============================================================================

export {
  // Class
  AuditRepository,
  // Types
  type AuditRecord,
  type LogActionInput,
  type AuditFilterOptions,
  type AuditStatistics,
} from './AuditRepository';

// ============================================================================
// Convenience Factory Functions
// ============================================================================

/**
 * Create a new ProjectRepository instance
 *
 * @returns ProjectRepository instance
 */
export function createProjectRepository(): ProjectRepository {
  return new ProjectRepository();
}

/**
 * Create a new DocumentRepository instance
 *
 * @returns DocumentRepository instance
 */
export function createDocumentRepository(): DocumentRepository {
  return new DocumentRepository();
}

/**
 * Create a new AuditRepository instance
 *
 * @returns AuditRepository instance
 */
export function createAuditRepository(): AuditRepository {
  return new AuditRepository();
}

/**
 * Repository container with all repository instances
 */
export interface Repositories {
  projects: ProjectRepository;
  documents: DocumentRepository;
  audit: AuditRepository;
}

/**
 * Create all repository instances
 *
 * @returns Object containing all repository instances
 *
 * @example
 * ```typescript
 * const repos = createRepositories();
 *
 * const project = await repos.projects.create(intakeData, userId);
 * const docs = await repos.documents.findByProject(project.id);
 * await repos.audit.logAction({
 *   projectId: project.id,
 *   action: 'PROJECT_VIEWED',
 *   actor: userId,
 * });
 * ```
 */
export function createRepositories(): Repositories {
  return {
    projects: new ProjectRepository(),
    documents: new DocumentRepository(),
    audit: new AuditRepository(),
  };
}
