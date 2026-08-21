import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // R2에 올라간 썸네일을 Vercel 이미지 최적화(리사이즈 + AVIF/WebP 변환)로 서빙한다.
    // 업로드 시 영상 원본 해상도(세로 영상이면 1080x1920) 그대로 저장되기 때문에
    // 원본을 그대로 내려주면 목록 로딩이 매우 느리다.
    remotePatterns: [
      { protocol: 'https', hostname: 'pub-5e971c3cf36448bf9e5a11f78c0a9f22.r2.dev', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
