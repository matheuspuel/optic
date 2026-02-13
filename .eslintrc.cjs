module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:@typescript-eslint/strict',
  ],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: [
    '/.vscode/*',
    '/coverage/*',
    '/dist/*',
    '/experiments/*',
    '/node_modules/*',
    '.eslintrc.cjs',
    '.eslintrc.production.cjs',
  ],
  rules: {
    // already checked by typescript
    '@typescript-eslint/no-redeclare': 'off',
    // allow namespace declaration for types
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    // allow explicit unused variables
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    // warn instead of error to prevent covering more specific errors
    '@typescript-eslint/no-unsafe-call': 'warn',
    // allow non null assertion to overcome typing limitations
    '@typescript-eslint/no-non-null-assertion': 'off',
    // allow use of "any" to overcome typing limitations
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
  },
}
