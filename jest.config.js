/**
 * Jest Configuration - Smart Test Suite Delegation
 *
 * This configuration provides optimized test execution through intelligent
 * delegation to specialized configs based on test type and performance requirements.
 *
 * Performance Strategy:
 * - Unit tests: Fast execution with minimal overhead (node environment)
 * - Integration tests: Blargg ROMs with parallel execution and extended timeouts
 * - Full coverage: Comprehensive analysis with all test types
 */

// Determine test type based on CLI patterns and environment
const getTestType = () => {
  const args = process.argv.join(' ');

  // Check for local development patterns - exclude comprehensive and infrastructure tests
  if (process.env.JEST_LOCAL_DEV === 'true' || (!process.env.CI && !args.includes('--ci'))) {
    return 'local';
  }

  // Check for CI comprehensive patterns
  if (process.env.CI === 'true' || args.includes('--ci')) {
    return 'ci';
  }

  // Check for unit-specific patterns
  if (
    args.includes('--testPathPatterns=cpu') ||
    args.includes('--testPathPatterns=mmu') ||
    args.includes('--testPathPatterns=ppu') ||
    args.includes('unit/') ||
    process.env.JEST_UNIT_ONLY === 'true'
  ) {
    return 'unit';
  }

  // Check for integration-specific patterns
  if (
    args.includes('blargg') ||
    args.includes('integration') ||
    process.env.JEST_INTEGRATION_ONLY === 'true'
  ) {
    return 'integration';
  }

  // Default to full suite
  return 'full';
};

const testType = getTestType();

// Base configuration for all test types
const baseConfig = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  cacheDirectory: '.jestcache',
  cache: true,
  resetMocks: true,
  resetModules: true,
  restoreMocks: true,
  errorOnDeprecated: true,
  reporters: ['default'],
};

// Local development optimizations - EXCLUDES expensive comprehensive and infrastructure tests
const localConfig = {
  ...baseConfig,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.spec.ts'],
  testPathIgnorePatterns: [
    // OPTIMIZATION: Exclude expensive tests from local development
    '<rootDir>/tests/emulator/integration/blargg-comprehensive.test.ts', // ~26s - CI only
    '<rootDir>/tests/emulator/integration/BlarggTestRunner.integration.test.ts', // ~90s - remove entirely
  ],
  maxWorkers: '100%', // Max parallelization for fast feedback
  testTimeout: 15000, // Fast timeout for local development
  collectCoverage: false, // Skip coverage for speed
};

// CI comprehensive configuration - INCLUDES all tests for full validation
const ciConfig = {
  ...baseConfig,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.spec.ts'],
  testPathIgnorePatterns: [
    // REMOVE: Infrastructure test - redundant with comprehensive test
    '<rootDir>/tests/emulator/integration/BlarggTestRunner.integration.test.ts',
  ],
  maxWorkers: '75%', // Balanced for CI resources
  testTimeout: 180000, // Extended for comprehensive Blargg test
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json', 'json-summary'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};

// Unit test optimizations - INCLUDES ALL TESTS
const unitConfig = {
  ...baseConfig,
  testEnvironment: 'jsdom', // Required for all tests due to setup.ts document access
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'], // Include setup for all tests
  testMatch: [
    // Include ALL tests - no exclusions for performance optimization
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts',
  ],
  maxWorkers: '100%', // Max parallelization
  testTimeout: 30000, // Increased for display tests that need DOM setup
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'json'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};

// Integration test optimizations - INCLUDES ALL TESTS
const integrationConfig = {
  ...baseConfig,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    // Include ALL tests - optimized for Blargg ROM execution
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts',
  ],
  maxWorkers: '75%', // Optimized for resource-intensive tests
  testTimeout: 120000, // Extended timeout for Blargg ROMs
  collectCoverage: false, // Speed up integration tests
};

// Full suite configuration (default)
const fullConfig = {
  ...baseConfig,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/vite-env.d.ts',
    '!src/performance-poc/**/*.ts',
    '!src/demo/**/*.ts',
    '!src/**/types.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text-summary',
    'text',
    'lcov',
    'html',
    'json-summary',
    ['text', { file: 'coverage.txt' }],
    ['json', { file: 'coverage.json' }],
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}', '<rootDir>/tests/**/*.spec.{ts,tsx}'],
  // Exclude comprehensive Blargg test from local development for speed
  testPathIgnorePatterns: process.env.CI
    ? []
    : ['<rootDir>/tests/emulator/integration/blargg-comprehensive.test.ts'],
  maxWorkers: '75%', // Increased from 50% for better performance
  testTimeout: 180000, // 3 minutes for full suite including Blargg comprehensive ROM
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/src/emulator/cpu/generated/.*\\.ts$',
    '\\.d\\.ts$',
    '/src/.*\\.constants\\.ts$',
    '/src/.*\\.types\\.ts$',
  ],
  collectCoverage: true,
  coverageProvider: 'babel',
  verbose: false,
  silent: false,
  // Performance optimizations
  workerThreads: true, // Use worker threads instead of child processes
  maxConcurrency: 10, // Allow more concurrent test.concurrent tests
  detectOpenHandles: true,
};

// Export appropriate configuration based on test type
const configs = {
  local: localConfig,
  ci: ciConfig,
  unit: unitConfig,
  integration: integrationConfig,
  full: fullConfig,
};

const selectedConfig = configs[testType];

// Log configuration selection for debugging
if (process.env.JEST_DEBUG_CONFIG === 'true' || !process.env.CI) {
  console.log(`\n🔧 Jest Config: Using '${testType}' configuration`);
  console.log(`   Workers: ${selectedConfig.maxWorkers}`);
  console.log(`   Environment: ${selectedConfig.testEnvironment}`);
  console.log(`   Timeout: ${selectedConfig.testTimeout}ms`);
  console.log(`   Coverage: ${selectedConfig.collectCoverage || false}`);
  if (selectedConfig.testPathIgnorePatterns?.length) {
    console.log(`   Excluded: ${selectedConfig.testPathIgnorePatterns.length} test files`);
  }
  console.log();
}

export default selectedConfig;
