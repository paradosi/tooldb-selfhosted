import { useState, useEffect } from 'react'
import { get } from '../lib/api'
import {
  Wrench, Battery, DollarSign, ShieldAlert, ShieldCheck, ShieldX,
  UserCheck, Clock, Tag, MapPin, BarChart3,
} from 'lucide-react'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const [tools, batteries] = await Promise.all([
        get('/tools'),
        get('/batteries'),
      ])
      const all = [...(tools || []), ...(batteries || [])]
      const now = new Date()

      // Collection overview
      const totalValue = all.reduce((sum, i) => sum + (parseFloat(i.purchase_price) || 0), 0)
      const toolsByBrand = countBy(tools || [], 'brand')
      const toolsByType = countBy(tools || [], 'tool_type')
      const toolsByLocation = countBy(tools || [], 'location')
      const batteryByBrand = countBy(batteries || [], 'brand')
      const batteryByPlatform = countBy(batteries || [], 'platform')

      // Warranty
      const withWarranty = all.filter((i) => i.warranty_expiry)
      const expiringSoon = withWarranty.filter((i) => {
        const exp = new Date(i.warranty_expiry)
        const daysLeft = (exp - now) / (1000 * 60 * 60 * 24)
        return daysLeft > 0 && daysLeft <= 30
      })
      const expired = withWarranty.filter((i) => new Date(i.warranty_expiry) < now)
      const activeWarranty = withWarranty.filter((i) => new Date(i.warranty_expiry) >= now)

      // Lending
      const lentTools = (tools || []).filter((t) => t.lent_to)
      const lentBatteries = (batteries || []).filter((b) => b.lent_to)
      const allLent = [...lentTools, ...lentBatteries]
      const lentByPerson = countBy(allLent, 'lent_to')

      // Purchase insights
      const withDate = all.filter((i) => i.purchase_date && i.purchase_price)
      const spendingByMonth = {}
      const spendingByBrand = {}
      const spendingByRetailer = {}
      for (const item of withDate) {
        const month = item.purchase_date.slice(0, 7)
        const price = parseFloat(item.purchase_price) || 0
        spendingByMonth[month] = (spendingByMonth[month] || 0) + price
        if (item.brand) spendingByBrand[item.brand] = (spendingByBrand[item.brand] || 0) + price
        if (item.retailer) spendingByRetailer[item.retailer] = (spendingByRetailer[item.retailer] || 0) + price
      }

      setStats({
        toolCount: (tools || []).length,
        batteryCount: (batteries || []).length,
        totalValue,
        toolsByBrand,
        toolsByType,
        toolsByLocation,
        batteryByBrand,
        batteryByPlatform,
        activeWarranty: activeWarranty.length,
        expiringSoon,
        expired,
        lentTools,
        lentBatteries,
        lentByPerson,
        spendingByMonth: sortedEntries(spendingByMonth),
        spendingByBrand: topN(spendingByBrand, 10),
        spendingByRetailer: topN(spendingByRetailer, 10),
      })
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const s = stats

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-fg">Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Wrench} label="Tools" value={s.toolCount} />
        <StatCard icon={Battery} label="Batteries" value={s.batteryCount} />
        <StatCard icon={DollarSign} label="Total Value" value={`$${s.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <StatCard icon={ShieldCheck} label="Active Warranties" value={s.activeWarranty} />
      </div>

      {/* Collection Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BreakdownCard title="Tools by Brand" icon={Tag} data={topN(s.toolsByBrand, 10)} />
        <BreakdownCard title="Tools by Type" icon={Wrench} data={topN(s.toolsByType, 10)} />
        <BreakdownCard title="Tools by Location" icon={MapPin} data={topN(s.toolsByLocation, 10)} />
        <BreakdownCard title="Batteries by Platform" icon={Battery} data={topN(s.batteryByPlatform, 10)} />
      </div>

      {/* Warranty Tracker */}
      <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert size={16} />
          Warranty Tracker
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <MiniStat label="Active" value={s.activeWarranty} color="text-green-500" />
          <MiniStat label="Expiring (30 days)" value={s.expiringSoon.length} color="text-amber-500" />
          <MiniStat label="Expired" value={s.expired.length} color="text-warn" />
        </div>
        {s.expiringSoon.length > 0 && (
          <div>
            <p className="text-xs text-fg-muted mb-2">Expiring soon:</p>
            <div className="space-y-1">
              {s.expiringSoon.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-fg truncate">{item.name}</span>
                  <span className="text-amber-500 text-xs flex-shrink-0 ml-2">
                    {new Date(item.warranty_expiry).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lending Summary */}
      <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider flex items-center gap-2">
          <UserCheck size={16} />
          Lending Summary
        </h2>
        {s.lentTools.length === 0 && s.lentBatteries.length === 0 ? (
          <p className="text-sm text-fg-faint">Nothing currently lent out.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Tools Lent" value={s.lentTools.length} color="text-warn" />
              <MiniStat label="Batteries Lent" value={s.lentBatteries.length} color="text-warn" />
            </div>
            <div className="space-y-2">
              {Object.entries(s.lentByPerson)
                .sort((a, b) => b[1] - a[1])
                .map(([person, count]) => {
                  const items = [...s.lentTools, ...s.lentBatteries].filter((i) => i.lent_to === person)
                  return (
                    <div key={person} className="bg-surface border border-bd rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-fg">{person}</span>
                        <span className="text-xs text-fg-muted">{count} item{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-0.5">
                        {items.map((item) => {
                          const daysSince = item.lent_date
                            ? Math.floor((new Date() - new Date(item.lent_date)) / (1000 * 60 * 60 * 24))
                            : null
                          return (
                            <div key={item.id} className="flex items-center justify-between text-xs">
                              <span className="text-fg-muted truncate">{item.name}</span>
                              {daysSince !== null && (
                                <span className={`flex-shrink-0 ml-2 ${daysSince > 30 ? 'text-warn' : 'text-fg-faint'}`}>
                                  {daysSince}d ago
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}
      </div>

      {/* Purchase Insights */}
      <div className="bg-card border border-bd rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-medium text-fg-muted uppercase tracking-wider flex items-center gap-2">
          <BarChart3 size={16} />
          Purchase Insights
        </h2>
        {s.spendingByMonth.length === 0 ? (
          <p className="text-sm text-fg-faint">No purchase data with dates and prices.</p>
        ) : (
          <div className="space-y-6">
            {/* Spending over time */}
            <div>
              <p className="text-xs text-fg-muted mb-3">Spending by month</p>
              <SpendingChart data={s.spendingByMonth} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BreakdownCard title="Spending by Brand" icon={Tag} data={s.spendingByBrand} isCurrency />
              <BreakdownCard title="Spending by Retailer" icon={MapPin} data={s.spendingByRetailer} isCurrency />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-card border border-bd rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className="text-fg-muted" />
        <span className="text-xs text-fg-muted">{label}</span>
      </div>
      <p className="text-xl font-bold text-fg">{value}</p>
    </div>
  )
}

function MiniStat({ label, value, color = 'text-fg' }) {
  return (
    <div className="bg-surface border border-bd rounded-lg p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-fg-muted mt-0.5">{label}</p>
    </div>
  )
}

function BreakdownCard({ title, icon: Icon, data, isCurrency }) {
  if (!data || data.length === 0) return null
  const max = Math.max(...data.map(([, v]) => v))

  return (
    <div className="bg-card border border-bd rounded-xl p-6">
      <h3 className="text-sm font-medium text-fg-muted uppercase tracking-wider flex items-center gap-2 mb-4">
        <Icon size={16} />
        {title}
      </h3>
      <div className="space-y-2">
        {data.map(([label, value]) => (
          <div key={label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-fg truncate mr-2">{label}</span>
              <span className="text-fg-muted flex-shrink-0">
                {isCurrency ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}
              </span>
            </div>
            <div className="w-full h-1.5 bg-bd rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SpendingChart({ data }) {
  if (data.length === 0) return null
  const max = Math.max(...data.map(([, v]) => v))
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Determine if data spans multiple years
  const years = new Set(data.map(([m]) => m.slice(0, 4)))
  const showYear = years.size > 1

  return (
    <div className="flex items-end gap-1 h-40 sm:h-48">
      {data.map(([month, value], i) => {
        const height = max > 0 ? (value / max) * 100 : 0
        const monthIdx = parseInt(month.slice(5), 10) - 1
        const year = month.slice(2, 4) // YY
        const monthName = MONTH_NAMES[monthIdx] || month.slice(5)
        const label = showYear ? `${monthName} '${year}` : monthName
        // Show year separator line when year changes
        const prevYear = i > 0 ? data[i - 1][0].slice(0, 4) : null
        const isNewYear = prevYear && month.slice(0, 4) !== prevYear

        return (
          <div
            key={month}
            className={`flex-1 flex flex-col items-center gap-1 min-w-0 ${isNewYear ? 'border-l border-bd pl-1' : ''}`}
          >
            <div className="w-full flex flex-col items-center justify-end h-32 sm:h-40">
              <div
                className="w-full max-w-[32px] bg-accent rounded-t"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${monthName} ${month.slice(0, 4)}: $${value.toFixed(2)}`}
              />
            </div>
            <span className="text-[10px] text-fg-faint truncate">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

function countBy(arr, key) {
  const counts = {}
  for (const item of arr) {
    const val = item[key]
    if (val) counts[val] = (counts[val] || 0) + 1
  }
  return counts
}

function topN(obj, n) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

function sortedEntries(obj) {
  return Object.entries(obj).sort((a, b) => a[0].localeCompare(b[0]))
}
