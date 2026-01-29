import { describe, it, expect } from 'vitest';
import { CheckpointManager } from './index.js';

describe('@pipelines/checkpoint', () => {
  describe('CheckpointManager', () => {
    it('creates a checkpoint in pending state', () => {
      const mgr = new CheckpointManager();
      const cp = mgr.create({ id: 'cp-1', name: 'Review', stage: 'extraction' });

      expect(cp.status).toBe('pending');
      expect(cp.name).toBe('Review');
      expect(cp.stage).toBe('extraction');
    });

    it('transitions through valid states', () => {
      const mgr = new CheckpointManager();
      mgr.create({ id: 'cp-1', name: 'Review', stage: 'extraction' });

      mgr.start('cp-1');
      expect(mgr.get('cp-1')!.status).toBe('in_progress');

      mgr.submitForReview('cp-1');
      expect(mgr.get('cp-1')!.status).toBe('awaiting_review');

      mgr.approve('cp-1', 'reviewer@example.com', 'Looks good');
      expect(mgr.get('cp-1')!.status).toBe('approved');
      expect(mgr.get('cp-1')!.reviewer).toBe('reviewer@example.com');
    });

    it('rejects invalid transitions', () => {
      const mgr = new CheckpointManager();
      mgr.create({ id: 'cp-1', name: 'Review', stage: 'extraction' });

      expect(() => mgr.approve('cp-1', 'user')).toThrow('Invalid transition');
    });

    it('tracks transition history', () => {
      const mgr = new CheckpointManager();
      mgr.create({ id: 'cp-1', name: 'Review', stage: 'extraction' });
      mgr.start('cp-1');
      mgr.submitForReview('cp-1');

      const history = mgr.getHistory('cp-1');
      expect(history.length).toBe(2);
      expect(history[0]!.from).toBe('pending');
      expect(history[0]!.to).toBe('in_progress');
    });

    it('checks stage completion', () => {
      const mgr = new CheckpointManager();
      mgr.create({ id: 'cp-1', name: 'Review 1', stage: 's1' });
      mgr.create({ id: 'cp-2', name: 'Review 2', stage: 's1' });

      expect(mgr.isStageComplete('s1')).toBe(false);

      mgr.start('cp-1');
      mgr.submitForReview('cp-1');
      mgr.approve('cp-1', 'user');
      mgr.skip('cp-2', 'Not needed');

      expect(mgr.isStageComplete('s1')).toBe(true);
    });

    it('serializes and deserializes', () => {
      const mgr = new CheckpointManager();
      mgr.create({ id: 'cp-1', name: 'Review', stage: 'extraction' });
      mgr.start('cp-1');

      const serialized = mgr.serialize();
      const restored = CheckpointManager.deserialize(serialized);

      expect(restored.get('cp-1')!.status).toBe('in_progress');
      expect(restored.getHistory('cp-1').length).toBe(1);
    });
  });
});
