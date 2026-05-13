'use client'

export default function ProfileError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 px-6">
      <p className="text-white/40 text-sm text-center">프로필을 불러오는 중 오류가 발생했어요</p>
      <p className="text-white/20 text-xs text-center font-mono">{error.message}</p>
      <button
        onClick={reset}
        className="mt-2 px-6 py-2.5 rounded-full text-white text-sm font-medium"
        style={{ background: 'linear-gradient(135deg, #E91E8C, #7B2FBE)' }}
      >
        다시 시도
      </button>
    </div>
  )
}
