/**
 * Tests for project database operations
 * Phase 3.17.5-3.17.6 - Project CRUD Tests
 *
 * Test coverage:
 * - createProject function
 * - getProjectById function
 * - updateProject function
 * - updateProjectStatus function
 *
 * Note: These tests use mocked database calls to avoid requiring a live database
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IntakeData, Project, Investigator, ProjectStatus } from '../../src/types/index.js';
import { ProjectType, GrantType } from '../../src/types/index.js';

// Use vi.hoisted so mockQuery is available inside the vi.mock factory
const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

// Mock the database pool with a shared mockQuery reference
vi.mock('../../src/db/client.js', () => ({
  getPool: vi.fn(() => ({
    query: mockQuery,
  })),
  createPool: vi.fn(),
  closePool: vi.fn(),
}));

describe('Project Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockInvestigator: Investigator = {
    name: 'Dr. Jane Smith',
    role: 'PI',
    title: 'Senior Consultant',
    institution: 'Metro North Hospital',
    department: 'Emergency Medicine',
    email: 'jane.smith@example.com',
    expertise: ['Emergency Medicine'],
  };

  const mockIntakeData: IntakeData = {
    project_title: 'Test QI Project',
    project_type: ProjectType.QI,
    concept_description: 'A'.repeat(500), // Valid length
    clinical_problem: 'Long wait times in ED',
    target_population: 'Adult ED patients',
    setting: 'Emergency Department',
    principal_investigator: mockInvestigator,
    co_investigators: [],
    intended_outcomes: 'Reduce wait times by 50%',
    grant_target: GrantType.INTERNAL,
  };

  const mockProjectRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    status: 'DRAFT',
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
    intake: mockIntakeData,
    classification: null,
    frameworks: null,
    research: null,
    methodology: null,
    ethics: null,
    documents: null,
    checkpoints: {
      intake_approved: false,
      research_approved: false,
      methodology_approved: false,
      ethics_approved: false,
      documents_approved: false,
    },
    owner_id: null,
    deleted_at: null,
  };

  describe('createProject', () => {
    it('should create a new project with intake data', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockProjectRow],
      });

      const { createProject } = await import('../../src/db/queries/projects.js');
      const project = await createProject(mockIntakeData);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(project).toBeDefined();
      expect(project.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(project.status).toBe('DRAFT');
      expect(project.intake).toEqual(mockIntakeData);
      expect(project.checkpoints).toBeDefined();
      expect(project.checkpoints.intake_approved).toBe(false);
    });

    it('should create project with owner_id when provided', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockProjectRow, owner_id: 'owner-uuid-123' }],
      });

      const { createProject } = await import('../../src/db/queries/projects.js');
      const project = await createProject(mockIntakeData, 'owner-uuid-123');

      expect(project.owner_id).toBe('owner-uuid-123');
    });

    it('should initialize all checkpoints to false', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockProjectRow],
      });

      const { createProject } = await import('../../src/db/queries/projects.js');
      const project = await createProject(mockIntakeData);

      expect(project.checkpoints.intake_approved).toBe(false);
      expect(project.checkpoints.research_approved).toBe(false);
      expect(project.checkpoints.methodology_approved).toBe(false);
      expect(project.checkpoints.ethics_approved).toBe(false);
      expect(project.checkpoints.documents_approved).toBe(false);
    });

    it('should throw error when database operation fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const { createProject } = await import('../../src/db/queries/projects.js');
      await expect(createProject(mockIntakeData)).rejects.toThrow('Failed to create project');
    });
  });

  describe('getProjectById', () => {
    it('should retrieve a project by ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockProjectRow],
      });

      const { getProjectById } = await import('../../src/db/queries/projects.js');
      const project = await getProjectById('123e4567-e89b-12d3-a456-426614174000');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(project).toBeDefined();
      expect(project?.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(project?.intake).toEqual(mockIntakeData);
    });

    it('should return null when project not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const { getProjectById } = await import('../../src/db/queries/projects.js');
      const project = await getProjectById('nonexistent-id');

      expect(project).toBeNull();
    });

    it('should not return soft-deleted projects', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const { getProjectById } = await import('../../src/db/queries/projects.js');
      const project = await getProjectById('deleted-project-id');

      expect(project).toBeNull();
    });

    it('should throw error when database operation fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database query failed'));

      const { getProjectById } = await import('../../src/db/queries/projects.js');
      await expect(getProjectById('some-id')).rejects.toThrow('Failed to fetch project');
    });
  });

  describe('updateProject', () => {
    it('should update project with partial data', async () => {
      const updatedRow = {
        ...mockProjectRow,
        status: 'INTAKE_COMPLETE',
        classification: {
          project_type: ProjectType.QI,
          confidence: 0.95,
          reasoning: 'Strong QI characteristics',
          suggested_designs: ['PDSA'],
        },
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedRow],
      });

      const { updateProject } = await import('../../src/db/queries/projects.js');
      const project = await updateProject('123e4567-e89b-12d3-a456-426614174000', {
        status: 'INTAKE_COMPLETE',
        classification: updatedRow.classification,
      });

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(project.status).toBe('INTAKE_COMPLETE');
      expect(project.classification).toEqual(updatedRow.classification);
    });

    it('should update research stage data', async () => {
      const researchData = {
        search_strategy: { mesh_terms: ['Emergency Medicine'] },
        primary_literature: [],
        secondary_literature: [],
        gap_analysis: {},
        evidence_synthesis: 'Summary of evidence',
        citations: [],
      };

      const updatedRow = {
        ...mockProjectRow,
        research: researchData,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedRow],
      });

      const { updateProject } = await import('../../src/db/queries/projects.js');
      const project = await updateProject('123e4567-e89b-12d3-a456-426614174000', {
        research: researchData,
      });

      expect(project.research).toEqual(researchData);
    });

    it('should update checkpoints', async () => {
      const updatedCheckpoints = {
        intake_approved: true,
        research_approved: false,
        methodology_approved: false,
        ethics_approved: false,
        documents_approved: false,
      };

      const updatedRow = {
        ...mockProjectRow,
        checkpoints: updatedCheckpoints,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedRow],
      });

      const { updateProject } = await import('../../src/db/queries/projects.js');
      const project = await updateProject('123e4567-e89b-12d3-a456-426614174000', {
        checkpoints: updatedCheckpoints,
      });

      expect(project.checkpoints.intake_approved).toBe(true);
    });

    it('should throw error when no fields to update', async () => {
      const { updateProject } = await import('../../src/db/queries/projects.js');
      await expect(
        updateProject('123e4567-e89b-12d3-a456-426614174000', {})
      ).rejects.toThrow('No fields to update');
    });

    it('should throw error when project not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const { updateProject } = await import('../../src/db/queries/projects.js');
      await expect(
        updateProject('nonexistent-id', { status: 'INTAKE_COMPLETE' })
      ).rejects.toThrow('Project not found');
    });
  });

  describe('updateProjectStatus', () => {
    it('should update project status', async () => {
      const updatedRow = {
        ...mockProjectRow,
        status: 'INTAKE_COMPLETE',
        updated_at: new Date('2024-01-15T11:00:00Z'),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [updatedRow],
      });

      const { updateProjectStatus } = await import('../../src/db/queries/projects.js');
      const project = await updateProjectStatus(
        '123e4567-e89b-12d3-a456-426614174000',
        'INTAKE_COMPLETE'
      );

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(project.status).toBe('INTAKE_COMPLETE');
    });

    it('should handle all valid status values', async () => {
      const statuses: ProjectStatus[] = [
        'INTAKE_COMPLETE',
        'INTAKE_APPROVED',
        'RESEARCH_COMPLETE',
        'RESEARCH_APPROVED',
        'METHODOLOGY_COMPLETE',
        'METHODOLOGY_APPROVED',
        'ETHICS_COMPLETE',
        'ETHICS_APPROVED',
        'DOCUMENTS_COMPLETE',
        'DOCUMENTS_APPROVED',
        'SUBMITTED',
        'REVISION_REQUIRED',
        'COMPLETED',
        'ARCHIVED',
      ];

      for (const status of statuses) {
        const updatedRow = {
          ...mockProjectRow,
          status,
        };

        mockQuery.mockResolvedValueOnce({
          rows: [updatedRow],
        });

        const { updateProjectStatus } = await import('../../src/db/queries/projects.js');
        const project = await updateProjectStatus(
          '123e4567-e89b-12d3-a456-426614174000',
          status
        );

        expect(project.status).toBe(status);
      }
    });

    it('should throw error when project not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const { updateProjectStatus } = await import('../../src/db/queries/projects.js');
      await expect(
        updateProjectStatus('nonexistent-id', 'INTAKE_COMPLETE')
      ).rejects.toThrow('Project not found');
    });

    it('should throw error when database operation fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const { updateProjectStatus } = await import('../../src/db/queries/projects.js');
      await expect(
        updateProjectStatus('some-id', 'INTAKE_COMPLETE')
      ).rejects.toThrow('Failed to update project status');
    });
  });
});
