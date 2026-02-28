import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthGate } from '@/components/auth-gate';
import { Sidebar } from '@/components/sidebar';
import { MainContent } from '@/components/main-content';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Ops Dashboard',
  description: 'Unified operations dashboard for Byron Film, KORUS, and Personal workspaces',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0F0F0F] text-white`}>
        <AuthGate>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <MainContent>{children}</MainContent>
          </div>
        </AuthGate>
      </body>
    </html>
  );
}
