import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './components/shared.css';
import SwRegister from './sw-register';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'aWorkPro - Tăng tốc hiệu suất công việc của bạn',
  description: 'aWorkPro là giải pháp quản lý công việc thông minh, giúp bạn và đội nhóm sắp xếp, theo dõi và hoàn thành công việc hiệu quả. Tăng tốc chuyển đổi số cùng AppsViet Projects.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0891B2',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
