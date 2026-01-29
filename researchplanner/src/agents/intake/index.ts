/**
 * Intake Agent - Main Module
 * Phase 4 - Stage 1: Project Intake and Classification
 *
 * Orchestrates the intake process:
 * 1. Classify project type (QI vs Research vs Hybrid)
 * 2. Determine applicable frameworks and guidelines
 * 3. Generate research brief for downstream agents
 * 4. Create initial project record
 *
 * Entry point for the QI/Research Pipeline Stage 1.
 */

import type { IntakeData, Project, Classification, Frameworks, AuditAction } from '../../types/index.js';
import { classifyProjectType } from './classification.js';
import { determineFrameworks } from './frameworks.js';
import { generateResearchBrief } from './brief.js';
import { generateProjectId } from '../../utils/index.js';

/**
 * Main intake processing function
 *
 * Orchestrates the complete intake workflow:
 * - Validates intake data (assumed to be pre-validated by webhook handler)
 * - Classifies project type using LLM
 * - Determines applicable frameworks
 * - Generates research brief
 * - Creates initial project record
 *
 * @param intakeData - Validated intake form data from webhook
 * @returns Complete Project record with intake, classification, and frameworks
 *
 * @throws Error if classification fails or required data is missing
 *
 * @example
 * ```typescript
 * const intakeData: IntakeData = {
 *   project_title: "Rapid ED Triage for Chest Pain",
 *   project_type: 'QI',
 *   concept_description: "Implement rapid triage protocol...",
 *   clinical_problem: "ED wait times exceed 4 hours...",
 *   target_population: "Adult patients with chest pain",
 *   setting: "Metro North Emergency Department",
 *   principal_investigator: { name: "Dr Smith", ... },
 *   co_investigators: [],
 *   intended_outcomes: "Reduce door-to-ECG time to <10 minutes",
 *   grant_target: 'INTERNAL'
 * };
 *
 * const project = await processIntake(intakeData);
 * console.log(project.classification.project_type); // 'QI'
 * console.log(project.frameworks.reporting_guideline); // 'SQUIRE'
 * ```
 */
export async function processIntake(intakeData: IntakeData): Promise<Project> {
  // Step 1: Generate unique project ID
  const projectId = generateProjectId();
  const timestamp = new Date().toISOString();

  try {
    // Step 2: Classify project type using LLM
    console.log(`[Intake] Classifying project: ${intakeData.project_title}`);
    const classification: Classification = await classifyProjectType(
      intakeData.concept_description,
      intakeData.clinical_problem,
      intakeData.intended_outcomes
    );
    console.log(`[Intake] Classification result: ${classification.project_type} (confidence: ${classification.confidence.toFixed(2)})`);

    // Step 3: Determine applicable frameworks
    console.log(`[Intake] Determining frameworks for ${classification.project_type} project`);
    const frameworks: Frameworks = determineFrameworks(
      classification.project_type,
      intakeData.setting,
      intakeData.target_population,
      intakeData.grant_target
    );
    console.log(`[Intake] Reporting guideline: ${frameworks.reporting_guideline}`);
    console.log(`[Intake] Governance requirements: ${frameworks.governance_requirements.length} items`);

    // Step 4: Create initial project record
    const project: Project = {
      id: projectId,
      status: 'INTAKE_COMPLETE',
      created_at: timestamp,
      updated_at: timestamp,

      // Stage 1 outputs
      intake: intakeData,
      classification,
      frameworks,

      // Stages 2-5 (to be populated later)
      research: undefined,
      methodology: undefined,
      ethics: undefined,
      documents: undefined,

      // Audit log
      audit_log: [
        {
          id: generateProjectId(), // Unique audit entry ID
          project_id: projectId,
          timestamp,
          action: 'PROJECT_CREATED' as AuditAction,
          actor: 'INTAKE_AGENT',
          details: {
            project_title: intakeData.project_title,
            classification: classification.project_type,
            confidence: classification.confidence,
          },
          previous_state: undefined,
          new_state: {
            status: 'INTAKE_COMPLETE',
            classification: classification.project_type,
          },
        },
      ],

      // Checkpoints (all false initially)
      checkpoints: {
        intake_approved: false,
        research_approved: false,
        methodology_approved: false,
        ethics_approved: false,
        documents_approved: false,
      },

      // Owner (to be set by webhook handler if available)
      owner_id: undefined,

      // Soft delete
      deleted_at: undefined,
    };

    // Step 5: Generate research brief (stored in audit log for now)
    console.log(`[Intake] Generating research brief`);
    const researchBrief = generateResearchBrief(project);

    // Add research brief to audit log as metadata
    project.audit_log.push({
      id: generateProjectId(),
      project_id: projectId,
      timestamp,
      action: 'DOCUMENT_GENERATED' as AuditAction,
      actor: 'INTAKE_AGENT',
      details: {
        document_type: 'RESEARCH_BRIEF',
        brief_length: researchBrief.length,
        brief_preview: researchBrief.slice(0, 200) + '...',
      },
      previous_state: undefined,
      new_state: {
        research_brief_available: true,
      },
    });

    console.log(`[Intake] Project ${projectId} intake complete`);
    console.log(`[Intake] Status: ${project.status}`);
    console.log(`[Intake] Next: Research Agent (Stage 2)`);

    return project;

  } catch (error) {
    // If any step fails, throw with context
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Intake] Failed to process intake for project ${projectId}: ${errorMessage}`);
    throw new Error(`Intake processing failed: ${errorMessage}`);
  }
}

/**
 * Re-export sub-modules for external use
 */
export { classifyProjectType } from './classification.js';
export { determineFrameworks, QI_FRAMEWORKS, RESEARCH_FRAMEWORKS } from './frameworks.js';
export { generateResearchBrief } from './brief.js';
