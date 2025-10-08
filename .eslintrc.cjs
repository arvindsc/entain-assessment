module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',

    // Vue specific rules
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-vars': 'error',
    'vue/no-multiple-template-root': 'off',
    'vue/require-default-prop': 'off', // Too strict for composition API
    'vue/require-prop-types': 'error',
    'vue/no-v-html': 'warn',
    'vue/valid-v-slot': 'error',
    'vue/singleline-html-element-content-newline': 'off', // Too strict for simple elements

    // General JavaScript rules
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': 'off', // Handled by TypeScript
    'no-undef': 'off', // Handled by TypeScript
    'prefer-const': 'error',
    'no-var': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',

    // Code quality rules
    eqeqeq: ['error', 'always'],
    curly: ['error', 'all'],
    'brace-style': ['error', '1tbs'],
    'comma-dangle': ['error', 'always-multiline'],
    semi: ['error', 'always'],
    quotes: ['error', 'single', { avoidEscape: true }],
    'prefer-template': 'error',
    'template-curly-spacing': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],

    // Security rules
    'no-alert': 'error',
    'no-script-url': 'error',

    // Performance rules
    'no-loop-func': 'error',
    'no-new-object': 'error',
    'no-new-wrappers': 'error',
    'no-array-constructor': 'error',

    // Accessibility rules
    'jsx-a11y/alt-text': 'off', // Handled by Vue
    'jsx-a11y/anchor-has-content': 'off', // Handled by Vue
  },
  overrides: [
    {
      files: ['*.js', '*.cjs', '*.mjs', 'vite.config.ts', 'vitest.config.ts'],
      parserOptions: {
        project: null,
      },
      rules: {
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/await-thenable': 'off',
      },
    },
    {
      files: ['**/*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        extraFileExtensions: ['.vue'],
      },
      extends: [
        'plugin:vue/vue3-essential',
        'plugin:vue/vue3-strongly-recommended',
        'plugin:vue/vue3-recommended',
      ],
      rules: {
        'vue/html-self-closing': [
          'error',
          {
            html: {
              void: 'always',
              normal: 'always',
              component: 'always',
            },
            svg: 'always',
            math: 'always',
          },
        ],
        'vue/max-attributes-per-line': [
          'error',
          {
            singleline: { max: 3 },
            multiline: { max: 1 },
          },
        ],
        'vue/html-indent': ['error', 2],
        'vue/script-indent': ['error', 2],
        'vue/singleline-html-element-content-newline': 'off',
      },
    },
    {
      files: [
        '**/*.test.js',
        '**/*.test.ts',
        '**/*.spec.js',
        '**/*.spec.ts',
        '**/test/**/*.ts',
        '**/test/**/*.js',
      ],
      parserOptions: {
        project: null,
      },
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off', // Allow any types in test mocks
        '@typescript-eslint/no-non-null-assertion': 'off', // Allow non-null assertions in tests
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/await-thenable': 'off',
      },
    },
    {
      files: ['**/utils/logger.ts'],
      rules: {
        'no-console': 'off', // Allow console statements in logger utility
        '@typescript-eslint/no-explicit-any': 'off', // Allow any types in logger for flexibility
      },
    },
    {
      files: ['env.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow any types in Vue type declarations
      },
    },
    {
      files: ['**/*.example.ts'],
      parserOptions: {
        project: null,
      },
      rules: {
        'no-console': 'off', // Allow console statements in examples
        '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in examples
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/await-thenable': 'off',
      },
    },
  ],
};
