import type { Metadata } from 'next'
import { Fraunces, Newsreader, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/app-shell'

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT'],
  variable: '--font-fraunces',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-newsreader',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbm',
})

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
    <html lang="en" className={`${fraunces.variable} ${newsreader.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans bg-[#1A1410] text-[#E8DFCE] antialiased">
        <AppShell>{children}</AppShell>
        <div className="vignette" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
      </body>
    </html>
  )
}
