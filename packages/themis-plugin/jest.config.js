/** @type {import('jest').Config} */
module.exports = {
  displayName: 'themis-plugin',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@aegis-skills/themis-core$': '<rootDir>/../themis-core/src/index.ts',
    '^@aegis-skills/themis-gateway$': '<rootDir>/../themis-gateway/src/index.ts',
  },
  transform: {
    '^.+\.ts$': ['@swc/jest', {
      jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
      module: { type: 'commonjs' },
    }],
  },
}
