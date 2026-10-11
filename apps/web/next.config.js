const path = require('path')

// The skill pack lives outside this app (packages/aegis) and lib/skill-reader.js
// reads it from disk at runtime, so it must be copied into every server bundle.
// Globs are relative to this directory (apps/web).
const AEGIS_RUNTIME_FILES = [
  '../../packages/aegis/skills/**/SKILL.md',
  '../../packages/aegis/skills/**/skill.json',
  '../../packages/aegis/skills/**/references/*.md',
  '../../packages/aegis/package.json'
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // aegis-skills is a workspace package that reads skill files from disk at runtime.
    serverComponentsExternalPackages: ['aegis-skills'],
    // Next 14 reads these under `experimental` only (top-level from Next 15).
    outputFileTracingRoot: path.join(__dirname, '..', '..'),
    outputFileTracingIncludes: {
      '/**': AEGIS_RUNTIME_FILES
    }
  },
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
              process.env.NODE_ENV === 'production' ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // dev only: React Refresh needs eval
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data:",
              "connect-src 'self'",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'none'"
            ].join('; ')
          }
        ]
      },
      {
        source: '/downloads/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' }]
      }
    ]
  }
}

module.exports = nextConfig
