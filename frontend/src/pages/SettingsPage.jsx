import { useState } from 'react'
import { LogOut, Sun, Moon, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-fg mb-6">Settings</h1>

      {/* Sign Out */}
      <div className="bg-card border border-bd rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-fg text-sm font-medium">{user?.username || 'admin'}</p>
            <p className="text-xs text-fg-muted">Signed in</p>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 text-warn hover:bg-warn/10 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card border border-bd rounded-xl p-6 mb-4">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-fg text-sm font-medium">Theme</p>
            <p className="text-xs text-fg-muted">{dark ? 'Dark mode' : 'Light mode'}</p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </div>

      {/* Links */}
      <div className="bg-card border border-bd rounded-xl p-6 mb-4 space-y-4">
        <Link
          to="/privacy"
          className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          <Shield size={16} />
          Privacy Policy
        </Link>
      </div>
    </div>
  )
}
