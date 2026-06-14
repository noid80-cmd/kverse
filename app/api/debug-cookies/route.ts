import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const all = request.cookies.getAll()
  const names = all.map(c => c.name)
  const hasVerifier = names.some(n => n.includes('code-verifier'))
  return Response.json({ count: all.length, hasVerifier, names })
}
