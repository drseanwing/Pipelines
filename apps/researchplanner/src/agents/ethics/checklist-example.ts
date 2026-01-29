/**
 * Checklist Generation Examples
 * Demonstrates usage of the governance checklist module
 */

import {
  generateGovernanceChecklist,
  getChecklistStats,
  getNextActionableItems,
} from './checklist.js';
import { EthicsPathwayType, RiskLevel } from '../../types/ethics.js';

/**
 * Example 1: QI Project at Mater
 * Retrospective audit, de-identified data, minimal governance
 */
export function example1_QI_Project() {
  console.log('\n=== Example 1: QI Project at Mater ===\n');

  const checklist = generateGovernanceChecklist(
    EthicsPathwayType.QI_REGISTRATION,
    'RETROSPECTIVE_AUDIT',
    'MN',
    RiskLevel.NEGLIGIBLE,
    ['DE_IDENTIFIED']
  );

  console.log(`Generated ${checklist.length} checklist items:`);
  checklist.forEach((item, idx) => {
    console.log(`\n${idx + 1}. ${item.item}`);
    console.log(`   Source: ${item.requirement_source}`);
    console.log(`   Status: ${item.status}`);
    if (item.dependencies && item.dependencies.length > 0) {
      console.log(`   Dependencies: ${item.dependencies.join(', ')}`);
    }
    if (item.notes) {
      console.log(`   Notes: ${item.notes}`);
    }
  });

  const stats = getChecklistStats(checklist);
  console.log('\n--- Progress Stats ---');
  console.log(`Total: ${stats.total}`);
  console.log(`Complete: ${stats.complete} (${stats.percentComplete}%)`);

  const nextSteps = getNextActionableItems(checklist);
  console.log('\n--- Next Actionable Items ---');
  nextSteps.slice(0, 3).forEach(item => {
    console.log(`- ${item.item}`);
  });
}

/**
 * Example 2: Low-Risk Research at Queensland Health
 * Survey, identifiable data, full governance requirements
 */
export function example2_LowRisk_Research_QH() {
  console.log('\n=== Example 2: Low-Risk Research at Queensland Health ===\n');

  const checklist = generateGovernanceChecklist(
    EthicsPathwayType.LOW_RISK_RESEARCH,
    'SURVEY',
    'QH',
    RiskLevel.LOW,
    ['IDENTIFIABLE']
  );

  console.log(`Generated ${checklist.length} checklist items:`);

  // Group by requirement source
  const grouped = checklist.reduce((acc, item) => {
    if (!acc[item.requirement_source]) {
      acc[item.requirement_source] = [];
    }
    acc[item.requirement_source].push(item);
    return acc;
  }, {} as Record<string, typeof checklist>);

  Object.entries(grouped).forEach(([source, items]) => {
    console.log(`\n--- ${source} (${items.length} items) ---`);
    items.forEach(item => {
      console.log(`  • ${item.item}`);
    });
  });

  const stats = getChecklistStats(checklist);
  console.log('\n--- Progress Stats ---');
  console.log(`Total requirements: ${stats.total}`);
}

/**
 * Example 3: Clinical Trial (High Risk)
 * Interventional study, full HREC review, comprehensive governance
 */
export function example3_Clinical_Trial() {
  console.log('\n=== Example 3: Clinical Trial (High Risk) ===\n');

  const checklist = generateGovernanceChecklist(
    EthicsPathwayType.FULL_HREC_REVIEW,
    'CLINICAL_TRIAL',
    'QH',
    RiskLevel.HIGH,
    ['IDENTIFIABLE']
  );

  console.log(`Generated ${checklist.length} checklist items:`);

  // Show dependency chains
  console.log('\n--- Key Dependency Chains ---');

  const riskAssessment = checklist.find(i => i.item.includes('Risk Assessment'));
  if (riskAssessment) {
    console.log(`\n1. ${riskAssessment.item}`);
    const dependents = checklist.filter(i =>
      i.dependencies?.includes(riskAssessment.item)
    );
    dependents.forEach(dep => {
      console.log(`   → ${dep.item}`);
    });
  }

  // Highlight critical items
  console.log('\n--- Critical Items for High-Risk Research ---');
  const criticalKeywords = ['insurance', 'safety monitoring', 'adverse event'];
  const critical = checklist.filter(item =>
    criticalKeywords.some(keyword =>
      item.item.toLowerCase().includes(keyword)
    )
  );

  critical.forEach(item => {
    console.log(`\n• ${item.item}`);
    console.log(`  Source: ${item.requirement_source}`);
    console.log(`  Notes: ${item.notes}`);
  });
}

/**
 * Example 4: Progress Tracking
 * Demonstrates status updates and next steps identification
 */
export function example4_Progress_Tracking() {
  console.log('\n=== Example 4: Progress Tracking ===\n');

  const checklist = generateGovernanceChecklist(
    EthicsPathwayType.LOW_RISK_RESEARCH,
    'SURVEY',
    'MN',
    RiskLevel.LOW,
    ['RE_IDENTIFIABLE']
  );

  console.log('Initial Status:');
  let stats = getChecklistStats(checklist);
  console.log(`${stats.complete}/${stats.total} complete (${stats.percentComplete}%)`);

  // Simulate completing first few items
  console.log('\n--- Simulating Progress ---');

  // Complete risk assessment
  const riskItem = checklist.find(i => i.item.includes('Risk Assessment'));
  if (riskItem) {
    riskItem.status = 'COMPLETE';
    console.log(`✓ Completed: ${riskItem.item}`);
  }

  // Start ethics application
  const ethicsApp = checklist.find(i => i.item.includes('ethics application'));
  if (ethicsApp) {
    ethicsApp.status = 'IN_PROGRESS';
    ethicsApp.assigned_to = 'Dr. Smith';
    ethicsApp.due_date = '2026-02-15';
    console.log(`▸ Started: ${ethicsApp.item}`);
    console.log(`  Assigned to: ${ethicsApp.assigned_to}`);
    console.log(`  Due: ${ethicsApp.due_date}`);
  }

  // Complete protocol
  const protocol = checklist.find(i => i.item.includes('protocol'));
  if (protocol) {
    protocol.status = 'COMPLETE';
    console.log(`✓ Completed: ${protocol.item}`);
  }

  console.log('\n--- Updated Status ---');
  stats = getChecklistStats(checklist);
  console.log(`${stats.complete}/${stats.total} complete (${stats.percentComplete}%)`);
  console.log(`In Progress: ${stats.inProgress}`);
  console.log(`Not Started: ${stats.notStarted}`);

  console.log('\n--- Next Actionable Items ---');
  const nextSteps = getNextActionableItems(checklist);
  console.log(`You can now work on ${nextSteps.length} items:\n`);
  nextSteps.slice(0, 5).forEach(item => {
    console.log(`• ${item.item}`);
    if (item.dependencies && item.dependencies.length > 0) {
      console.log(`  (Dependencies met: ${item.dependencies.join(', ')})`);
    }
  });
}

/**
 * Example 5: Multi-Institution Comparison
 * Show how requirements differ by institution
 */
export function example5_Institution_Comparison() {
  console.log('\n=== Example 5: Institution Comparison ===\n');

  const institutions = ['MN', 'QH'] as const;
  const results: Record<string, number> = {};

  institutions.forEach(institution => {
    const checklist = generateGovernanceChecklist(
      EthicsPathwayType.LOW_RISK_RESEARCH,
      'SURVEY',
      institution,
      RiskLevel.LOW,
      ['IDENTIFIABLE']
    );

    results[institution] = checklist.length;

    console.log(`\n${institution}: ${checklist.length} requirements`);

    // Show institution-specific items
    const specific = checklist.filter(i =>
      i.requirement_source.includes(institution)
    );
    console.log(`  Institution-specific: ${specific.length} items`);
    specific.forEach(item => {
      console.log(`    • ${item.item}`);
    });
  });

  console.log('\n--- Summary ---');
  Object.entries(results).forEach(([inst, count]) => {
    console.log(`${inst}: ${count} total requirements`);
  });
}

/**
 * Run all examples
 */
export function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Governance Checklist Generation - Examples          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  example1_QI_Project();
  example2_LowRisk_Research_QH();
  example3_Clinical_Trial();
  example4_Progress_Tracking();
  example5_Institution_Comparison();

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║   Examples Complete                                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}
