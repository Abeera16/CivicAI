'use client'

import { useState } from 'react'
import { ArrowRight, Check, Loader2, MapPin, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { CATEGORY_LABELS, civicApi, type CivicReport, type ReportCategory } from '@/lib/civicai-api'
import { useGeolocation } from '@/lib/hooks'
import { titleCase } from '@/lib/geo'
import { Action, Tag } from './shell'

export function CitizenReport({ onViewMyReports }: { onViewMyReports: () => void }) {
  const { token } = useAuth()
  const { coords, setCoords, source } = useGeolocation()
  const [category, setCategory] = useState<ReportCategory>('pothole')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CivicReport | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!image) {
      setError('Please attach a photo — the backend requires either a photo or an image URL to classify the report.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const report = await civicApi.submitReport(token, {
        lat: coords.lat,
        lng: coords.lng,
        description: description || undefined,
        category,
        image,
      })
      setResult(report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setResult(null)
    setDescription('')
    setImage(null)
  }

  return (
    <div className="flex flex-col gap-7 p-5 lg:p-8">
      <div>
        <Tag tone="green">Make a difference</Tag>
        <h2 className="mt-4 text-4xl font-semibold tracking-[-.06em]">Report an issue</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Share what you are seeing in your neighborhood. CivicAI classifies it automatically and routes it to the right city team.
        </p>
      </div>

      {result ? (
        <section className="max-w-2xl rounded-3xl border border-teal-500/20 bg-teal-500/10 p-8">
          <div className="grid size-12 place-items-center rounded-2xl bg-teal-500 text-primary-foreground">
            <Check />
          </div>
          <h3 className="mt-5 text-2xl font-semibold">Report received</h3>
          <p className="mt-2 leading-7 text-muted-foreground">
            Thank you for helping improve Lahore. CivicAI classified this as{' '}
            <span className="font-semibold text-foreground">{titleCase(result.category)}</span>, severity{' '}
            <span className="font-semibold text-foreground">{titleCase(result.severity)}</span>, routed to{' '}
            <span className="font-semibold text-foreground">{titleCase(result.department)}</span>.
          </p>
          <p className="mt-3 rounded-xl bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">{result.ai_reasoning}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Action onClick={reset}>Submit another</Action>
            <Action variant="outline" onClick={onViewMyReports}>
              View my reports
            </Action>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-sm lg:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold">
              What is the issue?
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}
                className="h-12 rounded-xl border border-input bg-background px-3 font-normal"
              >
                {(Object.entries(CATEGORY_LABELS) as [ReportCategory, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Where is it?
              <div className="flex h-12 items-center gap-2 rounded-xl border border-input bg-background px-3 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" />
                {source === 'pending' ? 'Detecting your location…' : `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
                {source === 'fallback' && <span className="text-xs">(default: central Lahore)</span>}
              </div>
            </label>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
              Adjust latitude
              <input
                type="number"
                step="0.0001"
                value={coords.lat}
                onChange={(e) => setCoords({ ...coords, lat: Number(e.target.value) })}
                className="h-10 rounded-xl border border-input bg-background px-3 font-normal outline-none focus:ring-4 focus:ring-primary/10"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
              Adjust longitude
              <input
                type="number"
                step="0.0001"
                value={coords.lng}
                onChange={(e) => setCoords({ ...coords, lng: Number(e.target.value) })}
                className="h-10 rounded-xl border border-input bg-background px-3 font-normal outline-none focus:ring-4 focus:ring-primary/10"
              />
            </label>
          </div>
          <label className="mt-5 flex flex-col gap-2 text-sm font-semibold">
            Describe what is happening
            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add helpful details such as when you noticed it or who is affected..."
              className="resize-none rounded-xl border border-input bg-background p-3 font-normal outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">
                Add a photo <span className="font-normal text-muted-foreground">(recommended)</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {image ? image.name : 'A photo helps CivicAI classify the issue accurately.'}
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold">
              <Plus /> {image ? 'Change photo' : 'Upload photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {error && <p className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-700">{error}</p>}
          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-xs leading-5 text-muted-foreground">Your location is used only to route this report to the right district team.</p>
            <Action type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Submitting
                </>
              ) : (
                <>
                  Send report <ArrowRight />
                </>
              )}
            </Action>
          </div>
        </form>
      )}
    </div>
  )
}
