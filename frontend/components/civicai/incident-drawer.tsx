'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { civicApi, mediaUrl } from '@/lib/civicai-api'
import { useApiData } from '@/lib/hooks'
import { severityTone, timeAgo, titleCase } from '@/lib/geo'
import { Action, Tag } from './shell'

export function IncidentDrawer({ incidentId, onClose }: { incidentId: string; onClose: () => void }) {
  const { token, user } = useAuth()
  const { data: incident, error, loading, refetch } = useApiData(() => civicApi.incident(incidentId, token ?? undefined), [incidentId, token])
  const [acting, setActing] = useState(false)
  const [beforeUrl, setBeforeUrl] = useState('')
  const [afterUrl, setAfterUrl] = useState('')
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null)
  const isStaff = user?.role === 'staff'

  async function setStatus(status: 'open' | 'in_progress') {
    if (!token) return
    setActing(true)
    try {
      await civicApi.setIncidentStatus(token, incidentId, status)
      refetch()
    } finally {
      setActing(false)
    }
  }

  async function resolve() {
    if (!token) return
    setActing(true)
    try {
      await civicApi.resolveIncident(token, incidentId, {
        before_photo_url: beforeUrl || undefined,
        after_photo_url: afterUrl || undefined,
      })
      refetch()
    } finally {
      setActing(false)
    }
  }

  async function toggleReportResolved(reportId: string, currentStatus: string) {
    if (!token) return
    setResolvingReportId(reportId)
    try {
      if (currentStatus === 'resolved') {
        await civicApi.reopenReport(token, reportId)
      } else {
        await civicApi.resolveReport(token, reportId)
      }
      refetch()
    } finally {
      setResolvingReportId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Close incident details" onClick={onClose} className="absolute inset-0 bg-primary/25 backdrop-blur-sm" />
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-card p-6 shadow-2xl">
        <button aria-label="Close" onClick={onClose} className="absolute right-5 top-5 grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted">
          <X />
        </button>

        {loading && !incident && (
          <div className="flex items-center gap-2 pt-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading incident…
          </div>
        )}
        {error && <p className="mt-10 text-sm text-rose-700">{error}</p>}

        {incident && (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Incident #{incident.id.slice(0, 8).toUpperCase()}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{titleCase(incident.category)}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Tag tone={severityTone(incident.severity)}>{titleCase(incident.severity)}</Tag>
              <Tag tone="blue">Impact {incident.impact_score}</Tag>
              <Tag tone={incident.status === 'resolved' ? 'green' : 'amber'}>{titleCase(incident.status)}</Tag>
            </div>
            <p className="mt-4 rounded-xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">{incident.impact_explanation}</p>

            {incident.status === 'resolved' && incident.impact_before !== null && incident.impact_after !== null && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Impact before</p>
                  <p className="mt-1 text-2xl font-semibold">{incident.impact_before}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Impact after</p>
                  <p className="mt-1 text-2xl font-semibold text-teal-700">{incident.impact_after}</p>
                </div>
              </div>
            )}

            {isStaff && incident.status !== 'resolved' && (
              <div className="mt-6 rounded-2xl border border-border p-4">
                <p className="text-sm font-semibold">Resolution actions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Action variant="outline" disabled={acting || incident.status === 'in_progress'} onClick={() => setStatus('in_progress')}>
                    Mark in progress
                  </Action>
                  <Action variant="outline" disabled={acting || incident.status === 'open'} onClick={() => setStatus('open')}>
                    Reopen
                  </Action>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Reports in this incident can be up to 80m apart — if only some locations are actually fixed, resolve those
                  individual reports below instead. Use "Mark all resolved" only once every location in this incident is done.
                </p>
                <div className="mt-4 grid gap-2">
                  <input
                    value={beforeUrl}
                    onChange={(e) => setBeforeUrl(e.target.value)}
                    placeholder="Before photo URL (optional)"
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                  />
                  <input
                    value={afterUrl}
                    onChange={(e) => setAfterUrl(e.target.value)}
                    placeholder="After photo URL (optional)"
                    className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-4 focus:ring-primary/10"
                  />
                  <Action disabled={acting} onClick={resolve}>
                    {acting ? <Loader2 className="size-4 animate-spin" /> : 'Mark all resolved'}
                  </Action>
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="text-sm font-semibold">Grouped reports ({incident.reports?.length ?? 0})</p>
              <div className="mt-3 flex flex-col gap-3">
                {(incident.reports ?? []).map((r) => {
                  const isExpanded = expandedReportId === r.id
                  return (
                    <div
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedReportId(isExpanded ? null : r.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setExpandedReportId(isExpanded ? null : r.id)
                      }}
                      className="cursor-pointer rounded-2xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{titleCase(r.department)}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{timeAgo(r.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag tone={r.status === 'resolved' ? 'green' : severityTone(r.severity)}>
                            {r.status === 'resolved' ? 'Resolved' : titleCase(r.severity)}
                          </Tag>
                          {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                        </div>
                      </div>
                      {r.description && <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>}
                      {r.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mediaUrl(r.image_url)} alt="Report evidence" className="mt-3 max-h-48 w-full rounded-xl object-cover" />
                      )}
                      {!isExpanded && (
                        <p className="mt-3 text-xs font-medium text-primary">Tap to see full AI reasoning</p>
                      )}
                      {isExpanded && (
                        <div className="mt-3 rounded-xl bg-muted/50 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI classification</p>
                            <p className="text-xs font-medium text-muted-foreground">{Math.round(r.confidence * 100)}% confidence</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Category: <span className="font-medium text-foreground">{titleCase(r.category)}</span>
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{r.ai_reasoning}</p>
                        </div>
                      )}
                      {isStaff && (
                        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                          <Action
                            variant="outline"
                            disabled={resolvingReportId === r.id}
                            onClick={() => toggleReportResolved(r.id, r.status)}
                          >
                            {resolvingReportId === r.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : r.status === 'resolved' ? (
                              'Reopen this report'
                            ) : (
                              'Mark this report resolved'
                            )}
                          </Action>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
