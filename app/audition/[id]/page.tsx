import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import PublicAuditionView, { type PublicAudition } from '@/components/PublicAuditionView'

// 로그인 없이 열리는 페이지라 RLS를 우회하는 서버 전용 클라이언트로 읽는다.
// 노출되는 값은 아래 select에 적은 공고 필드뿐이고 지원자 정보는 포함하지 않는다.
function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

type Row = {
  id: string
  title: string
  description: string | null
  category: string
  mode: 'online' | 'offline' | 'both' | null
  deadline: string | null
  status: string
  translations: Record<string, { title?: string; description?: string }> | null
  agency: { name: string; is_verified: boolean } | { name: string; is_verified: boolean }[] | null
}

async function getAudition(id: string): Promise<PublicAudition | null> {
  const { data, error } = await admin()
    .from('auditions')
    .select('id, title, description, category, mode, deadline, status, translations, agency:agencies(name, is_verified)')
    .eq('id', id)
    .maybeSingle<Row>()

  if (error || !data) return null

  const agency = Array.isArray(data.agency) ? data.agency[0] : data.agency
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    mode: data.mode,
    deadline: data.deadline,
    status: data.status,
    agencyName: agency?.name ?? null,
    agencyVerified: agency?.is_verified ?? false,
    translations: data.translations,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const a = await getAudition(id)
  if (!a) return { title: '오디션을 찾을 수 없습니다' }

  const who = a.agencyName ? `${a.agencyName} ` : ''
  const title = `${who}${a.title}`
  const description = a.description?.slice(0, 150) || '영상 하나로 기획사 담당자에게 바로 지원하세요. Krookie 오디션.'
  const url = `https://kpick.app/audition/${a.id}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: `${title} | Krookie`, description, siteName: 'Krookie' },
    twitter: { card: 'summary_large_image', title: `${title} | Krookie`, description },
  }
}

export default async function PublicAuditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const audition = await getAudition(id)
  if (!audition) notFound()
  return <PublicAuditionView audition={audition} />
}
