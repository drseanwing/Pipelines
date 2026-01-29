/**
 * @pipelines/checkpoint - Quality gate and checkpoint state machine
 *
 * Manages pipeline stage transitions with approve/reject flows,
 * progress tracking, and validation gates.
 */

export type CheckpointStatus = 'pending' | 'in_progress' | 'awaiting_review' | 'approved' | 'rejected' | 'skipped';

export interface Checkpoint {
  id: string;
  name: string;
  stage: string;
  status: CheckpointStatus;
  data?: Record<string, unknown>;
  reviewer?: string;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckpointTransition {
  from: CheckpointStatus;
  to: CheckpointStatus;
  timestamp: Date;
  actor?: string;
  reason?: string;
}

const VALID_TRANSITIONS: Record<CheckpointStatus, CheckpointStatus[]> = {
  pending: ['in_progress', 'skipped'],
  in_progress: ['awaiting_review', 'rejected', 'skipped'],
  awaiting_review: ['approved', 'rejected'],
  approved: [],
  rejected: ['in_progress', 'pending'],
  skipped: [],
};

/**
 * Checkpoint state machine for managing pipeline quality gates
 */
export class CheckpointManager {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private history: Map<string, CheckpointTransition[]> = new Map();

  /**
   * Create a new checkpoint
   */
  create(params: { id: string; name: string; stage: string; data?: Record<string, unknown> }): Checkpoint {
    const checkpoint: Checkpoint = {
      id: params.id,
      name: params.name,
      stage: params.stage,
      status: 'pending',
      data: params.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.checkpoints.set(params.id, checkpoint);
    this.history.set(params.id, []);
    return checkpoint;
  }

  /**
   * Get a checkpoint by ID
   */
  get(id: string): Checkpoint | undefined {
    return this.checkpoints.get(id);
  }

  /**
   * Transition a checkpoint to a new status
   */
  transition(
    id: string,
    to: CheckpointStatus,
    options?: { actor?: string; reason?: string; feedback?: string }
  ): Checkpoint {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${id}`);
    }

    const validTargets = VALID_TRANSITIONS[checkpoint.status];
    if (!validTargets.includes(to)) {
      throw new Error(
        `Invalid transition: ${checkpoint.status} -> ${to}. Valid: ${validTargets.join(', ')}`
      );
    }

    const transition: CheckpointTransition = {
      from: checkpoint.status,
      to,
      timestamp: new Date(),
      actor: options?.actor,
      reason: options?.reason,
    };

    checkpoint.status = to;
    checkpoint.updatedAt = new Date();
    if (options?.feedback) checkpoint.feedback = options.feedback;
    if (options?.actor) checkpoint.reviewer = options.actor;

    const historyList = this.history.get(id);
    if (historyList) {
      historyList.push(transition);
    }
    return checkpoint;
  }

  /**
   * Start a checkpoint (pending -> in_progress)
   */
  start(id: string): Checkpoint {
    return this.transition(id, 'in_progress');
  }

  /**
   * Submit for review (in_progress -> awaiting_review)
   */
  submitForReview(id: string): Checkpoint {
    return this.transition(id, 'awaiting_review');
  }

  /**
   * Approve a checkpoint
   */
  approve(id: string, reviewer: string, feedback?: string): Checkpoint {
    return this.transition(id, 'approved', { actor: reviewer, feedback });
  }

  /**
   * Reject a checkpoint
   */
  reject(id: string, reviewer: string, feedback: string): Checkpoint {
    return this.transition(id, 'rejected', { actor: reviewer, feedback, reason: feedback });
  }

  /**
   * Skip a checkpoint
   */
  skip(id: string, reason: string): Checkpoint {
    return this.transition(id, 'skipped', { reason });
  }

  /**
   * Get transition history for a checkpoint
   */
  getHistory(id: string): CheckpointTransition[] {
    return this.history.get(id) ?? [];
  }

  /**
   * Check if all checkpoints in a stage are approved or skipped
   */
  isStageComplete(stage: string): boolean {
    const stageCheckpoints = Array.from(this.checkpoints.values())
      .filter(c => c.stage === stage);

    if (stageCheckpoints.length === 0) return false;

    return stageCheckpoints.every(
      c => c.status === 'approved' || c.status === 'skipped'
    );
  }

  /**
   * Get all checkpoints for a stage
   */
  getStageCheckpoints(stage: string): Checkpoint[] {
    return Array.from(this.checkpoints.values())
      .filter(c => c.stage === stage);
  }

  /**
   * Serialize state for persistence
   */
  serialize(): string {
    return JSON.stringify({
      checkpoints: Array.from(this.checkpoints.entries()),
      history: Array.from(this.history.entries()),
    });
  }

  /**
   * Restore state from serialized data
   */
  static deserialize(data: string): CheckpointManager {
    const parsed = JSON.parse(data) as {
      checkpoints: Array<[string, Checkpoint]>;
      history: Array<[string, CheckpointTransition[]]>;
    };
    const manager = new CheckpointManager();
    manager.checkpoints = new Map(parsed.checkpoints.map(
      ([k, v]) => [k, { ...v, createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt) }]
    ));
    manager.history = new Map(parsed.history.map(
      ([k, v]) => [k, v.map(t => ({ ...t, timestamp: new Date(t.timestamp) }))]
    ));
    return manager;
  }
}
