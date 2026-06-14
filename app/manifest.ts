import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kpick',
    short_name: 'Kpick',
    description: '기획사가 직접 보는 오디션 영상 플랫폼',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090f',
    theme_color: '#0891b2',
    icons: [
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
