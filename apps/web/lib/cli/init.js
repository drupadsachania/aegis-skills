const inquirer = require('inquirer')
const chalk = require('chalk')
const detector = require('../tools/detector')
const config = require('../config/manager')
const installer = require('../tools/installer')

async function init() {
  console.log(chalk.bold.cyan('\n🛠️  Aegis Skills - Universal Installation\n'))

  console.log(chalk.dim('Detecting installed tools...\n'))
  const detected = detector.detectAllTools()

  if (Object.keys(detected).length === 0) {
    console.log(
      chalk.yellow(
        'No supported tools detected. Please install one of: Claude, ChatGPT, Cursor, Gemini, VS Code, or Antigravity CLI'
      )
    )
    return
  }

  console.log(chalk.green('✓ Found tools:'))
  Object.entries(detected).forEach(([tool, info]) => {
    console.log(chalk.green(`  • ${tool} at ${info.path}`))
  })
  console.log('')

  const toolChoices = Object.keys(detected).map(tool => ({
    name: `${tool} (${detected[tool].path})`,
    value: tool,
    checked: true
  }))

  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedTools',
      message: 'Which tools would you like to install Aegis Skills for?',
      choices: toolChoices,
      validate: arr => arr.length > 0 || 'Select at least one tool'
    },
    {
      type: 'confirm',
      name: 'globalInstall',
      message: 'Install globally (recommended) or locally?',
      default: true
    }
  ])

  console.log(chalk.dim('\nInstalling skills...\n'))

  const installResults = {}
  for (const tool of answers.selectedTools) {
    try {
      const toolInfo = detected[tool]
      await installer.installForTool(tool, toolInfo, answers.globalInstall)
      installResults[tool] = { success: true, path: toolInfo.configDir }
      console.log(chalk.green(`✓ ${tool} configured`))
    } catch (err) {
      installResults[tool] = { success: false, error: err.message }
      console.log(chalk.red(`✗ ${tool} failed: ${err.message}`))
    }
  }

  const cfg = config.loadConfig()
  for (const [tool, result] of Object.entries(installResults)) {
    if (result.success) {
      config.setTool(tool, {
        enabled: true,
        installType: answers.globalInstall ? 'global' : 'local',
        configDir: result.path
      })
    }
  }

  console.log(chalk.bold.green('\n✓ Installation complete!\n'))
  console.log(chalk.dim('Config saved to: ' + config.getConfigPath()))
  console.log(chalk.dim('\nNext steps:'))
  console.log(chalk.dim('  • Restart your tools to load the skills'))
  console.log(chalk.dim('  • Run `aegis list` to see installed skills'))
  console.log(chalk.dim('  • Run `aegis configure --for <tool>` to reconfigure a tool\n'))
}

module.exports = init
