import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = { title:'Fantasy Team Analyzer (Sleeper MVP v2)', description:'League import + images, live names + ADP via Sleeper, +/- baselines, grades, and playoff odds.' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en" className="dark"><body>{children}</body></html>)
}
