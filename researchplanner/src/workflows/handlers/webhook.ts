/**
 * Webhook handler implementation for n8n workflow integration
 * Phase 3.10 - Webhook Handler
 */

import { Request, Response } from 'express';
import { createProject, updateProject, getProjectById } from '../../db/queries/projects.js';
import { createAuditEntry } from '../../db/queries/audit.js';
import { validateIntakeData } from '../../utils/validation.js';
import { AuditAction } from '../../types/audit.js';

/**
 * Handle intake webhook POST request
 * Validates intake data and creates initial project record
 *
 * @param req - Express request object with intake data in body
 * @returns Response with project_id and status
 */
export async function handleIntakeWebhook(req: Request): Promise<Response> {
  try {
    // Validate request body
    if (!validateRequest(req)) {
      return createWebhookResponse(400, {
        error: 'Invalid request',
        message: 'Request body validation failed'
      });
    }

    // Validate intake data structure (throws on error)
    const validatedIntake = validateIntakeData(req.body);

    // Create project record in database
    const project = await createProject(validatedIntake);

    // Log intake creation
    await createAuditEntry({
      project_id: project.id,
      action: AuditAction.PROJECT_CREATED,
      actor: req.body.principal_investigator.email,
      details: {
        source: 'intake_webhook',
        project_type: req.body.project_type
      }
    });

    return createWebhookResponse(200, {
      success: true,
      project_id: project.id,
      status: project.status,
      message: 'Project intake received successfully'
    });

  } catch (error) {
    console.error('Error handling intake webhook:', error);

    // Handle Zod validation errors specifically
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return createWebhookResponse(400, {
        error: 'Validation failed',
        errors: (error as any).errors
      });
    }

    return createWebhookResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle checkpoint approval webhook
 * Updates project status and checkpoints based on stage approval
 *
 * @param req - Express request with project_id and approval status
 * @param stage - Pipeline stage (intake, research, methods, ethics)
 * @returns Response with updated project status
 */
export async function handleCheckpointApproval(
  req: Request,
  stage: string
): Promise<Response> {
  try {
    const { project_id, approved, feedback } = req.body;

    if (!project_id) {
      return createWebhookResponse(400, {
        error: 'Missing project_id'
      });
    }

    // Fetch current project state
    const project = await getProjectById(project_id);
    if (!project) {
      return createWebhookResponse(404, {
        error: 'Project not found'
      });
    }

    // Update checkpoint status
    const checkpoints = { ...project.checkpoints };
    const statusKey = `${stage}_approved` as keyof typeof checkpoints;
    checkpoints[statusKey] = approved;

    // Determine new project status
    let newStatus = project.status;
    if (approved) {
      // Map stage to approved status
      const statusMap: Record<string, string> = {
        intake: 'INTAKE_APPROVED',
        research: 'RESEARCH_APPROVED',
        methods: 'METHODOLOGY_APPROVED',
        ethics: 'ETHICS_APPROVED',
        documents: 'DOCUMENTS_APPROVED'
      };
      newStatus = statusMap[stage] || project.status;
    } else {
      // Rejection - require revision
      newStatus = 'REVISION_REQUIRED';
    }

    // Update project in database
    await updateProject(project_id, {
      status: newStatus,
      checkpoints
    });

    // Log checkpoint action
    await createAuditEntry({
      project_id,
      action: approved ? AuditAction.CHECKPOINT_APPROVED : AuditAction.CHECKPOINT_REJECTED,
      actor: req.body.approver_email || 'unknown',
      details: {
        stage,
        feedback: feedback || null
      }
    });

    return createWebhookResponse(200, {
      success: true,
      project_id,
      status: newStatus,
      checkpoint: statusKey,
      approved
    });

  } catch (error) {
    console.error(`Error handling ${stage} checkpoint:`, error);
    return createWebhookResponse(500, {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Validate incoming webhook request
 * Checks for required headers and body structure
 *
 * @param req - Express request object
 * @returns True if valid, false otherwise
 */
export function validateRequest(req: Request): boolean {
  // Check content-type header
  const contentType = req.headers['content-type'];
  if (!contentType || !contentType.includes('application/json')) {
    return false;
  }

  // Check body exists
  if (!req.body || typeof req.body !== 'object') {
    return false;
  }

  return true;
}

/**
 * Create standardized webhook response
 *
 * @param status - HTTP status code
 * @param data - Response data object
 * @returns Express Response object
 */
export function createWebhookResponse(status: number, data: any): Response {
  // This is a mock implementation - in actual n8n context,
  // responses are handled differently
  return {
    status: () => ({
      json: (body: any) => body
    })
  } as any as Response;
}
