/**
 * 계정 삭제 (Apple App Store Guideline 5.1.1(v)).
 *
 * 앱 안에서 사용자가 직접 계정을 지울 수 있어야 하고, 비활성화만으로는 부족하다.
 * 되돌릴 수 없는 작업이므로 본인 세션이 있을 때만 동작한다.
 *
 * 주의: profiles.id 는 auth.users 를 cascade 로 참조하지만, 아래 두 곳은
 * cascade 가 걸려있지 않아 그대로 두면 auth 사용자 삭제가 FK 위반으로 실패한다.
 *   - contacts.sender_id  (not null, cascade 없음) -> 행을 지운다
 *   - reports.reviewed_by (cascade 없음)           -> null 로 바꾼다
 */
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

/** 업로드한 영상·썸네일은 모두 videos/<userId>/ 아래에 있다 */
async function deleteUploads(userId: string) {
  const Bucket = process.env.R2_BUCKET_NAME!
  let ContinuationToken: string | undefined
  let deleted = 0

  do {
    const listed = await r2.send(new ListObjectsV2Command({
      Bucket, Prefix: `videos/${userId}/`, ContinuationToken,
    }))
    const objects = (listed.Contents ?? []).map(o => ({ Key: o.Key! }))
    if (objects.length) {
      // DeleteObjects 는 한 번에 1000개까지
      for (let i = 0; i < objects.length; i += 1000) {
        await r2.send(new DeleteObjectsCommand({
          Bucket, Delete: { Objects: objects.slice(i, i + 1000) },
        }))
      }
      deleted += objects.length
    }
    ContinuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined
  } while (ContinuationToken)

  return deleted
}

export async function POST() {
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const uid = user.id

  try {
    // 1) 업로드 파일 먼저 — DB 를 지운 뒤에는 어떤 파일이 이 사용자 것인지 알 수 없다
    const files = await deleteUploads(uid)

    // 2) cascade 가 없어서 auth 삭제를 막는 것들
    await admin.from('contacts').delete().eq('sender_id', uid)
    await admin.from('reports').update({ reviewed_by: null }).eq('reviewed_by', uid)

    // 3) profiles cascade 로 함께 지워지지만, 스키마에 FK 가 없을 수 있는
    //    테이블들이라 명시적으로 정리한다(있으면 지우고 없으면 무시).
    await admin.from('messages').delete().eq('sender_id', uid)
    await admin.from('conversations').delete().or(`agency_member_id.eq.${uid},talent_id.eq.${uid}`)
    await admin.from('likes').delete().eq('user_id', uid)
    await admin.from('bookmarks').delete().or(`agency_member_id.eq.${uid},talent_id.eq.${uid}`)
    await admin.from('audition_applications').delete().eq('talent_id', uid)
    await admin.from('push_subscriptions').delete().eq('user_id', uid)
    await admin.from('notifications').delete().eq('user_id', uid)
    await admin.from('reports').delete().or(`reporter_id.eq.${uid},reported_user_id.eq.${uid}`)
    await admin.from('blocked_users').delete().or(`blocker_id.eq.${uid},blocked_id.eq.${uid}`)
    await admin.from('agency_members').delete().eq('profile_id', uid)
    await admin.from('videos').delete().eq('talent_id', uid)

    // 4) auth 사용자 삭제 — profiles 는 cascade 로 함께 사라진다
    const { error } = await admin.auth.admin.deleteUser(uid)
    if (error) {
      console.error('deleteUser failed:', error)
      return NextResponse.json(
        { error: '계정 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      )
    }

    // 5) 실제로 지워졌는지 확인
    const { data: left } = await admin.from('profiles').select('id').eq('id', uid).maybeSingle()
    if (left) {
      console.error('profile still exists after deleteUser:', uid)
      return NextResponse.json({ error: '계정 삭제가 완료되지 않았습니다.' }, { status: 500 })
    }

    await supabase.auth.signOut()
    return NextResponse.json({ success: true, filesDeleted: files })
  } catch (e) {
    console.error('Account deletion error:', e)
    return NextResponse.json(
      { error: '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
