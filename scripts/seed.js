const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://btibepvgtkeahjbrpfca.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0aWJlcHZndGtlYWhqYnJwZmNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQwODk0MSwiZXhwIjoyMDkzOTg0OTQxfQ.sOeM3JEZ0upNKnKol7txRrNq5DhAlkTQXT3omfkMQGg'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// 공개 테스트 영상 (Google 샘플 영상 — 공개 도메인)
const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
]

const SEED_DATA = [
  {
    group: 'BTS',
    users: [
      { email: 'seed_bts01@kverse.app', username: 'army_jungkook', gender: 'male', nationality: 'KR' },
      { email: 'seed_bts02@kverse.app', username: 'bts_vfan_jp',   gender: 'female', nationality: 'JP' },
      { email: 'seed_bts03@kverse.app', username: 'army_taehyung', gender: 'male', nationality: 'KR' },
    ],
    videos: [
      { title: 'Dynamite 댄스 커버', category: 'dance', likes: 47, views: 312, daysAgo: 2 },
      { title: 'Butter 보컬 커버 🎤',  category: 'vocal', likes: 31, views: 198, daysAgo: 4 },
      { title: 'DNA 댄스 챌린지',       category: 'dance', likes: 28, views: 175, daysAgo: 6 },
      { title: 'Boy With Luv 커버',     category: 'dance', likes: 19, views: 142, daysAgo: 9 },
      { title: 'Spring Day 보컬',       category: 'vocal', likes: 15, views: 88,  daysAgo: 11 },
    ],
  },
  {
    group: '블랙핑크',
    users: [
      { email: 'seed_bp01@kverse.app', username: 'blink_jisoo_cover', gender: 'female', nationality: 'KR' },
      { email: 'seed_bp02@kverse.app', username: 'rose_vocal_fan',    gender: 'female', nationality: 'TH' },
    ],
    videos: [
      { title: 'Pink Venom 댄스 커버',   category: 'dance', likes: 52, views: 341, daysAgo: 1 },
      { title: 'DDU-DU DDU-DU 커버',    category: 'dance', likes: 38, views: 227, daysAgo: 3 },
      { title: 'Lovesick Girls 보컬',    category: 'vocal', likes: 24, views: 163, daysAgo: 7 },
      { title: 'How You Like That 댄스', category: 'dance', likes: 17, views: 109, daysAgo: 10 },
    ],
  },
  {
    group: '트와이스',
    users: [
      { email: 'seed_twice01@kverse.app', username: 'once_nayeon_cover', gender: 'female', nationality: 'KR' },
      { email: 'seed_twice02@kverse.app', username: 'momo_dance_kr',     gender: 'female', nationality: 'KR' },
    ],
    videos: [
      { title: 'CHEER UP 댄스 커버',     category: 'dance', likes: 33, views: 218, daysAgo: 2 },
      { title: 'Feel Special 보컬 커버', category: 'vocal', likes: 21, views: 147, daysAgo: 5 },
      { title: 'TT 댄스 커버',           category: 'dance', likes: 18, views: 121, daysAgo: 8 },
    ],
  },
  {
    group: '에스파',
    users: [
      { email: 'seed_aespa01@kverse.app', username: 'my_karina_cover', gender: 'female', nationality: 'KR' },
    ],
    videos: [
      { title: 'Supernova 댄스 커버',  category: 'dance', likes: 41, views: 278, daysAgo: 1 },
      { title: 'Next Level 커버',      category: 'dance', likes: 29, views: 192, daysAgo: 4 },
      { title: 'Spicy 보컬 커버 🎤',   category: 'vocal', likes: 14, views: 97,  daysAgo: 8 },
    ],
  },
  {
    group: '세븐틴',
    users: [
      { email: 'seed_svt01@kverse.app', username: 'carat_hoshi_fan', gender: 'male', nationality: 'KR' },
    ],
    videos: [
      { title: 'Super 댄스 커버',          category: 'dance', likes: 26, views: 184, daysAgo: 3 },
      { title: 'Left & Right 댄스 커버',   category: 'dance', likes: 20, views: 143, daysAgo: 6 },
    ],
  },
  {
    group: '뉴진스',
    users: [
      { email: 'seed_nj01@kverse.app', username: 'bunny_hanni_fan', gender: 'female', nationality: 'KR' },
    ],
    videos: [
      { title: 'Hype Boy 댄스 커버',   category: 'dance', likes: 44, views: 291, daysAgo: 2 },
      { title: 'OMG 보컬 커버',        category: 'vocal', likes: 22, views: 158, daysAgo: 6 },
    ],
  },
  {
    group: '아이브',
    users: [
      { email: 'seed_ive01@kverse.app', username: 'dive_wonyoung', gender: 'female', nationality: 'KR' },
    ],
    videos: [
      { title: 'Kitsch 댄스 커버',      category: 'dance', likes: 35, views: 234, daysAgo: 3 },
      { title: 'I AM 보컬 커버 🎤',     category: 'vocal', likes: 19, views: 131, daysAgo: 7 },
    ],
  },
]

async function getOrCreateUser(email) {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users?.find(u => u.email === email)
  if (existing) return existing.id

  const { data: { user }, error } = await supabase.auth.admin.createUser({
    email,
    password: 'SeedKverse2026!',
    email_confirm: true,
  })
  if (error) { console.error(`  ✗ createUser ${email}:`, error.message); return null }
  return user.id
}

async function seed() {
  console.log('🌱 Kverse 시드 시작...\n')

  const { data: groups, error: gErr } = await supabase.from('groups').select('id, name')
  if (gErr) { console.error('groups fetch error:', gErr); return }
  console.log('그룹 목록:', groups.map(g => g.name).join(', '), '\n')

  const groupMap = {}
  for (const g of groups) groupMap[g.name] = g.id

  let videoIdx = 0

  for (const groupData of SEED_DATA) {
    const groupId = groupMap[groupData.group]
    if (!groupId) { console.warn(`⚠️  그룹 없음: "${groupData.group}" — 스킵\n`); continue }

    console.log(`── ${groupData.group} ──`)
    const accountIds = []

    for (const u of groupData.users) {
      const userId = await getOrCreateUser(u.email)
      if (!userId) continue

      const { data: existingAcc } = await supabase
        .from('accounts').select('id').eq('username', u.username).maybeSingle()

      if (existingAcc) {
        console.log(`  ↩ 이미 있음: @${u.username}`)
        accountIds.push(existingAcc.id)
        continue
      }

      const { data: acc, error: accErr } = await supabase
        .from('accounts')
        .insert({ user_id: userId, username: u.username, group_id: groupId, gender: u.gender, nationality: u.nationality, equipped: {} })
        .select('id').single()

      if (accErr) { console.error(`  ✗ account @${u.username}:`, accErr.message); continue }
      console.log(`  ✓ 계정 생성: @${u.username}`)
      accountIds.push(acc.id)
    }

    if (accountIds.length === 0) { console.log('  계정 없어서 영상 스킵\n'); continue }

    for (const v of groupData.videos) {
      const accountId = accountIds[videoIdx % accountIds.length]
      const videoUrl = SAMPLE_VIDEOS[videoIdx % SAMPLE_VIDEOS.length]
      const createdAt = new Date(Date.now() - v.daysAgo * 24 * 60 * 60 * 1000).toISOString()
      videoIdx++

      const { error } = await supabase.from('videos').insert({
        account_id: accountId,
        group_id: groupId,
        title: v.title,
        category: v.category,
        video_url: videoUrl,
        like_count: v.likes,
        view_count: v.views,
        is_private: false,
        is_live: false,
        created_at: createdAt,
      })

      if (error) {
        console.error(`  ✗ 영상 "${v.title}":`, error.message)
      } else {
        console.log(`  ✓ 영상: "${v.title}" (♥${v.likes})`)
      }
    }
    console.log()
  }

  console.log('✅ 시딩 완료!')
}

seed().catch(console.error)
