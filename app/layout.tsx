import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { AppShell } from '@/components/app-shell'

export const metadata: Metadata = {
  title: 'Cockpit',
  description: 'Operational cockpit for Byron Film & KORUS Group',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans bg-[#0F0F0F] text-[#F5F5F5] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
