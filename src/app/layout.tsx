import type { Metadata } from 'next';
import { Inter, DM_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: {
    default: 'DrawSync — Collaborative Canvas',
    template: '%s | DrawSync',
  },
  description: 'Real-time collaborative canvas with AI-powered suggestions, voice chat, and unlimited drawing possibilities.',
  keywords: ['collaborative canvas', 'whiteboard', 'AI drawing', 'real-time collaboration', 'flowchart'],
  openGraph: {
    title: 'DrawSync — Collaborative Canvas',
    description: 'Draw, diagram, brainstorm — all together in real time.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${dmMono.variable}`}>
      <body className={`antialiased ${inter.className}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
