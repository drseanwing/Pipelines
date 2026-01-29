/**
 * Timeline Generation Module
 * Phase 6.9 - Project Timeline Planning
 *
 * Generates project timelines with milestones, recruitment periods,
 * and grant deadline alignment.
 */

import type {
  Methodology,
  ProjectTimeline,
  ParticipantSpec,
  ProcedureSpec,
} from '../../types/methodology.js';

/**
 * Gantt chart task representation
 */
export interface GanttTask {
  id: string;
  name: string;
  start: string; // ISO date
  end: string; // ISO date
  duration: number; // days
  dependencies?: string[];
  progress?: number; // 0-100
  type?: 'milestone' | 'task' | 'phase';
}

/**
 * Standard project phase durations (in days)
 */
const PHASE_DURATIONS = {
  PROTOCOL_DEVELOPMENT: { min: 30, max: 60 },
  ETHICS_APPROVAL: { min: 60, max: 120 },
  GOVERNANCE_APPROVAL: { min: 30, max: 90 },
  RECRUITMENT: { min: 90, max: 365 }, // Varies by sample size
  DATA_COLLECTION: { min: 30, max: 180 },
  DATA_ANALYSIS: { min: 30, max: 90 },
  REPORT_WRITING: { min: 30, max: 60 },
  DISSEMINATION: { min: 60, max: 365 },
};

/**
 * Estimate recruitment period based on sample size and site capacity
 *
 * @param participants - Participant specification
 * @param sampleSize - Target sample size
 * @returns Estimated recruitment period in months
 */
export function estimateRecruitmentPeriod(
  participants: ParticipantSpec,
  sampleSize?: number
): string {
  const targetSize = sampleSize || participants.sample_size?.target || 100;

  // Base recruitment rate: 10-20 participants per month per site
  // Adjusted for:
  // - Vulnerable populations (slower)
  // - Capacity issues (slower)
  // - Randomization (slower)

  let monthlyRate = 15; // Default rate per site

  if (participants.vulnerable_population) {
    monthlyRate *= 0.6; // 40% slower for vulnerable populations
  }

  if (participants.capacity_issues) {
    monthlyRate *= 0.7; // 30% slower with capacity constraints
  }

  // Estimate number of sites from recruitment strategy
  const siteCount = participants.recruitment_strategy.sites.length || 1;
  const totalMonthlyRate = monthlyRate * siteCount;

  // Add 20% buffer for attrition and screening failures
  const adjustedTarget = targetSize * 1.2;

  const months = Math.ceil(adjustedTarget / totalMonthlyRate);

  // Minimum 3 months, maximum 24 months
  const clampedMonths = Math.max(3, Math.min(24, months));

  return `${clampedMonths} months`;
}

/**
 * Calculate date offset from start date
 */
function addDaysToDate(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate date offset in months
 */
function addMonthsToDate(startDate: Date, months: number): Date {
  const result = new Date(startDate);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Parse duration string (e.g., "6 months", "90 days")
 */
function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)\s*(month|months|day|days|week|weeks)/i);
  if (!match) return 30; // Default 30 days

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit.startsWith('month')) return value * 30;
  if (unit.startsWith('week')) return value * 7;
  return value;
}

/**
 * Format duration in days to readable string
 */
function formatDuration(days: number): string {
  if (days < 7) return `${days} days`;
  if (days < 60) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.ceil(days / 30)} months`;
}

/**
 * Generate milestone list from methodology phases
 *
 * @param methodology - Complete methodology specification
 * @param startDate - Project start date
 * @returns Array of milestones with target dates
 */
export function generateMilestones(
  methodology: Methodology,
  startDate: Date = new Date()
): ProjectTimeline['milestones'] {
  const milestones: ProjectTimeline['milestones'] = [];
  let currentDate = new Date(startDate);

  // 1. Protocol Development
  const protocolDuration = PHASE_DURATIONS.PROTOCOL_DEVELOPMENT.max;
  currentDate = addDaysToDate(currentDate, protocolDuration);
  milestones.push({
    name: 'Protocol Development Complete',
    target_date: currentDate.toISOString().split('T')[0],
    deliverable: 'Finalized research protocol document',
    responsible_party: 'Principal Investigator',
  });

  // 2. Ethics Approval
  const ethicsDuration = PHASE_DURATIONS.ETHICS_APPROVAL.max;
  currentDate = addDaysToDate(currentDate, ethicsDuration);
  milestones.push({
    name: 'Ethics Approval Obtained',
    target_date: currentDate.toISOString().split('T')[0],
    deliverable: 'Ethics committee approval letter',
    responsible_party: 'Research Ethics Committee',
  });

  // 3. Governance Approval (if multi-site)
  if (methodology.setting_sites.length > 1) {
    const govDuration = PHASE_DURATIONS.GOVERNANCE_APPROVAL.max;
    currentDate = addDaysToDate(currentDate, govDuration);
    milestones.push({
      name: 'Site Governance Approvals Complete',
      target_date: currentDate.toISOString().split('T')[0],
      deliverable: 'All site-specific approvals obtained',
      responsible_party: 'Research Governance Offices',
    });
  }

  // 4. Recruitment Start
  milestones.push({
    name: 'Recruitment Commences',
    target_date: currentDate.toISOString().split('T')[0],
    deliverable: 'First participant enrolled',
    responsible_party: 'Research Team',
  });

  // 5. Recruitment Complete
  const recruitmentDays = parseDuration(
    estimateRecruitmentPeriod(methodology.participants)
  );
  currentDate = addDaysToDate(currentDate, recruitmentDays);
  milestones.push({
    name: 'Recruitment Target Achieved',
    target_date: currentDate.toISOString().split('T')[0],
    deliverable: `${methodology.participants.sample_size?.target || 'Target'} participants enrolled`,
    responsible_party: 'Research Team',
  });

  // 6. Data Collection Complete
  const dataCollectionDuration = methodology.study_design.type === 'RCT'
    ? PHASE_DURATIONS.DATA_COLLECTION.max
    : PHASE_DURATIONS.DATA_COLLECTION.min;
  currentDate = addDaysToDate(currentDate, dataCollectionDuration);
  milestones.push({
    name: 'Data Collection Complete',
    target_date: currentDate.toISOString().split('T')[0],
    deliverable: 'All outcome data collected and verified',
    responsible_party: 'Research Team',
  });

  // 7. Data Analysis Complete
  const analysisDuration = PHASE_DURATIONS.DATA_ANALYSIS.max;
  currentDate = addDaysToDate(currentDate, analysisDuration);
  milestones.push({
    name: 'Data Analysis Complete',
    target_date: currentDate.toISOString().split('T')[0],
    deliverable: 'Statistical analysis report',
    responsible_party: 'Statistician',
  });

  // 8. Final Report Complete
  const reportDuration = PHASE_DURATIONS.REPORT_WRITING.max;
  currentDate = addDaysToDate(currentDate, reportDuration);
  milestones.push({
    name: 'Final Report Submitted',
    target_date: currentDate.toISOString().split('T')[0],
    deliverable: 'Complete study report and manuscript',
    responsible_party: 'Principal Investigator',
  });

  // 9. Dissemination Activities
  const disseminationDuration = PHASE_DURATIONS.DISSEMINATION.min;
  currentDate = addDaysToDate(currentDate, disseminationDuration);
  milestones.push({
    name: 'Initial Dissemination Complete',
    target_date: currentDate.toISOString().split('T')[0],
    deliverable: 'Conference presentation and/or publication',
    responsible_party: 'Research Team',
  });

  return milestones;
}

/**
 * Calculate total project duration from milestones
 *
 * @param milestones - Array of project milestones
 * @returns Total duration as readable string
 */
export function calculateTotalDuration(
  milestones: ProjectTimeline['milestones']
): string {
  if (milestones.length === 0) return '12 months';

  const startDate = new Date(milestones[0].target_date);
  const endDate = new Date(milestones[milestones.length - 1].target_date);

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return formatDuration(diffDays);
}

/**
 * Align timeline with grant deadline
 * Adjusts milestone dates to ensure completion before deadline
 *
 * @param timeline - Existing project timeline
 * @param grantDeadline - Grant deadline date (ISO string)
 * @returns Adjusted timeline
 */
export function alignWithGrantDeadline(
  timeline: ProjectTimeline,
  grantDeadline: string
): ProjectTimeline {
  const deadline = new Date(grantDeadline);
  const lastMilestone = timeline.milestones[timeline.milestones.length - 1];
  const projectedEnd = new Date(lastMilestone.target_date);

  // If timeline fits within deadline, return as-is with grant alignment
  if (projectedEnd <= deadline) {
    // Set submission target 2 weeks before deadline
    const submissionTarget = addDaysToDate(deadline, -14);

    return {
      ...timeline,
      grant_alignment: {
        grant_deadline: grantDeadline,
        submission_target: submissionTarget.toISOString().split('T')[0],
      },
    };
  }

  // Timeline exceeds deadline - compress by reducing buffer time
  const requiredDays = Math.abs(projectedEnd.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24);
  const compressionFactor = 0.85; // Reduce durations by 15%

  // Recalculate milestones with compressed timeline
  const firstMilestone = timeline.milestones[0];
  const startDate = new Date(firstMilestone.target_date);
  const adjustedStart = addDaysToDate(startDate, -Math.floor(requiredDays * compressionFactor));

  // Apply compression to each milestone
  const adjustedMilestones = timeline.milestones.map((milestone, idx) => {
    if (idx === 0) {
      return {
        ...milestone,
        target_date: adjustedStart.toISOString().split('T')[0],
      };
    }

    const originalDate = new Date(milestone.target_date);
    const daysFromStart = Math.abs(originalDate.getTime() - new Date(firstMilestone.target_date).getTime())
      / (1000 * 60 * 60 * 24);
    const compressedDays = Math.floor(daysFromStart * compressionFactor);
    const adjustedDate = addDaysToDate(adjustedStart, compressedDays);

    return {
      ...milestone,
      target_date: adjustedDate.toISOString().split('T')[0],
    };
  });

  const submissionTarget = addDaysToDate(deadline, -14);

  return {
    ...timeline,
    milestones: adjustedMilestones,
    total_duration: calculateTotalDuration(adjustedMilestones),
    grant_alignment: {
      grant_deadline: grantDeadline,
      submission_target: submissionTarget.toISOString().split('T')[0],
    },
  };
}

/**
 * Convert timeline to Gantt chart task structure
 *
 * @param timeline - Project timeline
 * @returns Array of Gantt-compatible tasks
 */
export function generateGanttData(timeline: ProjectTimeline): GanttTask[] {
  const tasks: GanttTask[] = [];

  // Add project phases as tasks
  for (let i = 0; i < timeline.milestones.length - 1; i++) {
    const current = timeline.milestones[i];
    const next = timeline.milestones[i + 1];

    const startDate = new Date(current.target_date);
    const endDate = new Date(next.target_date);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    tasks.push({
      id: `phase-${i + 1}`,
      name: extractPhaseName(current.name, next.name),
      start: current.target_date,
      end: next.target_date,
      duration,
      dependencies: i > 0 ? [`phase-${i}`] : undefined,
      type: 'phase',
    });
  }

  // Add milestones as separate tasks
  timeline.milestones.forEach((milestone, idx) => {
    tasks.push({
      id: `milestone-${idx + 1}`,
      name: milestone.name,
      start: milestone.target_date,
      end: milestone.target_date,
      duration: 0,
      dependencies: idx > 0 ? [`phase-${idx}`] : undefined,
      type: 'milestone',
    });
  });

  return tasks;
}

/**
 * Extract phase name from milestone transitions
 */
function extractPhaseName(currentMilestone: string, nextMilestone: string): string {
  if (nextMilestone.includes('Protocol Development')) return 'Protocol Development';
  if (nextMilestone.includes('Ethics Approval')) return 'Ethics Review';
  if (nextMilestone.includes('Governance')) return 'Governance Approvals';
  if (nextMilestone.includes('Recruitment Target')) return 'Participant Recruitment';
  if (nextMilestone.includes('Data Collection')) return 'Data Collection';
  if (nextMilestone.includes('Analysis Complete')) return 'Data Analysis';
  if (nextMilestone.includes('Report')) return 'Report Writing';
  if (nextMilestone.includes('Dissemination')) return 'Dissemination';
  return 'Project Phase';
}

/**
 * Generate complete project timeline
 * Main entry point for timeline generation
 *
 * @param methodology - Complete methodology specification
 * @param grantDeadline - Optional grant deadline for alignment
 * @param startDate - Project start date (defaults to today)
 * @returns Complete project timeline
 */
export async function generateTimeline(
  methodology: Methodology,
  grantDeadline?: string,
  startDate?: Date
): Promise<ProjectTimeline> {
  const projectStart = startDate || new Date();

  // Generate base milestones
  const milestones = generateMilestones(methodology, projectStart);

  // Calculate durations
  const recruitmentPeriod = estimateRecruitmentPeriod(methodology.participants);
  const totalDuration = calculateTotalDuration(milestones);

  // Extract specific period durations
  const recruitmentMilestoneIdx = milestones.findIndex(m => m.name.includes('Recruitment Target'));
  const dataCollectionMilestoneIdx = milestones.findIndex(m => m.name.includes('Data Collection'));
  const analysisMilestoneIdx = milestones.findIndex(m => m.name.includes('Analysis Complete'));

  let dataCollectionPeriod = '3-6 months';
  if (dataCollectionMilestoneIdx > 0 && recruitmentMilestoneIdx >= 0) {
    const start = new Date(milestones[recruitmentMilestoneIdx].target_date);
    const end = new Date(milestones[dataCollectionMilestoneIdx].target_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    dataCollectionPeriod = formatDuration(days);
  }

  let analysisPeriod = '1-3 months';
  if (analysisMilestoneIdx > 0 && dataCollectionMilestoneIdx >= 0) {
    const start = new Date(milestones[dataCollectionMilestoneIdx].target_date);
    const end = new Date(milestones[analysisMilestoneIdx].target_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    analysisPeriod = formatDuration(days);
  }

  // Build base timeline
  let timeline: ProjectTimeline = {
    total_duration: totalDuration,
    milestones,
    recruitment_period: recruitmentPeriod,
    data_collection_period: dataCollectionPeriod,
    analysis_period: analysisPeriod,
  };

  // Apply grant deadline alignment if provided
  if (grantDeadline) {
    timeline = alignWithGrantDeadline(timeline, grantDeadline);
  }

  return timeline;
}

/**
 * Validate timeline feasibility
 * Checks if timeline is realistic given constraints
 */
export function validateTimeline(timeline: ProjectTimeline): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check total duration
  const totalDays = parseDuration(timeline.total_duration);
  if (totalDays < 180) {
    warnings.push('Timeline may be too aggressive for a rigorous study (< 6 months total)');
  }
  if (totalDays > 1095) {
    warnings.push('Timeline exceeds 3 years, which may impact funding and team continuity');
  }

  // Check recruitment period
  if (timeline.recruitment_period) {
    const recruitmentDays = parseDuration(timeline.recruitment_period);
    if (recruitmentDays < 60) {
      warnings.push('Recruitment period may be too short (< 2 months)');
    }
  }

  // Check milestone spacing
  for (let i = 1; i < timeline.milestones.length; i++) {
    const prev = new Date(timeline.milestones[i - 1].target_date);
    const curr = new Date(timeline.milestones[i].target_date);
    const days = Math.ceil((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 7) {
      warnings.push(`Milestones ${i} and ${i + 1} are very close together (< 1 week)`);
    }
  }

  // Check grant alignment
  if (timeline.grant_alignment) {
    const deadline = new Date(timeline.grant_alignment.grant_deadline);
    const lastMilestone = new Date(timeline.milestones[timeline.milestones.length - 1].target_date);

    if (lastMilestone > deadline) {
      warnings.push('Project completion date exceeds grant deadline');
    }

    const daysBeforeDeadline = Math.ceil((deadline.getTime() - lastMilestone.getTime()) / (1000 * 60 * 60 * 24));
    if (daysBeforeDeadline < 30) {
      warnings.push('Less than 1 month buffer before grant deadline - consider additional contingency');
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
