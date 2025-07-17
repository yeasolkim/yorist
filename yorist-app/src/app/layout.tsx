import type { Metadata, Viewport } from 'next'
import './globals.css'
import BackgroundImage from '@/components/BackgroundImage'

export const metadata: Metadata = {
  title: '요리스트',
  description: '유튜브 레시피 아카이빙 앱',
  keywords: '레시피, 요리초보, 유튜브',
  authors: [{ name: '요리스트 팀' }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  themeColor: '#ff6b35',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <BackgroundImage />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
} 