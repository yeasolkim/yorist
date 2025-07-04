/** @type {import('next').NextConfig} */
const nextConfig = {
  // 한국어 환경 최적화
  i18n: {
    locales: ['ko'],
    defaultLocale: 'ko',
  },
  // 이미지 최적화 설정
  images: {
    domains: ['youtube.com', 'instagram.com'],
  },
}

module.exports = nextConfig 