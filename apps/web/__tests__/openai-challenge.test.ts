import fs from 'fs'
import os from 'os'
import path from 'path'
import { readChallengeToken } from '../lib/openai-challenge'

describe('OpenAI apps challenge token', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aegis-challenge-'))

  test('returns the trimmed token from the file', () => {
    const f = path.join(dir, 'token.txt')
    fs.writeFileSync(f, '  abc123-token\n')
    expect(readChallengeToken(f)).toBe('abc123-token')
  })

  test('returns an empty string when the file is empty or missing', () => {
    const f = path.join(dir, 'empty.txt')
    fs.writeFileSync(f, '\n')
    expect(readChallengeToken(f)).toBe('')
    expect(readChallengeToken(path.join(dir, 'missing.txt'))).toBe('')
  })

  test('the committed token file exists (empty until OpenAI issues a token)', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'config', 'openai-apps-challenge.txt'))).toBe(true)
  })
})
