import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { name, value } = await request.json()
  if (!name?.endsWith('-code-verifier') || !value) {
    return new NextResponse('bad request', { status: 400 })
  }
  const response = new NextResponse('ok')
  response.cookies.set(name, value, {
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 10,
  })
  return response
}
