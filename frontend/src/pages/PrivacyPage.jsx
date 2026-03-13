import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

export default function PrivacyPage() {
  const navigate = useNavigate()
  const { dark } = useTheme()

  return (
    <div className="min-h-screen bg-surface text-fg">
      <div className="max-w-2xl mx-auto p-6 py-12">
        <div className="flex justify-center mb-8">
          <img src={dark ? "/images/logo-dark.png" : "/images/logo-light.png"} alt="ToolDB" className="h-12" />
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-fg-muted hover:text-fg transition-colors cursor-pointer mb-8"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-fg-muted mb-8">Last updated: March 2026</p>

        <div className="space-y-8 text-fg-secondary leading-relaxed">
          <Section title="What we collect">
            <p>
              Your email address (for login), the tool collection data you enter,
              photos you upload, and any feedback you submit. That's it.
            </p>
          </Section>

          <Section title="What we DON'T collect">
            <p>
              We do not collect your home address, GPS location, browsing habits,
              or analytics about your collection. We <strong className="text-fg">strip GPS
              metadata from every photo</strong> before storing it — a photo taken in your
              garage will never reveal where you live.
            </p>
          </Section>

          <Section title="How your data is stored">
            <p>
              Your data is encrypted at rest in a PostgreSQL database hosted by
              Supabase. Photos are stored in Cloudflare R2. All connections between
              your device and our servers are encrypted via HTTPS. There is no
              unencrypted path to your data.
            </p>
          </Section>

          <Section title="Who can see your data">
            <p>
              Only you. Every database query is scoped to your account using
              row-level security — our API physically cannot return another user's
              tools. No admin interface exists to browse user collections.
            </p>
          </Section>

          <Section title="We never sell your data">
            <p>
              Period. Not to advertisers, not to retailers, not to data brokers,
              not to anyone. Your tool collection is yours.
            </p>
          </Section>

          <Section title="Two-factor authentication">
            <p>
              For users with high-value collections, we recommend enabling
              two-factor authentication in Settings for an extra layer of security
              on your account.
            </p>
          </Section>

          <Section title="You can delete everything">
            <p>
              One button in Settings permanently removes your account and all
              associated data — tools, photos, receipts, maintenance records, and
              feedback. We don't keep shadow copies. When you delete, it's gone.
            </p>
          </Section>

          <Section title="Third-party services">
            <ul className="list-disc list-inside space-y-1">
              <li><strong className="text-fg">Supabase</strong> — database and authentication hosting</li>
              <li><strong className="text-fg">Cloudflare</strong> — CDN, image storage, and app hosting</li>
            </ul>
            <p className="mt-2">
              We use no analytics services, no ad networks, and no tracking pixels.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about privacy? Email us at{' '}
              <a
                href="mailto:hello@tooldb.app"
                className="text-accent hover:text-accent-hover"
              >
                hello@tooldb.app
              </a>
            </p>
          </Section>
        </div>

        <p className="text-fg-faint text-sm mt-12">
          ToolDB is operated by EJ Systems LLC.
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-fg mb-2">{title}</h2>
      {children}
    </section>
  )
}
