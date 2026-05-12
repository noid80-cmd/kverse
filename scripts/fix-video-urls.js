const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://btibepvgtkeahjbrpfca.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0aWJlcHZndGtlYWhqYnJwZmNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODQwODk0MSwiZXhwIjoyMDkzOTg0OTQxfQ.sOeM3JEZ0upNKnKol7txRrNq5DhAlkTQXT3omfkMQGg',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const WORKING_VIDEOS = [
  'https://media.w3.org/2010/05/bunny/trailer.mp4',
  'https://media.w3.org/2010/05/sintel/trailer_hd.mp4',
  'https://www.w3schools.com/html/mov_bbb.mp4',
]

async function fix() {
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, video_url')
    .like('video_url', '%commondatastorage%')

  if (error) { console.error(error); return }
  console.log(`${videos.length}개 영상 URL 수정 중...\n`)

  for (let i = 0; i < videos.length; i++) {
    const newUrl = WORKING_VIDEOS[i % WORKING_VIDEOS.length]
    const { error: e } = await supabase
      .from('videos')
      .update({ video_url: newUrl })
      .eq('id', videos[i].id)

    if (e) {
      console.error(`✗ "${videos[i].title}":`, e.message)
    } else {
      console.log(`✓ "${videos[i].title}"`)
    }
  }

  console.log('\n✅ URL 수정 완료!')
}

fix().catch(console.error)
