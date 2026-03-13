import { Outlet } from 'react-router-dom'
import { HelpCircle } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import FeedbackButton from './FeedbackButton'

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 pb-20 md:pb-0 relative flex flex-col min-h-screen">
        {/* Help + Feedback icons — top-right corner on mobile */}
        <div className="fixed top-3 right-4 z-30 md:hidden flex items-center gap-3">
          <a
            href="https://docs.tooldb.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg-muted hover:text-accent transition-colors"
          >
            <HelpCircle size={20} />
          </a>
          <FeedbackButton />
        </div>
        <div className="flex-1">
          <Outlet />
        </div>
        <p className="text-center text-xs text-fg-faint py-4">
          ToolDB v{__APP_VERSION__} — Built by EJ Systems LLC
        </p>
      </main>

      <MobileNav />
    </div>
  )
}
