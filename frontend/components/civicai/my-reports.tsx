'use client'

import { useState } from 'react'
import { Check, Clock3, FileText, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { civicApi, type CivicReport } from '@/lib/civicai-api'
import { useApiData } from '@/lib/hooks'
import { severityTone, timeAgo, titleCase } from '@/lib/geo'
import { EmptyState, ErrorState, Metric, Tag } from './shell'

export function MyReports() {
  const { token } = useAuth()
  const { data: reports, error, loading, refetch } = useApiData(
    () => civicApi.myReports(token!),
    [token],
    { enabled: !!token, intervalMs: 30000 },
  )
  const [selected, setSelected] = useState<CivicReport | null>(null)
  const [confirming, setConfirming] = useState(false)

  const active = selected ?? reports?.[0] ?? null

  const counts = reports
    ? {
        total: reports.length,
        inProgress: reports.filter((r) => r.status === 'in_progress').length,
        resolved: reports.filter((r) => r.status === 'resolved').length,
      }
    : null

  async function confirm(confirmation: 'still_exists' | 'fixed') {
    if (!token || !active) return
    setConfirming(true)
    try {
      const updated = await civicApi.confirmReport(token, active.id, confirmation)
      setSelected(updated)
      refetch()
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="flex flex-col gap-7 p-5 lg:p-8">
      <div>
        <Tag tone="blue">Your civic activity</Tag>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-.06em]">My reports</h2>
        <p className="mt-2 text-muted-foreground">Follow progress on the issues you have shared with Lahore.</p>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}

      {counts && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Reports submitted" value={String(counts.total)} icon={FileText} />
          <Metric label="In progress" value={String(counts.inProgress)} icon={Clock3} tone="amber" />
          <Metric label="Resolved" value={String(counts.resolved)} icon={Check} tone="green" />
        </div>
      )}

      {loading && !reports && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your reports…
        </div>
      )}

      {reports && reports.length === 0 && (
        <EmptyState title="No reports yet" subtitle="Reports you submit will show up here with live status updates." />
      )}

      {reports && reports.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="flex flex-col gap-3">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:border-primary/30 ${
                  active?.id === r.id ? 'border-primary/40 ring-2 ring-primary/10' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">#{r.id.slice(0, 8).toUpperCase()}</p>
                    <h3 className="mt-2 font-semibold">{titleCase(r.category)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.description ? r.description.slice(0, 60) : 'No description'} · Submitted {timeAgo(r.created_at)}
                    </p>
                  </div>
                  <Tag tone={r.status === 'resolved' ? 'green' : severityTone(r.severity)}>{titleCase(r.status)}</Tag>
                </div>
                <div className="mt-5 h-1.5 rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      r.status === 'resolved' ? 'w-full bg-teal-500' : r.status === 'in_progress' ? 'w-2/3 bg-amber-500' : 'w-1/4 bg-primary'
                    }`}
                  />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                  <span>Received</span>
                  <span>In progress</span>
                  <span>Resolved</span>
                </div>
              </button>
            ))}
          </section>
          {active && (
            <section className="h-fit rounded-3xl border border-border bg-card p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Selected report</p>
              <h3 className="mt-4 text-xl font-semibold">{titleCase(active.category)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                #{active.id.slice(0, 8).toUpperCase()} · {titleCase(active.department)}
              </p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{active.ai_reasoning}</p>

              {active.status === 'resolved' ? (
                <>
                  <div className="mt-6 rounded-2xl bg-teal-500/10 p-4">
                    <p className="text-sm font-semibold text-teal-900">Marked resolved by the city</p>
                    <p className="mt-1 text-xs leading-5 text-teal-800/80">
                      {active.citizen_confirmation
                        ? `You confirmed: ${active.citizen_confirmation === 'fixed' ? 'issue fixed' : 'issue still exists'}`
                        : 'Let us know if this was actually fixed.'}
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => confirm('fixed')}
                      disabled={confirming}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      <Check className="size-4" /> Confirm fixed
                    </button>
                    <button
                      onClick={() => confirm('still_exists')}
                      disabled={confirming}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                    >
                      Still there
                    </button>
                  </div>
                </>
              ) : (
                <p className="mt-6 text-sm leading-6 text-muted-foreground">
                  Status: <span className="font-semibold text-foreground">{titleCase(active.status)}</span>. We&apos;ll let you confirm the
                  fix once the city marks this resolved.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
