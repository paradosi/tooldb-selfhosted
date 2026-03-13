import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 pb-20 md:pb-0 relative flex flex-col min-h-screen">
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
