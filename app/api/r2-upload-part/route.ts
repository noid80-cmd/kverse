import { NextRequest, NextResponse } from 'next/server'
import { S3Client, UploadPartCommand } from '@aws-sdk/client-s3'
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

  const formData = await req.formData()
  const chunk = formData.get('chunk') as Blob
  const key = formData.get('key') as string
  const uploadId = formData.get('uploadId') as string
  const partNumber = parseInt(formData.get('partNumber') as string)

  const buffer = Buffer.from(await chunk.arrayBuffer())

  const result = await r2.send(new UploadPartCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
    Body: buffer,
    ContentLength: buffer.length,
  }))

  return NextResponse.json({ etag: result.ETag })
}
