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
  testEnvironment: 'jsdom', // Only for tests that actually need DOM
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts', // Include ALL tests
    '<rootDir>/tests/**/*.spec.ts',
  ],
  maxWorkers: '75%', // Optimized parallelization for all tests
  testTimeout: 120000, // 2 minutes for integration tests
  collectCoverage: false, // Speed up integration tests
  cache: true,
};
