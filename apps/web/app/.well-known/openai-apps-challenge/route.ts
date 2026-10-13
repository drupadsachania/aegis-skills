import { readChallengeToken } from '../../../lib/openai-challenge'

// Evaluated at build time: change apps/web/config/openai-apps-challenge.txt and redeploy.
export const dynamic = 'force-static'

export async function GET() {
  const token = readChallengeToken()
  return new Response(token, {
    status: token ? 200 : 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
