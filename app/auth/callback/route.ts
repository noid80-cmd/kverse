import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') ?? ''

  // DEBUG: show all received params instead of redirecting
  const allParams: Record<string, string> = {}
  searchParams.forEach((v, k) => { allParams[k] = k === 'code' ? v.slice(0, 12) + '...' : v })

  return new Response(
    `<!DOCTYPE html><html><body style="background:#07070d;color:#eee;font-family:monospace;padding:40px">
    <h2>Auth Callback Debug</h2>
    <p><b>code present:</b> ${!!code}</p>
    <p><b>params:</b> ${JSON.stringify(allParams)}</p>
    <p><b>origin:</b> ${origin}</p>
    <br><p style="color:#aaa">이 내용을 Claude에게 알려주세요</p>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
