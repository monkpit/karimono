#!/usr/bin/env node

/**
 * Coverage Analysis Script for Game Boy Emulator
 *
 * Analyzes Jest coverage reports to identify critical gaps in hardware component testing.
 * Focuses on CPU instruction coverage, PPU timing accuracy, and memory management validation.
 */

import fs from 'fs';
import path from 'path';

const COVERAGE_DIR = './coverage';
const COVERAGE_JSON = path.join(COVERAGE_DIR, 'coverage.json');

// Component priority levels for coverage analysis
const COMPONENT_PRIORITIES = {
  cpu: { priority: 'CRITICAL', minCoverage: 95, description: 'CPU instruction accuracy' },
  memory: { priority: 'CRITICAL', minCoverage: 95, description: 'Memory management' },
  ppu: { priority: 'CRITICAL', minCoverage: 95, description: 'PPU timing and rendering' },
  apu: { priority: 'HIGH', minCoverage: 90, description: 'Audio processing' },
  cartridge: { priority: 'HIGH', minCoverage: 90, description: 'Cartridge/MBC handling' },
  emulator: { priority: 'HIGH', minCoverage: 90, description: 'Core emulator loop' },
  utils: { priority: 'MEDIUM', minCoverage: 85, description: 'Utility functions' },
  helpers: { priority: 'MEDIUM', minCoverage: 85, description: 'Helper functions' },
  ui: { priority: 'LOW', minCoverage: 75, description: 'User interface' },
  components: { priority: 'LOW', minCoverage: 75, description: 'UI components' },
  config: { priority: 'LOW', minCoverage: 70, description: 'Configuration' },
};

function analyzeComponentCoverage(coverageData) {
  const analysis = {
    critical: [],
    warnings: [],
    recommendations: [],
    summary: {},
  };

  Object.entries(coverageData).forEach(([filePath, fileData]) => {
    const component = identifyComponent(filePath);
    const coverage = calculateCoverage(fileData);

    if (component && COMPONENT_PRIORITIES[component]) {
      const config = COMPONENT_PRIORITIES[component];

      analysis.summary[component] = analysis.summary[component] || {
        files: 0,
        totalCoverage: 0,
        priority: config.priority,
        description: config.description,
        minRequired: config.minCoverage,
      };

      analysis.summary[component].files++;
      analysis.summary[component].totalCoverage += coverage.average;

      if (coverage.average < config.minCoverage) {
        const issue = {
          file: filePath,
          component,
          coverage: coverage.average,
          required: config.minCoverage,
          priority: config.priority,
          gaps: identifyGaps(fileData),
        };

        if (config.priority === 'CRITICAL') {
          analysis.critical.push(issue);
        } else {
          analysis.warnings.push(issue);
        }
      }
    }
  });

  // Calculate averages
  Object.keys(analysis.summary).forEach(component => {
    const summary = analysis.summary[component];
    summary.averageCoverage = summary.totalCoverage / summary.files;
  });

  // Generate recommendations
  analysis.recommendations = generateRecommendations(analysis);

  return analysis;
}

function identifyComponent(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

  for (const [component] of Object.entries(COMPONENT_PRIORITIES)) {
    if (normalizedPath.includes(`/${component}/`) || normalizedPath.includes(`${component}.`)) {
      return component;
    }
  }

  return null;
}

function calculateCoverage(fileData) {
  const { s: statements, b: branches, f: functions, l: lines } = fileData;

  const metrics = {
    statements: calculateMetric(statements),
    branches: calculateMetric(branches),
    functions: calculateMetric(functions),
    lines: calculateMetric(lines),
  };

  metrics.average = (metrics.statements + metrics.branches + metrics.functions + metrics.lines) / 4;

  return metrics;
}

function calculateMetric(data) {
  if (!data || Object.keys(data).length === 0) return 100;

  const total = Object.keys(data).length;
  const covered = Object.values(data).filter(count => count > 0).length;

  return (covered / total) * 100;
}

function identifyGaps(fileData) {
  const gaps = [];

  // Identify uncovered statements that might be critical for hardware accuracy
  const uncoveredStatements = Object.entries(fileData.s || {})
    .filter(([, count]) => count === 0)
    .map(([line]) => parseInt(line));

  const uncoveredBranches = Object.entries(fileData.b || {})
    .filter(([, branches]) => branches.some(count => count === 0))
    .map(([line]) => parseInt(line));

  if (uncoveredStatements.length > 0) {
    gaps.push({
      type: 'statements',
      count: uncoveredStatements.length,
      lines: uncoveredStatements.slice(0, 10), // Limit to first 10 for readability
    });
  }

  if (uncoveredBranches.length > 0) {
    gaps.push({
      type: 'branches',
      count: uncoveredBranches.length,
      lines: uncoveredBranches.slice(0, 10),
    });
  }

  return gaps;
}

function generateRecommendations(analysis) {
  const recommendations = [];

  // Critical component recommendations
  if (analysis.critical.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      message: `${analysis.critical.length} critical hardware components have insufficient coverage`,
      action: 'Write comprehensive tests for CPU instructions, memory operations, and PPU timing',
      components: analysis.critical.map(c => c.component),
    });
  }

  // TDD workflow recommendations
  const lowCoverageComponents = [...analysis.critical, ...analysis.warnings].filter(
    issue => issue.coverage < 50
  );

  if (lowCoverageComponents.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      message: 'Some components have very low coverage, indicating possible TDD gaps',
      action: 'Follow strict TDD: write failing test first, implement to pass, refactor',
      components: lowCoverageComponents.map(c => c.component),
    });
  }

  // Hardware accuracy recommendations
  const cpuIssues = analysis.critical.filter(issue => issue.component === 'cpu');
  if (cpuIssues.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      message: 'CPU instruction coverage is below 95% - hardware accuracy at risk',
      action: 'Use Blargg test ROMs to validate all CPU instructions and edge cases',
      testRoms: ['cpu_instrs.gb', 'instr_timing.gb'],
    });
  }

  return recommendations;
}

function generateReport(analysis) {
  const output = [];

  output.push('\n🎮 Game Boy Emulator Coverage Analysis');
  output.push('=====================================\n');

  // Critical issues
  if (analysis.critical.length > 0) {
    output.push('🚨 CRITICAL COVERAGE ISSUES:');
    analysis.critical.forEach(issue => {
      output.push(`  ❌ ${issue.component.toUpperCase()} (${issue.file})`);
      output.push(`     Coverage: ${issue.coverage.toFixed(1)}% (Required: ${issue.required}%)`);
      output.push(`     Priority: ${issue.priority} - Hardware accuracy risk\n`);
    });
  }

  // Component summary
  output.push('📊 COMPONENT COVERAGE SUMMARY:');
  Object.entries(analysis.summary)
    .sort((a, b) => {
      const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      return priorityOrder.indexOf(a[1].priority) - priorityOrder.indexOf(b[1].priority);
    })
    .forEach(([component, summary]) => {
      const status = summary.averageCoverage >= summary.minRequired ? '✅' : '❌';
      const priority = summary.priority.padEnd(8);
      output.push(
        `  ${status} ${component.toUpperCase().padEnd(12)} ${priority} ${summary.averageCoverage.toFixed(1)}% (${summary.files} files)`
      );
    });

  // Recommendations
  if (analysis.recommendations.length > 0) {
    output.push('\n🎯 RECOMMENDATIONS:');
    analysis.recommendations.forEach((rec, index) => {
      output.push(`  ${index + 1}. [${rec.priority}] ${rec.message}`);
      output.push(`     Action: ${rec.action}`);
      if (rec.components) {
        output.push(`     Components: ${rec.components.join(', ')}`);
      }
      if (rec.testRoms) {
        output.push(`     Test ROMs: ${rec.testRoms.join(', ')}`);
      }
      output.push('');
    });
  }

  // TDD workflow guidance
  output.push('🔄 TDD WORKFLOW REMINDER:');
  output.push('  1. Write failing test for hardware behavior');
  output.push('  2. Implement minimal code to pass test');
  output.push('  3. Refactor with passing tests');
  output.push('  4. Validate against real hardware test ROMs');
  output.push('  5. Never fake data or test implementation details\n');

  const report = output.join('\n');
  process.stdout.write(report);
  return report;
}

// Main execution
if (process.argv[1] === new URL(import.meta.url).pathname) {
  try {
    if (!fs.existsSync(COVERAGE_JSON)) {
      process.stderr.write('❌ Coverage data not found. Run "npm run test:coverage" first.\n');
      process.exit(1);
    }

    const coverageData = JSON.parse(fs.readFileSync(COVERAGE_JSON, 'utf8'));
    const analysis = analyzeComponentCoverage(coverageData);
    generateReport(analysis);

    // Exit with error code if critical issues exist
    if (analysis.critical.length > 0) {
      process.stdout.write('💥 Critical coverage issues detected. Pipeline should fail.\n');
      process.exit(1);
    }

    process.stdout.write(
      '✅ Coverage analysis complete. Hardware accuracy standards maintained.\n'
    );
  } catch (error) {
    process.stderr.write(`❌ Coverage analysis failed: ${error.message}\n`);
    process.exit(1);
  }
}

export { analyzeComponentCoverage, generateReport };
