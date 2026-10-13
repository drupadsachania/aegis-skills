/** @type {import('jest').Config} */
module.exports = {
  displayName: 'themis-gateway',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: { '^@aegis-skills/themis-core$': '<rootDir>/../themis-core/src/index.ts' },
  transform: {
    '^.+\.ts$': ['@swc/jest', {
      jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
      module: { type: 'commonjs' },
    }],
  },
}
