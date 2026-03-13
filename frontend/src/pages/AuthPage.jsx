import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import posthog from 'posthog-js'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const { user, signIn, signUp, signInWithProvider, resetPassword } = useAuth()
  const { dark } = useTheme()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [signupSent, setSignupSent] = useState(false)
  const [mfaChallenge, setMfaChallenge] = useState(null)
  const [totpCode, setTotpCode] = useState('')

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'forgot') {
        await resetPassword(email)
        setResetSent(true)
      } else if (mode === 'signup') {
        const signUpResult = await signUp(email, password)
        if (signUpResult?.user) {
          posthog.identify(signUpResult.user.id, { email: signUpResult.user.email })
          posthog.capture('user_signed_up', { method: 'email' })
        }
        setSignupSent(true)
      } else {
        const { data } = await signIn(email, password)
        // Check if MFA is required
        if (data?.session === null && data?.user === null) {
          // signIn threw, won't reach here
        }
      }
    } catch (err) {
      // Check for MFA challenge
      if (err.message === 'MFA_CHALLENGE_REQUIRED') {
        setMfaChallenge(err.challengeId)
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleMfaVerify(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaChallenge.factorId,
        challengeId: mfaChallenge.challengeId,
        code: totpCode,
      })
      if (verifyError) throw verifyError
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (mfaChallenge) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-bd rounded-xl p-8">
          <h2 className="text-xl font-semibold text-fg mb-2">Two-factor authentication</h2>
          <p className="text-sm text-fg-muted mb-6">
            Enter the 6-digit code from your authenticator app.
          </p>
          <form onSubmit={handleMfaVerify} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-3 py-3 bg-surface border border-bd-input rounded-lg text-fg text-center text-2xl tracking-[0.5em] font-mono placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
            {error && <p className="text-sm text-warn">{error}</p>}
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
          <button
            onClick={() => { setMfaChallenge(null); setTotpCode(''); setError(null) }}
            className="mt-4 w-full text-center text-sm text-fg-muted hover:text-accent cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  if (resetSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-bd rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-fg mb-3">Check your email</h2>
          <p className="text-fg-muted text-sm">
            We sent a password reset link to <span className="text-fg">{email}</span>.
            Click the link to set a new password.
          </p>
          <button
            onClick={() => { setResetSent(false); setMode('signin'); setError(null) }}
            className="mt-6 text-accent hover:text-accent-hover text-sm cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  if (signupSent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-bd rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-fg mb-3">Check your email</h2>
          <p className="text-fg-muted text-sm">
            We sent a confirmation link to <span className="text-fg">{email}</span>.
            Click the link to activate your account.
          </p>
          <button
            onClick={() => { setSignupSent(false); setMode('signin'); setError(null) }}
            className="mt-6 text-accent hover:text-accent-hover text-sm cursor-pointer"
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={dark ? "/images/logo-dark.png" : "/images/logo-light.png"} alt="ToolDB" className="h-16 mx-auto mb-3" />
          <p className="text-fg-muted mt-2">Your tool collection, organized.</p>
          <div className="mt-4 text-left inline-block">
            <ul className="space-y-1.5 text-sm text-fg-muted">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                Track tools, batteries, receipts & warranties
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                Export PDF reports for insurance claims
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                Free to use — no credit card required
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-card border border-bd rounded-xl p-8">
          <h2 className="text-xl font-semibold text-fg mb-6">
            {mode === 'forgot' ? 'Reset password' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </h2>

          {mode === 'signin' && (
            <>
              {/* Social Login */}
              <button
                onClick={() => signInWithProvider('google')}
                className="flex items-center justify-center gap-3 w-full py-2.5 bg-surface border border-bd-input hover:border-accent rounded-lg text-fg text-sm font-medium transition-colors cursor-pointer mb-3"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => signInWithProvider('apple')}
                className="flex items-center justify-center gap-3 w-full py-2.5 bg-surface border border-bd-input hover:border-accent rounded-lg text-fg text-sm font-medium transition-colors cursor-pointer mb-4"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.1 6.28c-.1.08-1.86 1.07-1.86 3.28 0 2.56 2.24 3.46 2.31 3.49-.01.06-.36 1.23-1.18 2.44-.74 1.07-1.51 2.13-2.69 2.13s-1.48-.68-2.83-.68c-1.32 0-1.79.7-2.87.7s-1.81-.98-2.68-2.18C2.15 13.82 1.32 11.55 1.32 9.41c0-3.41 2.22-5.22 4.4-5.22 1.16 0 2.13.76 2.86.76.7 0 1.79-.81 3.12-.81.5 0 2.32.05 3.4 1.14zM11.37 2.84c.54-.64.92-1.53.92-2.42 0-.12-.01-.25-.03-.35-.88.03-1.92.58-2.55 1.3-.5.56-.96 1.45-.96 2.36 0 .14.02.27.04.32.06.01.17.03.27.03.79 0 1.78-.53 2.31-1.24z" fill="currentColor"/>
                </svg>
                Continue with Apple
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-bd" />
                <span className="text-xs text-fg-faint">or</span>
                <div className="flex-1 h-px bg-bd" />
              </div>
            </>
          )}

          {mode === 'signup' && (
            <>
              {/* Social Login for signup too */}
              <button
                onClick={() => signInWithProvider('google')}
                className="flex items-center justify-center gap-3 w-full py-2.5 bg-surface border border-bd-input hover:border-accent rounded-lg text-fg text-sm font-medium transition-colors cursor-pointer mb-3"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <button
                onClick={() => signInWithProvider('apple')}
                className="flex items-center justify-center gap-3 w-full py-2.5 bg-surface border border-bd-input hover:border-accent rounded-lg text-fg text-sm font-medium transition-colors cursor-pointer mb-4"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.1 6.28c-.1.08-1.86 1.07-1.86 3.28 0 2.56 2.24 3.46 2.31 3.49-.01.06-.36 1.23-1.18 2.44-.74 1.07-1.51 2.13-2.69 2.13s-1.48-.68-2.83-.68c-1.32 0-1.79.7-2.87.7s-1.81-.98-2.68-2.18C2.15 13.82 1.32 11.55 1.32 9.41c0-3.41 2.22-5.22 4.4-5.22 1.16 0 2.13.76 2.86.76.7 0 1.79-.81 3.12-.81.5 0 2.32.05 3.4 1.14zM11.37 2.84c.54-.64.92-1.53.92-2.42 0-.12-.01-.25-.03-.35-.88.03-1.92.58-2.55 1.3-.5.56-.96 1.45-.96 2.36 0 .14.02.27.04.32.06.01.17.03.27.03.79 0 1.78-.53 2.31-1.24z" fill="currentColor"/>
                </svg>
                Continue with Apple
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-bd" />
                <span className="text-xs text-fg-faint">or</span>
                <div className="flex-1 h-px bg-bd" />
              </div>
            </>
          )}

          {mode === 'forgot' && (
            <p className="text-sm text-fg-muted mb-4">
              Enter your email and we'll send you a link to reset your password.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-fg-muted mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
                placeholder="you@example.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label htmlFor="password" className="block text-sm text-fg-muted mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint focus:outline-none focus:border-accent transition-colors"
                  placeholder="At least 6 characters"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-warn">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Please wait...' : mode === 'forgot' ? 'Send reset link' : mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {mode === 'signin' && (
            <div className="mt-4 text-center space-y-2">
              <p>
                <button
                  onClick={() => { setMode('forgot'); setError(null) }}
                  className="text-sm text-fg-muted hover:text-accent cursor-pointer"
                >
                  Forgot password?
                </button>
              </p>
              <p className="text-sm text-fg-muted">
                Don't have an account?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null) }}
                  className="text-accent hover:text-accent-hover cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            </div>
          )}

          {mode === 'signup' && (
            <p className="mt-4 text-center text-sm text-fg-muted">
              Already have an account?{' '}
              <button
                onClick={() => { setMode('signin'); setError(null) }}
                className="text-accent hover:text-accent-hover cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p className="mt-4 text-center text-sm text-fg-muted">
              <button
                onClick={() => { setMode('signin'); setError(null) }}
                className="text-accent hover:text-accent-hover cursor-pointer"
              >
                Back to sign in
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-fg-faint mt-4">
          Beta — free to use
        </p>
      </div>
    </div>
  )
}
