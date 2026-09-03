import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppHeader } from '@/components/app-header';
import { Toaster } from '@/components/ui/toast';
import { WebMcpTools } from '@/components/webmcp-tools';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MemoStudy — Học nhanh, nhớ lâu',
  description: 'Tạo flashcard, luyện tập thông minh và theo dõi tiến độ học tập.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster>
          <AppHeader />
          <WebMcpTools />
          {children}
        </Toaster>
      </body>
    </html>
  );
}
