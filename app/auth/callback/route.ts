import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') ?? ''

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const url = new URL(`${origin}/auth/confirm`)
  url.searchParams.set('c', code)
  if (role) url.searchParams.set('r', role)

  return NextResponse.redirect(url.toString())
}
