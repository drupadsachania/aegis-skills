/** @type {import('jest').Config} */
module.exports = {
  displayName: 'themis-app',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc/jest', {
      jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
      module: { type: 'commonjs' },
    }],
  },
  // Run against workspace sources so tests never need a prior build.
  moduleNameMapper: {
    '^@aegis-skills/themis-core$': '<rootDir>/../themis-core/src/index.ts',
    '^@aegis-skills/themis-gateway$': '<rootDir>/../themis-gateway/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/helpers/setup.ts'],
}
