import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip Supabase client for auth callback paths — prevents Set-Cookie headers
  // from wiping the PKCE code verifier before exchangeCodeForSession runs.
  // /reset-password도 같은 이유로 제외한다 — 비밀번호 복구 링크가 ?code=로
  // 들어와서 페이지가 직접 교환하는데, 여기서 세션 쿠키를 다시 쓰면 그 전에
  // verifier가 날아가 "링크가 만료됐다"고만 뜬다(OAuth 콜백에서 겪은 그 문제).
  if (pathname.startsWith('/auth') || pathname.startsWith('/reset-password')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session on every request so expired tokens get renewed.
  // Individual pages handle their own auth-based redirects.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
