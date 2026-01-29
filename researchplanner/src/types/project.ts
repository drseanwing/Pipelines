/**
 * Core project types and enums
 * Phase 2.6 - Project Type Definitions
 */

import type { ResearchResults } from './research.js';
import type { Methodology } from './methodology.js';
import type { EthicsEvaluation } from './ethics.js';
import type { DocumentsOutput } from './documents.js';
import type { AuditEntry } from './audit.js';

/**
 * Project status enum representing all possible states in the pipeline
 * Spec reference: Section 4.1.1
 */
export type ProjectStatus =
  | 'DRAFT'
  | 'INTAKE_COMPLETE'
  | 'INTAKE_APPROVED'
  | 'RESEARCH_COMPLETE'
  | 'RESEARCH_APPROVED'
  | 'METHODOLOGY_COMPLETE'
  | 'METHODOLOGY_APPROVED'
  | 'ETHICS_COMPLETE'
  | 'ETHICS_APPROVED'
  | 'DOCUMENTS_COMPLETE'
  | 'DOCUMENTS_APPROVED'
  | 'SUBMITTED'
  | 'REVISION_REQUIRED'
  | 'COMPLETED'
  | 'ARCHIVED';

/**
 * Project type classification
 */
export enum ProjectType {
  QI = 'QI',
  RESEARCH = 'RESEARCH',
  HYBRID = 'HYBRID',
}

/**
 * Grant funding targets
 */
export enum GrantType {
  EMF_JUMPSTART = 'EMF_JUMPSTART',
  EMF_LEADING_EDGE = 'EMF_LEADING_EDGE',
  EMF_TRANSLATED = 'EMF_TRANSLATED',
  INTERNAL = 'INTERNAL',
  OTHER = 'OTHER',
}

/**
 * Investigator details
 */
export interface Investigator {
  name: string;
  role: 'PI' | 'CO_I' | 'ASSOCIATE';
  title: string;
  institution: string;
  department: string;
  email: string;
  phone?: string;
  orcid?: string;
  expertise: string[];
}

/**
 * Timeline constraint specification
 */
export interface TimelineConstraint {
  submission_deadline?: string; // ISO date string
  completion_deadline?: string; // ISO date string
  grant_deadline?: string; // ISO date string
  notes?: string;
}

/**
 * Project intake data (Stage 1 input)
 * Spec reference: Section 3.2.1
 */
export interface IntakeData {
  project_title: string;
  project_type: ProjectType;
  concept_description: string; // 500-2000 chars
  clinical_problem: string;
  target_population: string;
  setting: string;
  principal_investigator: Investigator;
  co_investigators: Investigator[];
  intended_outcomes: string;
  grant_target?: GrantType;
  timeline_constraint?: TimelineConstraint;
}

/**
 * Project classification output
 * Spec reference: Section 3.2.3
 */
export interface Classification {
  project_type: ProjectType;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  suggested_designs: string[];
}

/**
 * Applicable frameworks for project
 */
export interface Frameworks {
  reporting_guideline: string; // e.g., 'SQUIRE', 'CONSORT', 'STROBE'
  ethics_framework: string;
  governance_requirements: string[];
}

/**
 * Checkpoint approval tracking
 */
export interface Checkpoints {
  intake_approved: boolean;
  research_approved: boolean;
  methodology_approved: boolean;
  ethics_approved: boolean;
  documents_approved: boolean;
}

/**
 * Complete project record
 * Spec reference: Section 4.1.1
 *
 * Note: Stage-specific types are imported from their respective modules:
 * - research: ResearchResults from './research'
 * - methodology: Methodology from './methodology'
 * - ethics: EthicsEvaluation from './ethics'
 * - documents: DocumentsOutput from './documents'
 * - audit_log: AuditEntry[] from './audit'
 */
export interface Project {
  id: string; // UUID
  status: ProjectStatus;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp

  // Stage 1: Intake
  intake: IntakeData;
  classification: Classification;
  frameworks: Frameworks;

  // Stage 2: Research (optional until completed)
  // Type: ResearchResults from './research.js'
  research?: ResearchResults;

  // Stage 3: Methodology (optional until completed)
  // Type: Methodology from './methodology.js'
  methodology?: Methodology;

  // Stage 4: Ethics (optional until completed)
  // Type: EthicsEvaluation from './ethics.js'
  ethics?: EthicsEvaluation;

  // Stage 5: Documents (optional until completed)
  // Type: DocumentsOutput from './documents.js'
  documents?: DocumentsOutput;

  // Audit trail
  // Type: AuditEntry[] from './audit.js'
  audit_log: AuditEntry[];

  // Checkpoints
  checkpoints: Checkpoints;

  // Owner
  owner_id?: string; // UUID

  // Soft delete
  deleted_at?: string; // ISO timestamp
}
