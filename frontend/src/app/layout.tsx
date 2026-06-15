import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import CursorTrail from '@/components/dashboard/CursorTrail'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nerum — AI Workflow Automation for Indian Businesses',
  description:
    'Connect WhatsApp, Gmail, Razorpay, Google Sheets and more. Build automation in Tamil or English. Free to start.',
  icons: {
    icon: '/nerum-logo.png',
    shortcut: '/nerum-logo.png',
    apple: '/nerum-logo.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${grotesk.variable} ${mono.variable}`}>
        <CursorTrail />
        {children}
      </body>
    </html>
  )
}
