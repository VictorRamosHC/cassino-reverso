import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cassino Reverso — Simulador Educacional',
  description: 'Um simulador de apostas educacional que demonstra valor esperado negativo através de jogos rigorosamente controlados. Nenhum valor real está em jogo.',
  generator: 'v0.app',
  openGraph: {
    title: 'Cassino Reverso',
    description: 'Simulador educacional de apostas com house edge positivo',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#1a1a1a',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
