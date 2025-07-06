import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '요리스트 - 한국 요리 레시피',
  description: '한국 요리 초보자를 위한 간편한 레시피 앱',
  keywords: '한국요리, 레시피, 요리초보, 한식',
  authors: [{ name: '요리스트 팀' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
  themeColor: '#ef4444',
}

// app 디렉토리 표준 레이아웃: <html>과 <body> 포함
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
} 