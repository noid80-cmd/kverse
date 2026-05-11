type Size = 'sm' | 'lg' | 'xl'

const ICON_PX: Record<Size, number> = { sm: 20, lg: 24, xl: 30 }
const TEXT_CLS: Record<Size, string> = { sm: 'text-sm', lg: 'text-xl', xl: 'text-2xl' }

export default function KverseLogo({ size = 'sm' }: { size?: Size }) {
  const px = ICON_PX[size]
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width={px} height={Math.round(px * 0.7)} viewBox="0 0 28 20" fill="none">
        <defs>
          <linearGradient id="kv-g" x1="0" y1="0" x2="28" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E91E8C" />
            <stop offset="100%" stopColor="#7B2FBE" />
          </linearGradient>
          {/* front = bottom half only → no hat */}
          <clipPath id="kv-front"><rect x="0" y="10" width="28" height="10" /></clipPath>
        </defs>
        {/* planet */}
        <circle cx="14" cy="10" r="5" fill="url(#kv-g)" />
        {/* ring — front arc only (below center), wide ratio 13:5 = 2.6x so it reads as ring */}
        <ellipse cx="14" cy="10" rx="13" ry="3" transform="rotate(-30 14 10)"
          stroke="url(#kv-g)" strokeWidth="1.8" fill="none" clipPath="url(#kv-front)" />
      </svg>
      <span className={`font-black tracking-widest bg-gradient-to-r from-[#E91E8C] to-[#7B2FBE] bg-clip-text text-transparent ${TEXT_CLS[size]}`}>
        Kverse
      </span>
    </span>
  )
}
