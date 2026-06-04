import { NextRequest, NextResponse } from 'next/server'
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/lib/supabase/server'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  // 멀티파트 생성
  if (action === 'create') {
    const { filename, contentType } = body
    const key = `videos/${user.id}/${Date.now()}_${filename}`

    const { totalParts } = body
    try {
      const result = await r2.send(new CreateMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        ContentType: contentType,
      }))
      const uploadId = result.UploadId!
      const partUrls = await Promise.all(
        Array.from({ length: totalParts }, (_, i) =>
          getSignedUrl(r2, new UploadPartCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
            UploadId: uploadId,
            PartNumber: i + 1,
          }), { expiresIn: 3600 })
        )
      )
      const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
      return NextResponse.json({ uploadId, key, publicUrl, partUrls })
    } catch (err: any) {
      console.error('CreateMultipartUpload failed:', err.message, err.Code ?? err.name)
      return NextResponse.json({ error: err.message, code: err.Code ?? err.name }, { status: 500 })
    }
  }

  // 서버에서 ListParts로 ETag 수집 후 완료 (클라이언트 ETag 불필요)
  if (action === 'complete') {
    const { key, uploadId } = body
    try {
      const { Parts } = await r2.send(new ListPartsCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        UploadId: uploadId,
      }))
      const parts = (Parts ?? []).map(p => ({ PartNumber: p.PartNumber!, ETag: p.ETag! }))
      await r2.send(new CompleteMultipartUploadCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }))
      return NextResponse.json({ ok: true })
    } catch (err: any) {
      console.error('Complete failed:', err.message, err.Code ?? err.name)
      return NextResponse.json({ error: err.message, code: err.Code ?? err.name }, { status: 500 })
    }
  }

  if (action === 'abort') {
    const { key, uploadId } = body
    await r2.send(new AbortMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      UploadId: uploadId,
    }))
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
