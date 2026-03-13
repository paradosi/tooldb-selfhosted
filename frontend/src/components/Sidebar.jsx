import { NavLink } from 'react-router-dom'
import { Wrench, Battery, Package, FileText, Settings, Sun, Moon, LogOut, BarChart3 } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const navItems = [
  { to: '/', icon: Wrench, label: 'Tools' },
  { to: '/batteries', icon: Battery, label: 'Batteries' },
  { to: '/kits', icon: Package, label: 'Kits' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/export', icon: FileText, label: 'Export' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { dark, toggleTheme } = useTheme()
  const { signOut } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-60 h-screen bg-card border-r border-bd sticky top-0">
      <div className="flex items-center justify-between p-6">
        <img src={dark ? "/images/logo-dark.png" : "/images/logo-light.png"} alt="ToolDB" className="h-10" />
        <button
          onClick={toggleTheme}
          className="text-fg-muted hover:text-fg transition-colors cursor-pointer"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-fg-muted hover:text-fg hover:bg-bd'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-6 space-y-1">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-fg-muted hover:text-warn hover:bg-warn/10 transition-colors cursor-pointer w-full"
        >
          <LogOut size={20} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
