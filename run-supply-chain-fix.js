#!/usr/bin/env node
/**
 * Supply chain fix runner
 * Executes the remaining npm commands needed to complete M2/M3/M4 fixes
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
console.log('Supply Chain Fix Runner');
console.log('======================\n');

try {
  // Step 1: Verify changes are in place
  console.log('1. Verifying code changes...');

  const parserContent = fs.readFileSync(path.join(projectRoot, 'src/parser.js'), 'utf8');
  if (!parserContent.includes('javascript: () => { throw new Error')) {
    console.error('ERROR: parser.js not properly updated with engine locking');
    process.exit(1);
  }
  console.log('   ✓ src/parser.js has gray-matter engine lock\n');

  const pkgJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  if (pkgJson.dependencies['js-yaml']) {
    console.error('ERROR: js-yaml still in package.json dependencies');
    process.exit(1);
  }
  console.log('   ✓ js-yaml removed from package.json\n');

  if (!fs.existsSync(path.join(projectRoot, '.npmrc'))) {
    console.error('ERROR: .npmrc file not found');
    process.exit(1);
  }
  const npmrcContent = fs.readFileSync(path.join(projectRoot, '.npmrc'), 'utf8');
  if (!npmrcContent.includes('save-exact=true')) {
    console.error('ERROR: .npmrc does not have save-exact=true');
    process.exit(1);
  }
  console.log('   ✓ .npmrc created with save-exact=true\n');

  // Step 2: Run npm uninstall to update lock file
  console.log('2. Removing js-yaml from node_modules and package-lock.json...');
  execSync('npm uninstall js-yaml', { cwd: projectRoot, stdio: 'inherit' });
  console.log('   ✓ npm uninstall completed\n');

  // Step 3: Run npm audit
  console.log('3. Running npm audit...');
  try {
    execSync('npm audit --audit-level=high', { cwd: projectRoot, stdio: 'inherit' });
    console.log('   ✓ npm audit passed\n');
  } catch (e) {
    console.log('   ⚠ npm audit found issues (see above)\n');
  }

  // Step 4: Run tests
  console.log('4. Running tests...');
  execSync('npm test', { cwd: projectRoot, stdio: 'inherit' });
  console.log('   ✓ npm test passed\n');

  // Step 5: Git commit
  console.log('5. Committing changes...');
  execSync('git add src/parser.js .npmrc package.json package-lock.json', { cwd: projectRoot, stdio: 'inherit' });
  execSync('git commit -m "fix: remove dead js-yaml dep, lock gray-matter to yaml engine, add .npmrc save-exact (M2/M3/M4)"', { cwd: projectRoot, stdio: 'inherit' });
  console.log('   ✓ Changes committed\n');

  console.log('Supply chain fixes completed successfully!');
  console.log('======================');

} catch (error) {
  console.error('\nERROR:', error.message);
  process.exit(1);
}
