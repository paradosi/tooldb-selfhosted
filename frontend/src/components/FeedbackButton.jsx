import { useState } from 'react'
import { MessageCircle, X, Send, CheckCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const TYPES = ['Bug', 'Feature Request', 'General']

export default function FeedbackButton() {
  const { user } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('General')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSending(true)
    setError(null)

    const { error: err } = await supabase
      .from('user_feedback')
      .insert({
        user_id: user.id,
        type,
        message,
        page_url: location.pathname,
      })

    if (err) {
      setError(err.message)
      setSending(false)
      return
    }

    // Send email notification (fire-and-forget)
    fetch('https://znpktjjwwmdvlwprljha.supabase.co/functions/v1/send-feedback-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ type, message, page_url: location.pathname, user_email: user.email }),
    })

    setSent(true)
    setSending(false)

    setTimeout(() => {
      setOpen(false)
      setSent(false)
      setType('General')
      setMessage('')
    }, 2000)
  }

  return (
    <>
      {/* Icon trigger — positioned in top header bar, not floating */}
      <button
        onClick={() => setOpen(true)}
        className="text-fg-muted hover:text-accent transition-colors cursor-pointer"
        title="Send feedback"
      >
        <MessageCircle size={20} />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 bg-overlay flex items-end sm:items-center justify-center p-4">
          <div className="bg-card border border-bd rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-bd">
              <h3 className="text-lg font-semibold text-fg">Send Feedback</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-fg-muted hover:text-fg cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <CheckCircle size={40} className="text-ok mx-auto mb-3" />
                <p className="text-fg font-medium">Thanks for your feedback!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm text-fg-muted mb-2">Type</label>
                  <div className="flex gap-2">
                    {TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                          type === t
                            ? 'bg-accent/20 text-accent border border-accent/40'
                            : 'bg-bd text-fg-muted border border-bd-input hover:text-fg'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="feedback-message" className="block text-sm text-fg-muted mb-1">
                    Message
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Tell us what's on your mind..."
                    className="w-full px-3 py-2 bg-surface border border-bd-input rounded-lg text-fg placeholder-fg-faint text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>

                {error && <p className="text-sm text-warn">{error}</p>}

                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <Send size={16} />
                  {sending ? 'Sending...' : 'Send Feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
