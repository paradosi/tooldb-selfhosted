import { Link } from 'react-router-dom'
import {
  Search, Camera, Wrench, FileText, Shield, Tag, UserCheck, Battery,
  BarChart3, ScanBarcode, ChevronRight, Check,
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'

const features = [
  { icon: Search, title: 'Catalog Search', desc: 'Search 81,000+ tools from 450 brands. Auto-fill specs, model numbers, and brand info.' },
  { icon: ScanBarcode, title: 'Barcode Scanner', desc: 'Scan UPC barcodes with your phone camera to instantly look up and add tools.' },
  { icon: Camera, title: 'Photo Gallery', desc: 'Snap photos or upload from your library. GPS metadata is automatically stripped.' },
  { icon: Wrench, title: 'Maintenance Log', desc: 'Track blade changes, calibrations, oil changes, and repairs for every tool.' },
  { icon: FileText, title: 'Receipt Storage', desc: 'Attach purchase receipts and warranty documents. JPEG, PNG, WebP, or PDF.' },
  { icon: Shield, title: 'Warranty Alerts', desc: 'Get email alerts before warranties expire. Never miss a claim window.' },
  { icon: Tag, title: 'Color Tags', desc: 'Organize with custom colored tags. Group by project, job site, or any system.' },
  { icon: UserCheck, title: 'Lent-Out Tracking', desc: 'Track who has your tools and for how long. Filter to see everything that\'s out.' },
  { icon: Battery, title: 'Battery Tracking', desc: 'Manage your battery collection. Track voltage, capacity, platform, and condition.' },
  { icon: BarChart3, title: 'Analytics', desc: 'Collection value, spending by brand, warranty status, and lending summary.' },
]

const benefits = [
  'Track purchases, warranties, and serial numbers',
  'Scan barcodes to instantly add tools',
  'Get email alerts before warranties expire',
  'Generate insurance reports in one click (PDF & CSV)',
  'Know who borrowed your tools and when',
  'Works on iPhone, Android, tablet, and desktop',
]

export default function LandingPage() {
  const { dark } = useTheme()
  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Nav */}
      <header className="border-b border-bd bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <img src={dark ? "/images/logo-dark.png" : "/images/logo-light.png"} alt="ToolDB" className="h-10" />
          <div className="flex items-center gap-3">
            <a href="https://docs.tooldb.io" target="_blank" rel="noopener noreferrer" className="text-sm text-fg-muted hover:text-fg transition-colors">
              Docs
            </a>
            <a href="https://tooldb.io/blog/" target="_blank" rel="noopener noreferrer" className="text-sm text-fg-muted hover:text-fg transition-colors">
              Blog
            </a>
            <Link to="/auth" className="text-sm text-fg-muted hover:text-fg transition-colors">
              Sign in
            </Link>
            <Link
              to="/auth"
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-6">
            Your Tool Collection,{' '}
            <span className="text-accent">Organized</span>
          </h1>
          <p className="text-lg sm:text-xl text-fg-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            Track every tool you own. Scan barcodes, log maintenance, store receipts, and generate insurance reports. Know what you have, where it is, and who borrowed it.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors text-lg"
            >
              Start Tracking Your Tools
              <ChevronRight size={20} />
            </Link>
          </div>
          <p className="mt-4 text-sm text-fg-faint">No credit card required</p>
        </div>
      </section>

      {/* Insurance Callout */}
      <section className="border-y border-bd bg-card py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
              Insurance-Ready in One Click
            </h2>
            <p className="text-fg-muted leading-relaxed mb-6">
              If your tools were stolen or destroyed tomorrow, could you prove what you owned? ToolDB generates professional inventory reports with serial numbers, purchase prices, and total collection value.
            </p>
            <ul className="space-y-3">
              {[
                'PDF report with every tool and serial number',
                'Total collection value calculated automatically',
                'CSV export for spreadsheets and insurance forms',
                'Receipts and photos stored alongside each tool',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-fg-muted">
                  <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-surface border border-bd rounded-xl p-10 text-center">
            <FileText size={48} className="text-accent mx-auto mb-4" />
            <p className="text-lg font-semibold text-fg mb-1">Tool Inventory Report</p>
            <p className="text-sm text-fg-muted">PDF &middot; CSV &middot; One click</p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-10">
            Built for People Who Own Tools
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-3 bg-card border border-bd rounded-lg p-4">
                <Check size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-fg-muted text-sm">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-y border-bd bg-card py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-fg-muted text-center mb-10 max-w-xl mx-auto">
            From a single drill to a full shop. ToolDB grows with your collection.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-surface border border-bd rounded-lg p-5 hover:border-accent/50 transition-colors">
                <Icon size={22} className="text-accent mb-3" />
                <h3 className="font-semibold text-fg mb-1">{title}</h3>
                <p className="text-sm text-fg-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="py-12 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-6 sm:gap-10">
          {[
            'GPS metadata stripped from photos',
            'No tracking or analytics',
            'Your data stays yours',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-fg-muted text-sm">
              <Check size={16} className="text-green-500 flex-shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
          Ready to Organize Your Tools?
        </h2>
        <p className="text-fg-muted mb-8 max-w-md mx-auto">
          No credit card. No limits on your collection size.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-colors text-lg"
        >
          Get Started
          <ChevronRight size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-bd bg-card py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-fg-faint">
          <span>&copy; 2026 EJ Systems LLC</span>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-fg transition-colors">Privacy</Link>
            <a href="https://tooldb.io" className="hover:text-fg transition-colors">Open Tool Database</a>
            <a href="mailto:hello@tooldb.io" className="hover:text-fg transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
