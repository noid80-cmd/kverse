import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Krookie',
    short_name: 'Krookie',
    description: '기획사가 직접 보는 오디션 영상 플랫폼',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF8E7',
    theme_color: '#D84A1E',
    icons: [
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
