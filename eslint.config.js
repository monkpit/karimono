import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default tseslint.config(
  {
    ignores: [
      'dist/',
      'node_modules/',
      '**/*.d.ts',
      'coverage/',
      '.vite/',
      '.cache/',
      'build/',
      '*.config.js',
      '*.config.ts',
      'tests/resources/',
      'tmp/',
      // Generated CPU instruction files - these are copy/paste source material
      'src/emulator/cpu/generated/**/*.ts',
      '!src/emulator/cpu/generated/index.ts',
      '!src/emulator/cpu/generated/CPUIntegrationGuide.ts',
    ],
  },
  eslint.configs.recommended,
  prettierRecommended,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-console': 'error',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs.strict.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
    },
  },
  {
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}', 'tests/setup.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // CRITICAL: Block console statements in test files to prevent debug statements
      'no-console': 'error',
      'no-unused-vars': 'off',
      // Block undocumented test skips
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.property.name='skip'][arguments.0.type!='TemplateLiteral'][arguments.length<2]",
          message:
            'Test skips must include documentation. Use describe.skip or it.skip with a descriptive comment explaining why the test is disabled and what needs to be done to re-enable it.',
        },
        {
          selector:
            "MemberExpression[property.name='skip'] + CallExpression:not(:has(Literal:matches(/.*TODO.*|.*FIXME.*|.*because.*|.*waiting.*|.*blocked.*|.*pending.*/i)))",
          message:
            'Test skips must include documentation explaining the reason and what needs to be done.',
        },
      ],
    },
  },
  {
    files: ['scripts/test-performance.js', 'scripts/quality-gates.js'],
    rules: {
      'no-console': 'off', // Allow console statements in monitoring and quality gate scripts
      'no-undef': 'off', // Allow undefined variables for variable scope in scripts
    },
  }
);
