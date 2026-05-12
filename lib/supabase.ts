import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// getSession() reads from localStorage + auto-refreshes; getUser() hits the network every time
export async function getAuthUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}
