/**
 * Ethics Agent Index - Integration Tests
 * Phase 7.8 - Ethics Agent Index Testing
 */

import { describe, it, expect } from 'vitest';
import { evaluateEthicsGovernance } from './index.js';
import type { Project } from '../../types/project.js';
import type { Methodology } from '../../types/methodology.js';
import { ProjectType } from '../../types/project.js';
import { RiskLevel, EthicsPathwayType } from '../../types/ethics.js';

describe('Ethics Agent - evaluateEthicsGovernance', () => {
  it('should orchestrate complete ethics evaluation for QI project', async () => {
    const mockProject: Project = {
      id: 'test-123',
      status: 'METHODOLOGY_COMPLETE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      intake: {
        project_title: 'Test QI Project',
        project_type: ProjectType.QI,
        concept_description: 'Testing QI workflow',
        clinical_problem: 'Test problem',
        target_population: 'Adult patients',
        setting: 'Hospital ward',
        principal_investigator: {
          name: 'Dr. Test',
          role: 'PI',
          title: 'Dr',
          institution: 'Metro North Health',
          department: 'Medicine',
          email: 'test@example.com',
          expertise: ['QI'],
        },
        co_investigators: [],
        intended_outcomes: 'Improved care',
      },
      classification: {
        project_type: ProjectType.QI,
        confidence: 0.95,
        reasoning: 'QI project',
        suggested_designs: ['PDSA'],
      },
      frameworks: {
        reporting_guideline: 'SQUIRE',
        ethics_framework: 'QI Registration',
        governance_requirements: ['Unit Director Approval'],
      },
      audit_log: [],
      checkpoints: {
        intake_approved: true,
        research_approved: false,
        methodology_approved: true,
        ethics_approved: false,
        documents_approved: false,
      },
    };

    const mockMethodology: Methodology = {
      study_design: {
        type: 'PDSA_CYCLE',
        reporting_guideline: 'SQUIRE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: false,
        justification: 'QI project using PDSA methodology',
      },
      setting_sites: [
        {
          name: 'Metro North Health',
          type: 'PRIMARY',
          location: 'Queensland',
          capacity: 'Adequate',
        },
      ],
      participants: {
        inclusion_criteria: [
          { description: 'Adult patients in medical ward' },
        ],
        exclusion_criteria: [
          { description: 'Patients in ICU' },
        ],
        recruitment_strategy: {
          method: 'CONSECUTIVE_SAMPLING',
          sites: ['Metro North Health'],
          estimated_duration: '3 months',
          feasibility_justification: 'Adequate patient volume',
        },
        capacity_issues: false,
        vulnerable_population: false,
      },
      outcomes: {
        primary: {
          name: 'Length of stay',
          definition: 'Hospital length of stay in days',
          measurement_tool: 'Electronic medical record',
          measurement_timing: 'At discharge',
        },
        secondary: [],
      },
      procedures: {
        overview: 'Implement new discharge protocol',
        step_by_step_protocol: [
          {
            step_number: 1,
            description: 'Plan',
          },
          {
            step_number: 2,
            description: 'Do',
          },
          {
            step_number: 3,
            description: 'Study',
          },
          {
            step_number: 4,
            description: 'Act',
          },
        ],
        quality_assurance_measures: ['Regular audit'],
      },
      data_collection: {
        data_types: ['ADMINISTRATIVE'],
        includes_identifiable_data: false,
        instruments: [
          {
            name: 'Electronic Medical Record',
            type: 'ADMINISTRATIVE',
            validated: true,
          },
        ],
        collection_timepoints: ['Baseline', 'Post-intervention'],
        missing_data_handling: 'Exclude missing records',
      },
      analysis_plan: {
        primary_analysis_method: 'Run chart analysis',
        secondary_analysis_methods: [],
        missing_data_approach: 'Complete case analysis',
        statistical_software: 'Excel',
        significance_level: 0.05,
      },
      timeline: {
        total_duration: '6 months',
        milestones: [
          {
            name: 'Start',
            target_date: '2024-01-01',
            deliverable: 'Project initiation',
          },
        ],
      },
    };

    const result = await evaluateEthicsGovernance(mockProject, mockMethodology);

    // Verify all components present
    expect(result.ethics_pathway).toBeDefined();
    expect(result.risk_assessment).toBeDefined();
    expect(result.consent_requirements).toBeDefined();
    expect(result.data_governance).toBeDefined();
    expect(result.site_requirements).toBeDefined();
    expect(result.governance_checklist).toBeDefined();
    expect(result.ethics_considerations_draft).toBeDefined();
    expect(result.data_management_plan_draft).toBeDefined();

    // Verify QI pathway
    expect(result.ethics_pathway.pathway).toBe(EthicsPathwayType.QI_REGISTRATION);
    expect(result.ethics_pathway.requires_hrec).toBe(false);

    // Verify risk is low for QI with de-identified data
    expect([RiskLevel.NEGLIGIBLE, RiskLevel.LOW]).toContain(result.risk_assessment.level);

    // Verify checklist has items
    expect(result.governance_checklist.length).toBeGreaterThan(0);

    // Verify site requirements
    expect(result.site_requirements.length).toBe(1);
    expect(result.site_requirements[0].site_name).toBe('Metro North Health');

    // Verify drafts are strings
    expect(typeof result.ethics_considerations_draft).toBe('string');
    expect(typeof result.data_management_plan_draft).toBe('string');
  });

  it('should orchestrate complete ethics evaluation for research project', async () => {
    const mockProject: Project = {
      id: 'test-456',
      status: 'METHODOLOGY_COMPLETE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      intake: {
        project_title: 'Test Research Project',
        project_type: ProjectType.RESEARCH,
        concept_description: 'Testing research workflow',
        clinical_problem: 'Test problem',
        target_population: 'Adult patients',
        setting: 'Outpatient clinic',
        principal_investigator: {
          name: 'Dr. Researcher',
          role: 'PI',
          title: 'Dr',
          institution: 'Royal Melbourne Hospital',
          department: 'Medicine',
          email: 'researcher@example.com',
          expertise: ['Clinical Research'],
        },
        co_investigators: [],
        intended_outcomes: 'New knowledge',
      },
      classification: {
        project_type: ProjectType.RESEARCH,
        confidence: 0.95,
        reasoning: 'Research project',
        suggested_designs: ['COHORT'],
      },
      frameworks: {
        reporting_guideline: 'STROBE',
        ethics_framework: 'HREC Review',
        governance_requirements: ['HREC Approval', 'RGO Authorization'],
      },
      audit_log: [],
      checkpoints: {
        intake_approved: true,
        research_approved: true,
        methodology_approved: true,
        ethics_approved: false,
        documents_approved: false,
      },
    };

    const mockMethodology: Methodology = {
      study_design: {
        type: 'COHORT',
        subtype: 'PROSPECTIVE_COHORT',
        reporting_guideline: 'STROBE',
        is_randomised: false,
        is_blinded: false,
        requires_sample_size: true,
        justification: 'Prospective cohort to assess outcomes',
      },
      setting_sites: [
        {
          name: 'Royal Melbourne Hospital',
          type: 'PRIMARY',
          location: 'Victoria',
          capacity: 'Adequate',
        },
      ],
      participants: {
        inclusion_criteria: [
          { description: 'Adults over 18 years' },
          { description: 'Diagnosed with condition X' },
        ],
        exclusion_criteria: [
          { description: 'Unable to provide consent' },
        ],
        sample_size: {
          target: 100,
          calculation_method: 'POWER_ANALYSIS',
          assumptions: {
            effect_size: 0.5,
            power: 0.8,
            alpha: 0.05,
            attrition_rate: 0.1,
          },
          justification: 'Power analysis for primary outcome',
        },
        recruitment_strategy: {
          method: 'CONSECUTIVE_SAMPLING',
          sites: ['Royal Melbourne Hospital'],
          estimated_duration: '12 months',
          feasibility_justification: 'Adequate patient volume',
        },
        capacity_issues: false,
        vulnerable_population: false,
      },
      outcomes: {
        primary: {
          name: 'Disease progression',
          definition: 'Progression-free survival at 12 months',
          measurement_tool: 'Clinical assessment',
          measurement_timing: 'Baseline, 6 months, 12 months',
        },
        secondary: [
          {
            name: 'Quality of life',
            definition: 'QoL score',
            measurement_tool: 'SF-36',
            measurement_timing: 'Baseline, 6 months, 12 months',
          },
        ],
      },
      procedures: {
        overview: 'Prospective observation of cohort',
        step_by_step_protocol: [
          {
            step_number: 1,
            description: 'Enroll eligible patients',
          },
          {
            step_number: 2,
            description: 'Collect baseline data',
          },
          {
            step_number: 3,
            description: 'Follow-up at 6 and 12 months',
          },
        ],
        quality_assurance_measures: ['Data monitoring', 'Quality checks'],
      },
      data_collection: {
        data_types: ['CLINICAL', 'SURVEY'],
        includes_identifiable_data: true,
        instruments: [
          {
            name: 'SF-36',
            type: 'SURVEY',
            validated: true,
            source: 'Published instrument',
          },
          {
            name: 'Clinical assessment form',
            type: 'CLINICAL',
            validated: false,
          },
        ],
        collection_timepoints: ['Baseline', '6 months', '12 months'],
        missing_data_handling: 'Multiple imputation',
      },
      analysis_plan: {
        primary_analysis_method: 'Cox proportional hazards',
        secondary_analysis_methods: ['Linear mixed models'],
        missing_data_approach: 'Multiple imputation',
        statistical_software: 'R',
        significance_level: 0.05,
      },
      timeline: {
        total_duration: '24 months',
        milestones: [
          {
            name: 'Ethics approval',
            target_date: '2024-03-01',
            deliverable: 'HREC approval',
          },
          {
            name: 'Recruitment complete',
            target_date: '2025-03-01',
            deliverable: 'All participants enrolled',
          },
        ],
      },
    };

    const result = await evaluateEthicsGovernance(mockProject, mockMethodology);

    // Verify all components present
    expect(result.ethics_pathway).toBeDefined();
    expect(result.risk_assessment).toBeDefined();
    expect(result.consent_requirements).toBeDefined();
    expect(result.data_governance).toBeDefined();
    expect(result.site_requirements).toBeDefined();
    expect(result.governance_checklist).toBeDefined();

    // Verify research pathway (likely LOW_RISK or FULL_HREC)
    expect([
      EthicsPathwayType.LOW_RISK_RESEARCH,
      EthicsPathwayType.FULL_HREC_REVIEW,
    ]).toContain(result.ethics_pathway.pathway);

    // Should require some form of ethics review
    expect(result.ethics_pathway.requires_hrec || result.ethics_pathway.requires_rgo).toBe(true);

    // Verify consent requirements
    expect(result.consent_requirements.consent_type).toBeDefined();

    // Verify data governance includes privacy compliance
    expect(result.data_governance.privacy_compliance).toBeDefined();

    // Verify checklist has more items than QI project
    expect(result.governance_checklist.length).toBeGreaterThan(5);
  });
});
