import { NavLink } from 'react-router-dom'
import { Wrench, Battery, Package, BarChart3, FileText, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: Wrench, label: 'Tools' },
  { to: '/batteries', icon: Battery, label: 'Batteries' },
  { to: '/kits', icon: Package, label: 'Kits' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/export', icon: FileText, label: 'Export' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-bd z-50 pb-safe">
      <div className="flex justify-around py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] px-3 text-xs transition-colors ${
                isActive ? 'text-accent' : 'text-fg-muted'
              }`
            }
          >
            <Icon size={22} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
