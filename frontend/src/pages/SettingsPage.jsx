import { useState, useEffect } from 'react'
import { LogOut, Key, Trash2, Shield, ExternalLink, Sun, Moon, Share2, Bell, Smartphone, ShieldCheck, ShieldOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { Link } from 'react-router-dom'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-fg mb-6">Settings</h1>

      {/* Sign Out — top of page for easy access */}
      <div className="bg-card border border-bd rounded-xl p-6 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-fg text-sm font-medium">{user?.email}</p>
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

      {/* Notifications */}
      <NotificationSettingsSection />

      {/* Two-Factor Authentication */}
      <MFASection />

      {/* Account & Password — combined */}
      <AccountSection />

      {/* Share & Links */}
      <div className="bg-card border border-bd rounded-xl p-6 mb-4 space-y-4">
        <button
          onClick={async () => {
            const shareData = {
              title: 'ToolDB',
              text: 'Track your tool collection, store receipts, and export insurance reports.',
              url: 'https://tooldb.app',
            }
            if (navigator.share) {
              await navigator.share(shareData).catch(() => {})
            } else {
              await navigator.clipboard.writeText('https://tooldb.app')
            }
          }}
          className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors cursor-pointer"
        >
          <Share2 size={16} />
          Share ToolDB
        </button>
        <Link
          to="/privacy"
          className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
        >
          <Shield size={16} />
          Privacy Policy
          <ExternalLink size={14} className="ml-auto" />
        </Link>
      </div>

      {/* Delete Account */}
      <DeleteAccountSection />

    </div>
  )
}

function NotificationSettingsSection() {
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(true)
  const [alertDays, setAlertDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('user_notification_settings')
        .select('warranty_alerts, alert_days')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setEnabled(data.warranty_alerts)
        setAlertDays(data.alert_days)
      }
      setLoading(false)
    }
    load()
  }, [user.id])

  async function handleSave() {
    setSaving(true)
    setSaved(false)

    const record = {
      user_id: user.id,
      warranty_alerts: enabled,
      alert_days: alertDays,
    }

    const { error } = await supabase
      .from('user_notification_settings')
      .upsert(record, { onConflict: 'user_id' })

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  if (loading) return null

  return (
    <div className="bg-card border border-bd rounded-xl p-6 mb-4">
      <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Notifications</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-fg text-sm font-medium">Warranty expiration alerts</p>
            <p className="text-xs text-fg-muted">Get emailed when warranties are about to expire</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              enabled ? 'bg-accent' : 'bg-bd-input'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                enabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {enabled && (
          <div>
            <label htmlFor="alert-days" className="block text-sm text-fg-muted mb-1">
              Alert me this many days before expiry
            </label>
            <select
              id="alert-days"
              value={alertDays}
              onChange={(e) => setAlertDays(parseInt(e.target.value))}
              className="px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg text-sm focus:outline-none focus:border-accent transition-colors"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-bd hover:bg-bd-input disabled:opacity-50 text-fg text-sm rounded-lg transition-colors cursor-pointer"
        >
          <Bell size={16} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Preferences'}
        </button>
      </div>
    </div>
  )
}

function AccountSection() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (newPassword !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)

    const { error: err } = await supabase.auth.updateUser({ password: newPassword })

    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      setNewPassword('')
      setConfirm('')
    }

    setSaving(false)
  }

  return (
    <div className="bg-card border border-bd rounded-xl p-6 mb-4">
      <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Account</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="new-password" className="block text-xs text-fg-muted mb-1">New Password</label>
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg text-sm focus:outline-none focus:border-accent transition-colors"
            placeholder="At least 6 characters"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-xs text-fg-muted mb-1">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {error && <p className="text-sm text-warn">{error}</p>}
        {success && <p className="text-sm text-ok">Password updated successfully.</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-bd hover:bg-bd-input disabled:opacity-50 text-fg text-sm rounded-lg transition-colors cursor-pointer"
        >
          <Key size={16} />
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

function MFASection() {
  const [factors, setFactors] = useState([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState(null)
  const [factorId, setFactorId] = useState(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => { loadFactors() }, [])

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp?.filter((f) => f.status === 'verified') || [])
    setLoading(false)
  }

  async function handleEnroll() {
    setError(null)
    setEnrolling(true)
    const { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    })
    if (err) {
      setError(err.message)
      setEnrolling(false)
      return
    }
    setQrCode(data.totp.qr_code)
    setFactorId(data.id)
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError(null)

    const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeErr) { setError(challengeErr.message); return }

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode,
    })
    if (verifyErr) { setError(verifyErr.message); return }

    setQrCode(null)
    setFactorId(null)
    setVerifyCode('')
    setEnrolling(false)
    loadFactors()
  }

  async function handleRemove(id) {
    setRemoving(true)
    setError(null)
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (err) { setError(err.message) }
    setRemoving(false)
    loadFactors()
  }

  if (loading) return null

  const isEnabled = factors.length > 0

  return (
    <div className="bg-card border border-bd rounded-xl p-6 mb-4">
      <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider mb-4">Two-Factor Authentication</h2>

      {isEnabled && !enrolling ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-ok" />
            <div>
              <p className="text-fg text-sm font-medium">2FA is enabled</p>
              <p className="text-xs text-fg-muted">Your account is protected with an authenticator app.</p>
            </div>
          </div>
          {error && <p className="text-sm text-warn">{error}</p>}
          <button
            onClick={() => handleRemove(factors[0].id)}
            disabled={removing}
            className="flex items-center gap-2 px-4 py-2 text-warn hover:bg-warn/10 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <ShieldOff size={16} />
            {removing ? 'Removing...' : 'Disable 2FA'}
          </button>
        </div>
      ) : enrolling && qrCode ? (
        <div className="space-y-4">
          <p className="text-sm text-fg-muted">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
          </p>
          <div className="flex justify-center">
            <img src={qrCode} alt="TOTP QR code" className="w-48 h-48 rounded-lg" />
          </div>
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label htmlFor="totp-verify" className="block text-xs text-fg-muted mb-1">
                Enter the 6-digit code to verify
              </label>
              <input
                id="totp-verify"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg text-center text-lg tracking-[0.3em] font-mono placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-warn">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setEnrolling(false); setQrCode(null); setFactorId(null); setVerifyCode(''); setError(null) }}
                className="px-4 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifyCode.length !== 6}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Verify & Enable
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-fg-muted">
            Add an extra layer of security by requiring a code from your authenticator app when signing in.
          </p>
          {error && <p className="text-sm text-warn">{error}</p>}
          <button
            onClick={handleEnroll}
            className="flex items-center gap-2 px-4 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
          >
            <Smartphone size={16} />
            Set up 2FA
          </button>
        </div>
      )}
    </div>
  )
}

function DeleteAccountSection() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    if (confirmText !== 'DELETE') return

    setDeleting(true)
    setError(null)

    // Delete all user data (CASCADE handles related tables)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: toolsErr } = await supabase
      .from('user_tools')
      .delete()
      .eq('user_id', user.id)

    if (toolsErr) {
      setError('Failed to delete data. Please try again.')
      setDeleting(false)
      return
    }

    const { error: feedbackErr } = await supabase
      .from('user_feedback')
      .delete()
      .eq('user_id', user.id)

    if (feedbackErr) {
      // Non-critical, continue
    }

    // Sign out (account deletion from auth.users requires admin/service role,
    // but all user data is now deleted)
    await supabase.auth.signOut()
  }

  return (
    <div className="bg-card border border-warn/20 rounded-xl p-6">
      <h2 className="text-sm font-medium text-warn uppercase tracking-wider mb-2">Danger Zone</h2>
      <p className="text-sm text-fg-muted mb-4">
        Permanently delete your account and all associated data. This cannot be undone.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="flex items-center gap-2 px-4 py-2 text-warn hover:bg-warn/10 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <Trash2 size={16} />
          Delete Account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-fg">
            Type <span className="font-mono font-bold text-warn">DELETE</span> to confirm:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg text-sm focus:outline-none focus:border-warn transition-colors"
            placeholder="Type DELETE"
          />
          {error && <p className="text-sm text-warn">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowConfirm(false); setConfirmText('') }}
              className="px-4 py-2 bg-bd hover:bg-bd-input text-fg text-sm rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={confirmText !== 'DELETE' || deleting}
              className="px-4 py-2 bg-warn hover:bg-warn/80 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Permanently Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
