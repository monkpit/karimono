export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'jsdom', // Support all test types including display tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'], // Include setup for all tests
  testMatch: [
    '<rootDir>/tests/**/*.test.ts', // Include ALL tests - no exclusions
    '<rootDir>/tests/**/*.spec.ts',
  ],
  maxWorkers: '100%', // Max parallelization for all tests
  testTimeout: 30000, // Extended timeout for display/integration tests
  collectCoverage: true,
  cache: true,
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
