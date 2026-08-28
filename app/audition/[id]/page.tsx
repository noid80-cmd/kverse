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

type AgencyRow = { name: string; is_verified: boolean; logo_url: string | null }

type Row = {
  id: string
  title: string
  description: string | null
  category: string
  mode: 'online' | 'offline' | 'both' | null
  deadline: string | null
  status: string
  translations: Record<string, { title?: string; description?: string }> | null
  agency: AgencyRow | AgencyRow[] | null
}

async function getAudition(id: string): Promise<PublicAudition | null> {
  const { data, error } = await admin()
    .from('auditions')
    .select('id, title, description, category, mode, deadline, status, translations, agency:agencies(name, is_verified, logo_url)')
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
    agencyLogo: agency?.logo_url ?? null,
    translations: data.translations,
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const a = await getAudition(id)
  if (!a) return { title: '오디션을 찾을 수 없습니다' }

  // 공고 제목에 이미 기획사명이 들어있는 경우가 많아(예: "[큐브엔터테인먼트] ...") 중복을 피한다
  const prefix = a.agencyName && !a.title.includes(a.agencyName) ? `${a.agencyName} ` : ''
  const title = `${prefix}${a.title}`
  const description = a.description?.slice(0, 150) || '영상 하나로 기획사 담당자에게 바로 지원하세요. Krookie 오디션.'
  const url = `https://kpick.app/audition/${a.id}`
  // 페이지에서 openGraph를 선언하면 레이아웃 값을 병합이 아니라 대체하므로 이미지를 다시 지정해야 한다
  const images = [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Krookie' }]

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title: `${title} | Krookie`, description, siteName: 'Krookie', images },
    twitter: { card: 'summary_large_image', title: `${title} | Krookie`, description, images: ['/og-image.png'] },
  }
}

export default async function PublicAuditionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const audition = await getAudition(id)
  if (!audition) notFound()
  return <PublicAuditionView audition={audition} />
}
