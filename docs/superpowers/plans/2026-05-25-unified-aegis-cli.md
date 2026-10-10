# Unified Aegis Skills Installation System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragmented per-tool skill installations with a unified global package that auto-detects tools and configures all of them at once.

**Architecture:** Single `@aegis-skills/core` npm package with interactive `aegis init` that detects installed tools (Claude, ChatGPT, Cursor, Gemini, VS Code, Antigravity), writes configuration to `~/.aegisrc`, and injects skill manifests to each tool's config directory. Subcommands (`aegis configure`, `aegis list`, `aegis update`) manage configuration post-install.

**Tech Stack:** Node.js CLI (commander.js for arg parsing), fs/path for config management, OS detection (os, platform modules), interactive prompts (inquirer.js).

---

### Task 1: Set up package.json for global CLI installation

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add bin entry for global CLI**

Open `package.json` and add a `"bin"` field at the root level (after "name", before "version"):

```json
{
  "name": "@aegis-skills/core",
  "bin": {
    "aegis": "./bin/aegis.js"
  },
  "version": "2.0.0",
  ...
}
```

- [ ] **Step 2: Add required CLI dependencies**

In `package.json`, add to `"dependencies"`:

```json
"dependencies": {
  "commander": "^11.1.0",
  "inquirer": "^8.2.6",
  "chalk": "^4.1.2"
}
```

- [ ] **Step 3: Update package description and keywords**

Replace the description field:

```json
"description": "Universal skill library for Claude, ChatGPT, Cursor, Gemini, and VS Code. Install once globally, use everywhere.",
"keywords": [
  "skills",
  "claude",
  "chatgpt",
  "cursor",
  "gemini",
  "vscode",
  "security",
  "mitre",
  "threat-analysis"
]
```

- [ ] **Step 4: Add postinstall script**

In `package.json` under `"scripts"`, add:

```json
"scripts": {
  "postinstall": "chmod +x bin/aegis.js 2>/dev/null || true",
  ...
}
```

This makes the CLI executable on Unix-like systems.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "feat: add bin entry and dependencies for global CLI installation"
```

---

### Task 2: Create the main CLI entry point

**Files:**
- Create: `bin/aegis.js`

- [ ] **Step 1: Create bin directory structure**

Run:
```bash
mkdir -p bin
```

- [ ] **Step 2: Write the main CLI entry point**

Create `bin/aegis.js` with this exact content:

```javascript
#!/usr/bin/env node

const { program } = require('commander')
const path = require('path')
const fs = require('fs')
const pkg = require(path.join(__dirname, '..', 'package.json'))

// Subcommands
const initCmd = require('../lib/cli/init')
const configureCmd = require('../lib/cli/configure')
const listCmd = require('../lib/cli/list')

program
  .name('aegis')
  .description('Universal skill library for Claude, ChatGPT, Cursor, Gemini, and VS Code')
  .version(pkg.version)

program
  .command('init')
  .description('Initialize Aegis Skills with interactive setup for your tools')
  .action(initCmd)

program
  .command('configure')
  .description('Reconfigure Aegis Skills for a specific tool')
  .option('--for <tool>', 'Tool to configure (claude, chatgpt, cursor, gemini, vscode)')
  .action(configureCmd)

program
  .command('list')
  .description('List installed skills and their status')
  .action(listCmd)

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  program.outputHelp()
}
```

- [ ] **Step 3: Make it executable on Unix**

Run:
```bash
chmod +x bin/aegis.js
```

- [ ] **Step 4: Test that it loads**

Run:
```bash
node bin/aegis.js --version
```

Expected output: `2.0.0` (or your version number)

- [ ] **Step 5: Commit**

```bash
git add bin/aegis.js
git commit -m "feat: create main CLI entry point with command scaffolding"
```

---

### Task 3: Create config manager (read/write ~/.aegisrc)

**Files:**
- Create: `lib/config/manager.js`

- [ ] **Step 1: Create lib/config directory**

Run:
```bash
mkdir -p lib/config
```

- [ ] **Step 2: Write config manager**

Create `lib/config/manager.js`:

```javascript
const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_FILE = path.join(os.homedir(), '.aegisrc')

/**
 * Load configuration from ~/.aegisrc
 * Returns empty object if file doesn't exist
 */
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { tools: {}, lastUpdated: null }
  }
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf8')
    return JSON.parse(content)
  } catch (err) {
    console.error(`Error reading config: ${err.message}`)
    return { tools: {}, lastUpdated: null }
  }
}

/**
 * Save configuration to ~/.aegisrc
 */
function saveConfig(config) {
  const data = {
    ...config,
    lastUpdated: new Date().toISOString()
  }
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error(`Error saving config: ${err.message}`)
    return false
  }
}

/**
 * Get config for a specific tool
 */
function getTool(toolName) {
  const config = loadConfig()
  return config.tools[toolName] || null
}

/**
 * Set config for a specific tool
 */
function setTool(toolName, toolConfig) {
  const config = loadConfig()
  config.tools = config.tools || {}
  config.tools[toolName] = {
    ...toolConfig,
    configuredAt: new Date().toISOString()
  }
  return saveConfig(config)
}

/**
 * List all configured tools
 */
function listTools() {
  const config = loadConfig()
  return Object.keys(config.tools || {})
}

/**
 * Get config file path (for debugging)
 */
function getConfigPath() {
  return CONFIG_FILE
}

module.exports = {
  loadConfig,
  saveConfig,
  getTool,
  setTool,
  listTools,
  getConfigPath
}
```

- [ ] **Step 3: Test the config manager**

Run in Node REPL:
```bash
node -e "
const mgr = require('./lib/config/manager.js')
console.log('Config path:', mgr.getConfigPath())
mgr.setTool('claude', { installed: true, path: '~/.claude/plugins' })
console.log('Tools:', mgr.listTools())
console.log('Claude config:', mgr.getTool('claude'))
"
```

Expected output: Shows config path, arrays of tools, and claude config object.

- [ ] **Step 4: Commit**

```bash
git add lib/config/manager.js
git commit -m "feat: add configuration manager for ~/.aegisrc"
```

---

### Task 4: Detect installed tools (tool detection module)

**Files:**
- Create: `lib/tools/detector.js`

- [ ] **Step 1: Create lib/tools directory**

Run:
```bash
mkdir -p lib/tools
```

- [ ] **Step 2: Write tool detector**

Create `lib/tools/detector.js`:

```javascript
const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

const HOME = os.homedir()
const PLATFORM = process.platform

/**
 * Detect if a tool is installed and return its config path
 */
function detectTool(toolName) {
  const detectors = {
    claude: detectClaude,
    chatgpt: detectChatGPT,
    cursor: detectCursor,
    gemini: detectGemini,
    vscode: detectVSCode,
    'antigravity-cli': detectAntigravity
  }

  const detector = detectors[toolName]
  if (!detector) return null

  return detector()
}

function detectClaude() {
  // Claude config is usually in ~/.claude or ~/Library/Application Support/Claude
  const clausePaths = [
    path.join(HOME, '.claude'),
    path.join(HOME, 'Library', 'Application Support', 'Claude')
  ]
  for (const p of clausePaths) {
    if (fs.existsSync(p)) {
      return { installed: true, path: p, configDir: path.join(p, 'plugins') }
    }
  }
  return null
}

function detectChatGPT() {
  // ChatGPT Config via Chrome extensions or native app
  const chatgptPaths = [
    path.join(HOME, '.chatgpt'),
    path.join(HOME, 'AppData', 'Local', 'ChatGPT') // Windows
  ]
  for (const p of chatgptPaths) {
    if (fs.existsSync(p)) {
      return { installed: true, path: p, configDir: p }
    }
  }
  // Check if ChatGPT CLI is available
  try {
    execSync('chatgpt --version', { stdio: 'pipe' })
    return { installed: true, path: 'cli', configDir: path.join(HOME, '.config', 'chatgpt') }
  } catch {
    return null
  }
}

function detectCursor() {
  // Cursor uses .cursor in home directory
  const cursorPath = path.join(HOME, '.cursor')
  if (fs.existsSync(cursorPath)) {
    return { installed: true, path: cursorPath, configDir: path.join(cursorPath, 'extensions') }
  }
  return null
}

function detectGemini() {
  // Gemini CLI or extension config
  try {
    execSync('gemini --version', { stdio: 'pipe' })
    return {
      installed: true,
      path: 'cli',
      configDir: path.join(HOME, '.config', 'gemini-cli')
    }
  } catch {
    return null
  }
}

function detectVSCode() {
  // VS Code extensions directory
  const vscodePaths = {
    win32: path.join(HOME, 'AppData', 'Roaming', 'Code', 'User', 'extensions'),
    darwin: path.join(HOME, 'Library', 'Application Support', 'Code', 'User', 'extensions'),
    linux: path.join(HOME, '.vscode', 'extensions')
  }
  const vscodeExt = vscodePaths[PLATFORM]
  if (vscodeExt && fs.existsSync(vscodeExt)) {
    return { installed: true, path: vscodeExt, configDir: vscodeExt }
  }
  return null
}

function detectAntigravity() {
  // Antigravity CLI
  try {
    execSync('antigravity --version', { stdio: 'pipe' })
    return {
      installed: true,
      path: 'cli',
      configDir: path.join(HOME, '.config', 'antigravity')
    }
  } catch {
    return null
  }
}

/**
 * Detect all installed tools
 * Returns object: { claude: {...}, cursor: {...}, ... }
 */
function detectAllTools() {
  const tools = ['claude', 'chatgpt', 'cursor', 'gemini', 'vscode', 'antigravity-cli']
  const detected = {}

  for (const tool of tools) {
    const result = detectTool(tool)
    if (result) {
      detected[tool] = result
    }
  }

  return detected
}

module.exports = {
  detectTool,
  detectAllTools
}
```

- [ ] **Step 3: Test tool detection**

Run:
```bash
node -e "
const detector = require('./lib/tools/detector.js')
console.log('Detected tools:', detector.detectAllTools())
"
```

Expected output: Shows which tools are found on this system.

- [ ] **Step 4: Commit**

```bash
git add lib/tools/detector.js
git commit -m "feat: add tool detection for Claude, ChatGPT, Cursor, Gemini, VS Code, Antigravity"
```

---

### Task 5: Create the interactive init command

**Files:**
- Create: `lib/cli/init.js`

- [ ] **Step 1: Create lib/cli directory**

Run:
```bash
mkdir -p lib/cli
```

- [ ] **Step 2: Write init command**

Create `lib/cli/init.js` (see plan for exact content)

- [ ] **Step 3: Commit**

```bash
git add lib/cli/init.js
git commit -m "feat: add interactive init command for tool detection and setup"
```

---

### Task 6: Create the tool installer (writes manifests to tool config dirs)

**Files:**
- Create: `lib/tools/installer.js`

(see plan for exact content)

---

### Task 7: Create list and configure commands

**Files:**
- Create: `lib/cli/list.js`
- Create: `lib/cli/configure.js`

(see plan for exact content)

---

### Task 8: Update package.json to include postinstall script

**Files:**
- Modify: `package.json`

(see plan for exact content)

---

### Task 9: Update landing page with unified installation guide

**Files:**
- Modify: `pages/index.js`

(see plan for exact content)

---

### Task 10: Create comprehensive installation documentation

**Files:**
- Create: `docs/INSTALLATION.md`

(see plan for exact content)

---

### Task 11: Update package.json scripts and add npm publish config

**Files:**
- Modify: `package.json`

(see plan for exact content)

---

### Task 12: Final verification and docs update

**Files:**
- Modify: `README.md`

(see plan for exact content)

---

### Task 13: Create summary documentation

**Files:**
- Create: `docs/CLI-REFERENCE.md`

(see plan for exact content)

---

### Task 14: Push all changes and verify

**Files:**
- None modified (verification only)

(see plan for exact content)