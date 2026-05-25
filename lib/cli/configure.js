module.exports = async function configureCmd(options) {
  console.log('⚙️  Configuring Aegis Skills...')
  if (options.for) {
    console.log(`Configuring for: ${options.for}`)
  }
  console.log('This command is not yet implemented.')
  process.exit(0)
}
