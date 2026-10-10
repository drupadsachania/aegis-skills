const nextJest = require('next/jest')

// __dirname, not './': the root jest.config.js runs this project with cwd = repo root.
const createJestConfig = nextJest({ dir: __dirname })

module.exports = createJestConfig({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  moduleNameMapper: {
    '^@aegis-skills/themis-core$': '<rootDir>/../../packages/themis-core/src/index.ts',
    '^@aegis-skills/themis-gateway$': '<rootDir>/../../packages/themis-gateway/src/index.ts',
    '^@/(.*)$': '<rootDir>/$1'
  }
})
