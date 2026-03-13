import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, BookOpen, Settings, Sparkles } from 'lucide-react'
import './globals.css'

export const metadata: Metadata = {
  title: 'DocTranslate',
  description: 'Beautiful DOCX translator powered by Gemini AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* Animated background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(99,102,241,0.1),transparent)]" />
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 glass">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight">
                  Doc<span className="gradient-text">Translate</span>
                </span>
              </Link>

              {/* Nav links */}
              <div className="flex items-center gap-1">
                <NavLink href="/" icon={Sparkles} label="Translate" />
                <NavLink href="/glossary" icon={BookOpen} label="Glossary" />
                <NavLink href="/settings" icon={Settings} label="Settings" />
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="relative z-10 pt-24 pb-12 min-h-screen">
          <div className="max-w-4xl mx-auto px-6">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 py-6 text-center text-sm text-zinc-500">
          <p>Powered by Gemini AI • Built with Next.js</p>
        </footer>
      </body>
    </html>
  )
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-all duration-200"
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}
