const path = require('path')

// The skill pack lives outside this app (packages/aegis) and lib/skill-reader.js
// reads it from disk at runtime, so it must be copied into every server bundle.
// Globs are relative to this directory (apps/web).
const AEGIS_RUNTIME_FILES = [
  '../../packages/aegis/skills/**/SKILL.md',
  '../../packages/aegis/skills/**/skill.json',
  '../../packages/aegis/skills/**/references/*.md',
  '../../packages/aegis/health.json'
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 14 reads these under `experimental` only (top-level from Next 15).
    outputFileTracingRoot: path.join(__dirname, '..', '..'),
    outputFileTracingIncludes: {
      '/**': AEGIS_RUNTIME_FILES
    }
  },
  serverExternalPackages: [
    '@anthropic-ai/sdk',
    'openai',
    '@google/generative-ai',
    '@langchain/anthropic',
    '@langchain/openai',
    '@langchain/google-genai',
    '@langchain/core',
    '@langchain/langgraph',
    'better-sqlite3',
    'langsmith',
  ],
  async headers () {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data:",
              "connect-src 'self'",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'none'"
            ].join('; ')
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
