/**
 * Workflows module - n8n workflow configuration and management
 * Phase 3.14 - Workflows Index
 */

import * as fs from 'fs';
import * as path from 'path';
import { WORKFLOW_IDS, CHECKPOINT_SUFFIXES, TIMEOUT_CONFIG } from './config.js';
import { createCheckpoint, approveCheckpoint, rejectCheckpoint, getCheckpointStatus } from './checkpoints.js';
import { handleIntakeWebhook, handleCheckpointApproval } from './handlers/webhook.js';

/**
 * n8n workflow JSON structure
 */
export interface WorkflowJson {
  name: string;
  id: string;
  tags: string[];
  active: boolean;
  nodes: any[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  staticData?: any;
}

/**
 * Load a workflow JSON file by name
 * Reads workflow definition from the workflows directory
 *
 * @param name - Workflow name (without .json extension)
 * @returns Parsed workflow JSON
 * @throws Error if workflow file not found or invalid JSON
 */
export function loadWorkflow(name: string): WorkflowJson {
  const workflowPath = path.join(__dirname, `${name}.json`);

  if (!fs.existsSync(workflowPath)) {
    throw new Error(`Workflow file not found: ${name}.json`);
  }

  try {
    const fileContent = fs.readFileSync(workflowPath, 'utf-8');
    const workflow = JSON.parse(fileContent) as WorkflowJson;
    return workflow;
  } catch (error) {
    throw new Error(`Failed to load workflow ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load all workflow definitions
 * Returns map of workflow name to JSON definition
 *
 * @returns Map of workflow name to WorkflowJson
 */
export function loadAllWorkflows(): Record<string, WorkflowJson> {
  const workflows: Record<string, WorkflowJson> = {};

  const workflowFiles = [
    'master-workflow',
    'intake-workflow',
    'research-workflow',
    'methods-workflow',
    'ethics-workflow',
    'documents-workflow'
  ];

  for (const name of workflowFiles) {
    try {
      workflows[name] = loadWorkflow(name);
    } catch (error) {
      console.error(`Failed to load workflow ${name}:`, error);
    }
  }

  return workflows;
}

/**
 * Validate workflow JSON structure
 * Checks for required fields and valid node connections
 *
 * @param workflow - Workflow JSON to validate
 * @returns True if valid, throws error otherwise
 */
export function validateWorkflow(workflow: WorkflowJson): boolean {
  // Check required top-level fields
  if (!workflow.name || typeof workflow.name !== 'string') {
    throw new Error('Workflow missing required field: name');
  }

  if (!workflow.id || typeof workflow.id !== 'string') {
    throw new Error('Workflow missing required field: id');
  }

  if (!Array.isArray(workflow.nodes)) {
    throw new Error('Workflow missing required field: nodes (array)');
  }

  if (!workflow.connections || typeof workflow.connections !== 'object') {
    throw new Error('Workflow missing required field: connections (object)');
  }

  // Check nodes structure
  for (const node of workflow.nodes) {
    if (!node.name || !node.type || !node.parameters) {
      throw new Error(`Invalid node structure in workflow ${workflow.name}`);
    }
  }

  return true;
}

// Re-export configuration
export {
  WORKFLOW_IDS,
  CHECKPOINT_SUFFIXES,
  TIMEOUT_CONFIG,
  getWorkflowId,
  getCheckpointSuffix,
  getTimeoutConfig,
  getNextStage,
  getPreviousStage,
  isValidStage
} from './config.js';

// Re-export checkpoint functions
export {
  createCheckpoint,
  approveCheckpoint,
  rejectCheckpoint,
  getCheckpointStatus,
  CHECKPOINT_WEBHOOKS
} from './checkpoints.js';

// Re-export webhook handlers
export {
  handleIntakeWebhook,
  handleCheckpointApproval,
  validateRequest,
  createWebhookResponse
} from './handlers/webhook.js';

// Export types
export type { CheckpointStage, CheckpointStatus, Checkpoint } from './checkpoints.js';
export type { WorkflowStage } from './config.js';
