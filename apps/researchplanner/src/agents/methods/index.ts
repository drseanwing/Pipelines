/**
 * Methods Agent - Main Module
 * Phase 6 - Stage 3: Methodology Development
 *
 * Re-exports all methodology planning functions and provides main orchestration.
 */

import type { Project } from '../../types/project.js';
import type { ResearchResults } from '../../types/research.js';
import type { Methodology } from '../../types/methodology.js';
import { determineStudyDesign } from './design.js';
import { defineParticipantCriteria } from './participants.js';
import { calculateSampleSize, requiresSampleSize } from './sample-size.js';
import { defineOutcomes } from './outcomes.js';
import { designProcedures } from './procedures.js';
import { planDataCollection } from './data-collection.js';
import { developAnalysisPlan } from './analysis.js';
import { generateTimeline } from './timeline.js';
import { generateMethodologySummary, generateMethodsDraft } from './output.js';

// Study design
export * from './design.js';

// Outcomes
export * from './outcomes.js';

// Participants
export * from './participants.js';

// Sample size
export * from './sample-size.js';

// Procedures
export * from './procedures.js';

// Data collection
export * from './data-collection.js';

// Analysis
export * from './analysis.js';

// Timeline
export * from './timeline.js';

// Output
export * from './output.js';

/**
 * Main orchestration function for methodology development.
 * Coordinates all methodology planning steps in sequence.
 *
 * @param project - Project configuration
 * @param researchResults - Results from research synthesis phase
 * @returns Complete methodology specification
 */
export async function developMethodology(
  project: Project,
  researchResults: ResearchResults
): Promise<Methodology> {
  // 1. Determine study design based on classification and gaps
  const studyDesign = await determineStudyDesign(
    project.classification,
    researchResults.gaps
  );

  // 2. Define participant criteria from target population
  const participantCriteria = await defineParticipantCriteria(
    project.targetPopulation,
    studyDesign
  );

  // 3. Calculate sample size if required by design
  let sampleSize = undefined;
  if (requiresSampleSize(studyDesign)) {
    sampleSize = await calculateSampleSize(studyDesign, participantCriteria);
  }

  // 4. Define outcomes from intended outcomes
  const outcomes = await defineOutcomes(
    project.intendedOutcomes,
    studyDesign
  );

  // 5. Design procedures based on design and outcomes
  const procedures = await designProcedures(studyDesign, outcomes);

  // 6. Plan data collection
  const dataCollection = await planDataCollection(
    studyDesign,
    outcomes,
    procedures
  );

  // 7. Develop analysis plan
  const analysisPlan = await developAnalysisPlan(
    studyDesign,
    outcomes,
    dataCollection
  );

  // 8. Generate timeline
  const timeline = await generateTimeline(
    studyDesign,
    participantCriteria,
    sampleSize,
    procedures,
    dataCollection
  );

  // 9. Generate summary and methods draft
  const methodology: Methodology = {
    studyDesign,
    participantCriteria,
    sampleSize,
    outcomes,
    procedures,
    dataCollection,
    analysisPlan,
    timeline,
    summary: '',
    methodsDraft: ''
  };

  methodology.summary = await generateMethodologySummary(methodology);
  methodology.methodsDraft = await generateMethodsDraft(methodology);

  // 10. Return complete Methodology object
  return methodology;
}
