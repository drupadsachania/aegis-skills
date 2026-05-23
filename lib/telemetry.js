'use strict'

function detectPlatform (userAgent = '') {
  const ua = userAgent.toLowerCase()
  if (ua.includes('openai')) return 'openai'
  if (ua.includes('claude') || ua.includes('anthropic')) return 'anthropic'
  if (ua.includes('cursor')) return 'cursor'
  return 'unknown'
}

function getClient () {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) return null
  // Lazy require so tests can mock env vars without module-level side effects
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

async function logInvocation ({ skill, phase, platform }) {
  const client = getClient()
  if (!client) return
  client
    .from('invocations')
    .insert({ skill, phase, platform })
    .then(() => {})
    .catch(() => {})
}

module.exports = { logInvocation, detectPlatform }
