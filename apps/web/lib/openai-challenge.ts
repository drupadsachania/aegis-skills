import fs from 'fs'
import path from 'path'

// ChatGPT domain verification: OpenAI issues a token at submission and wants it served as plain
// text at /.well-known/openai-apps-challenge (https://developers.openai.com/plugins/deploy/submission,
// retrieved 2026-10-12: "only the exact token, not JSON").
//
// The token is read from a committed file at build time instead of an environment variable, so the
// site keeps its "no environment reads" guard (apps/web/tests/guard/no-model-deps.test.js). It is
// a public verification token, not a secret: it is served to anyone who asks.
export const CHALLENGE_FILE = path.join(process.cwd(), 'config', 'openai-apps-challenge.txt')

/** The trimmed token, or '' when the file is missing or empty. */
export function readChallengeToken(file: string = CHALLENGE_FILE): string {
  try {
    return fs.readFileSync(file, 'utf8').trim()
  } catch {
    return ''
  }
}
