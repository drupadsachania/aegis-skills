// Root passthrough: `npx jest` / `npm test` at the repo root runs every workspace's
// Jest project. Later phases append their packages (e.g. '<rootDir>/packages/themis-core').
module.exports = {
  projects: ['<rootDir>/apps/web', '<rootDir>/packages/aegis', '<rootDir>/scripts']
}
