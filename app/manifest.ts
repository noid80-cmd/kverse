import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kverse - K-pop Universe',
    short_name: 'Kverse',
    description: 'K-pop cover video community platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#080808',
    theme_color: '#E91E8C',
    orientation: 'portrait',
    categories: ['entertainment', 'music', 'social'],
    icons: [
      { src: '/icon', sizes: '192x192', type: 'image/png' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
