'use client'

import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

let ffmpegPromise: Promise<FFmpeg> | null = null

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg()
      // 싱글스레드 코어 사용 — 멀티스레드 버전은 SharedArrayBuffer가 필요해서
      // 전체 앱에 Cross-Origin-Embedder-Policy 헤더를 걸어야 하는데, 그러면
      // Supabase/R2처럼 우리가 CORP 헤더를 못 건드리는 외부 리소스가 깨질 위험이
      // 있음. 느리지만 이쪽이 훨씬 안전함.
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      return ffmpeg
    })()
  }
  return ffmpegPromise
}

// 용량 대비 이미 충분히 작은 파일은 굳이 다시 인코딩할 필요 없음(시간 낭비).
const SKIP_COMPRESSION_UNDER_BYTES = 20 * 1024 * 1024

// 업로드 직전에 영상을 1080p / 적당한 비트레이트로 재인코딩해서, 고화질·고용량
// 원본을 그대로 서비스하다 재생이 버벅이는 문제(실사용 중 확인)를 막는다.
// 압축이 실패하거나(구형 기기, 메모리 부족 등) 오히려 더 커지면 원본을 그대로
// 올린다 — 업로드 자체가 막히는 것보다는 압축 없이 올라가는 게 낫다.
export async function compressVideoIfNeeded(
  file: File,
  onProgress: (pct: number) => void
): Promise<File> {
  if (file.size < SKIP_COMPRESSION_UNDER_BYTES) return file
  if (!file.type.startsWith('video/')) return file

  try {
    const ffmpeg = await getFFmpeg()
    const inputName = 'input' + (file.name.match(/\.\w+$/)?.[0] ?? '.mp4')
    const outputName = 'output.mp4'

    const onFfmpegProgress = ({ progress }: { progress: number }) => {
      onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))))
    }
    ffmpeg.on('progress', onFfmpegProgress)

    await ffmpeg.writeFile(inputName, await fetchFile(file))
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      outputName,
    ])

    ffmpeg.off('progress', onFfmpegProgress)
    const data = await ffmpeg.readFile(outputName)
    await ffmpeg.deleteFile(inputName).catch(() => {})
    await ffmpeg.deleteFile(outputName).catch(() => {})

    const blob = new Blob([data as Uint8Array as BlobPart], { type: 'video/mp4' })
    if (blob.size >= file.size) return file // 이미 효율적으로 인코딩된 파일이면 원본 유지

    return new File([blob], file.name.replace(/\.\w+$/, '.mp4'), { type: 'video/mp4' })
  } catch (e) {
    console.error('[compressVideo] failed, uploading original file instead', e)
    return file
  }
}
