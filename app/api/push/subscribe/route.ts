import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const adminSupabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { subscription } = await req.json()

  await adminSupabase.from('push_subscriptions')
    .upsert({ user_id: user.id, subscription }, { onConflict: 'user_id,subscription' })

  return NextResponse.json({ ok: true })
}
