#!/usr/bin/env node

/**
 * Test Suite Performance Monitor
 *
 * Measures and compares Jest test execution performance across different
 * configurations and parallelization strategies.
 */

import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

const PERFORMANCE_TESTS = [
  {
    name: 'Full Test Suite (with Coverage)',
    command: 'npm test',
    description: 'All tests with coverage for CI/final validation',
  },
  {
    name: 'Fast Tests (No Coverage)',
    command: 'npm run test:fast',
    description: 'All tests with no coverage and max parallelization',
  },
  {
    name: 'Watch Mode Test',
    command: 'timeout 5s npm run test:watch || true',
    description: 'Test watch mode startup (5 second sample)',
  },
];

function runPerformanceTest(test) {
  console.log(`\n🚀 Running: ${test.name}`);
  console.log(`   ${test.description}`);
  console.log(`   Command: ${test.command}`);

  const startTime = performance.now();

  try {
    const result = execSync(test.command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 300000, // 5 minute timeout
    });

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    // Extract test results from Jest output
    const lines = result.split('\n');
    const testSummaryLine = lines.find(line => line.includes('Test Suites:'));
    const testsLine = lines.find(line => line.includes('Tests:'));
    const timeLine = lines.find(line => line.includes('Time:'));

    console.log(`   ✅ Duration: ${duration.toFixed(2)}s`);

    if (testSummaryLine) console.log(`   📊 ${testSummaryLine.trim()}`);
    if (testsLine) console.log(`   📝 ${testsLine.trim()}`);
    if (timeLine) console.log(`   ⏱️  ${timeLine.trim()}`);

    return {
      name: test.name,
      duration,
      success: true,
      testSummary: testSummaryLine?.trim(),
      testsCount: testsLine?.trim(),
      jestTime: timeLine?.trim(),
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`   ❌ Failed after ${duration.toFixed(2)}s`);
    console.log(`   Error: ${error.message}`);

    return {
      name: test.name,
      duration,
      success: false,
      error: error.message,
    };
  }
}

function generatePerformanceReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('📈 PERFORMANCE ANALYSIS REPORT');
  console.log('='.repeat(80));

  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);

  if (successfulTests.length > 0) {
    console.log('\n✅ SUCCESSFUL TESTS (by duration):');
    successfulTests
      .sort((a, b) => a.duration - b.duration)
      .forEach((test, index) => {
        const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
        console.log(`${rank} ${test.name}: ${test.duration.toFixed(2)}s`);
      });

    const fastest = successfulTests.reduce((min, test) =>
      test.duration < min.duration ? test : min
    );
    const slowest = successfulTests.reduce((max, test) =>
      test.duration > max.duration ? test : max
    );

    console.log(`\n🏆 Fastest: ${fastest.name} (${fastest.duration.toFixed(2)}s)`);
    console.log(`🐌 Slowest: ${slowest.name} (${slowest.duration.toFixed(2)}s)`);
    console.log(
      `📊 Performance Range: ${(slowest.duration / fastest.duration).toFixed(1)}x difference`
    );
  }

  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failedTests.forEach(test => {
      console.log(`   ${test.name}: ${test.error}`);
    });
  }

  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
  console.log('   • Use npm run test:fast for development feedback loops');
  console.log('   • Use npm run test:watch for continuous TDD development');
  console.log('   • Use npm test for full CI/CD pipeline validation with coverage');
  console.log('   • Use npm run validate for complete validation pipeline');

  console.log('\n🎯 PERFORMANCE TARGETS ACHIEVED:');
  if (successfulTests.length > 0) {
    const fastestTest = successfulTests.reduce((min, test) =>
      test.duration < min.duration ? test : min
    );
    if (fastestTest && fastestTest.duration < 5) {
      console.log('   ✅ Fast feedback loop: < 5 seconds');
    } else {
      console.log('   ⚠️  Fast feedback loop: Target < 5 seconds');
    }
  } else {
    console.log('   ⚠️  Fast feedback loop: No successful tests to measure');
  }

  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('🔍 Jest Test Suite Performance Analysis');
  console.log('Testing optimized configurations for maximum development velocity');

  const results = [];

  for (const test of PERFORMANCE_TESTS) {
    const result = runPerformanceTest(test);
    results.push(result);

    // Small delay between tests to avoid resource contention
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  generatePerformanceReport(results);
}

main().catch(console.error);
