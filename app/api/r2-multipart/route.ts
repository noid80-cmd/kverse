import { NextRequest, NextResponse } from 'next/server'
import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
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

  if (action === 'create') {
    const { filename, contentType } = body
    const key = `videos/${user.id}/${Date.now()}_${filename}`
    const result = await r2.send(new CreateMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: contentType,
    }))
    const publicUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
    return NextResponse.json({ uploadId: result.UploadId, key, publicUrl })
  }

  if (action === 'sign-part') {
    const { key, uploadId, partNumber } = body
    const url = await getSignedUrl(
      r2,
      new UploadPartCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn: 3600 }
    )
    return NextResponse.json({ url })
  }

  if (action === 'complete') {
    const { key, uploadId, parts } = body
    await r2.send(new CompleteMultipartUploadCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    }))
    return NextResponse.json({ ok: true })
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
