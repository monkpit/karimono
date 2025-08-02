export default {
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
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/vite-env.d.ts',
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
    // NOTE: Component-specific thresholds commented out until directories are created
    // Uncomment as emulator components are implemented

    // Core emulator components - CRITICAL hardware accuracy requirements (95%)
    // './src/cpu/**/*.ts': {
    //   branches: 95,
    //   functions: 95,
    //   lines: 95,
    //   statements: 95,
    // },
    // './src/memory/**/*.ts': {
    //   branches: 95,
    //   functions: 95,
    //   lines: 95,
    //   statements: 95,
    // },
    // './src/ppu/**/*.ts': {
    //   branches: 95,
    //   functions: 95,
    //   lines: 95,
    //   statements: 95,
    // },

    // Important emulator components (90%)
    // './src/apu/**/*.ts': {
    //   branches: 90,
    //   functions: 90,
    //   lines: 90,
    //   statements: 90,
    // },
    // './src/cartridge/**/*.ts': {
    //   branches: 90,
    //   functions: 90,
    //   lines: 90,
    //   statements: 90,
    // },
    // './src/emulator/**/*.ts': {
    //   branches: 90,
    //   functions: 90,
    //   lines: 90,
    //   statements: 90,
    // },

    // Frontend/UI components (75%)
    // './src/ui/**/*.ts': {
    //   branches: 75,
    //   functions: 75,
    //   lines: 75,
    //   statements: 75,
    // },
    // './src/components/**/*.ts': {
    //   branches: 75,
    //   functions: 75,
    //   lines: 75,
    //   statements: 75,
    // },

    // Utility and helper functions (85%)
    // './src/utils/**/*.ts': {
    //   branches: 85,
    //   functions: 85,
    //   lines: 85,
    //   statements: 85,
    // },
    // './src/helpers/**/*.ts': {
    //   branches: 85,
    //   functions: 85,
    //   lines: 85,
    //   statements: 85,
    // },

    // Configuration files (70%)
    // './src/config/**/*.ts': {
    //   branches: 70,
    //   functions: 70,
    //   lines: 70,
    //   statements: 70,
    // },
  },
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}', '<rootDir>/tests/**/*.spec.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  cacheDirectory: '.jestcache',
  maxWorkers: '50%',
  testTimeout: 10000,
  // Enhanced coverage and debugging options for hardware emulation
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '\\.d\\.ts$',
    // Ignore generated files and constants that don't need coverage
    '/src/.*\\.constants\\.ts$',
    '/src/.*\\.types\\.ts$',
  ],
  // Collect coverage from all source files for comprehensive reporting
  collectCoverage: true, // Always collect coverage for TDD workflow
  coverageProvider: 'v8', // Faster and more accurate than babel
  // Support for debugging hardware timing and state
  verbose: false, // Controlled by CLI flag to avoid noise in TDD workflow
  silent: false,
  // Fail fast for TDD workflow - stop on first test failure
  bail: 1,
  // Enhanced error reporting for hardware emulation debugging
  errorOnDeprecated: true,
  // Memory management for large test suites with ROM data
  detectOpenHandles: true,
  detectLeaks: true, // Critical for hardware accuracy - detect memory leaks
  // Support for test result caching across TDD cycles
  cache: true,
};
