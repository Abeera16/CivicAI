'use client'

import type { ElementType, ReactNode } from 'react'
import {
  CloudRain,
  FileText,
  Globe2,
  House,
  LineChart as LineIcon,
  LogOut,
  MapPinned,
  Menu,
  MessageSquare,
  Navigation,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export type Tone = 'blue' | 'green' | 'amber' | 'rose'

export const staffNav = [
  { label: 'Overview', icon: House },
  { label: 'Reports', icon: FileText },
  { label: 'City map', icon: MapPinned },
  { label: 'Insights', icon: LineIcon },
  { label: 'Road simulation', icon: Navigation },
  { label: 'Weather / AQI', icon: CloudRain },
  { label: 'Assistant', icon: MessageSquare },
]

export const citizenNav = [
  { label: 'Overview', icon: House },
  { label: 'Report an Issue', icon: Plus },
  { label: 'City map', icon: MapPinned },
  { label: 'Assistant', icon: MessageSquare },
]

export function Mark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${inverse ? 'text-primary-foreground' : ''}`}>
      <div className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground shadow-lg shadow-accent/20">
        <Globe2 className="size-4" />
      </div>
      <span className="text-lg font-semibold tracking-[-.04em]">
        Civic<span className={inverse ? 'text-accent' : 'text-primary'}>AI</span>
      </span>
    </div>
  )
}

export function Tag({ children, tone = 'blue' }: { children: ReactNode; tone?: Tone }) {
  const c: Record<Tone, string> = {
    blue: 'bg-primary/10 text-primary',
    green: 'bg-teal-500/10 text-teal-700',
    amber: 'bg-amber-500/15 text-amber-800',
    rose: 'bg-rose-500/10 text-rose-700',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.08em] ${c[tone]}`}>
      {children}
    </span>
  )
}

export function Action({
  children,
  variant = 'solid',
  onClick,
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode
  variant?: 'solid' | 'quiet' | 'outline'
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === 'solid'
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl'
          : variant === 'outline'
            ? 'border border-primary/20 bg-card text-primary hover:bg-primary/5'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      } ${className}`}
    >
      {children}
    </button>
  )
}

export function Metric({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'blue',
  note,
}: {
  label: string
  value: string
  delta?: string
  icon: ElementType
  tone?: Tone
  note?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div
          className={`grid size-10 place-items-center rounded-xl ${
            tone === 'green'
              ? 'bg-teal-500/10 text-teal-700'
              : tone === 'amber'
                ? 'bg-amber-500/15 text-amber-800'
                : tone === 'rose'
                  ? 'bg-rose-500/10 text-rose-700'
                  : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="size-5" />
        </div>
        {delta && <span className="flex items-center gap-1 text-xs font-semibold text-teal-700">{delta}</span>}
      </div>
      <p className="mt-7 text-3xl font-semibold tracking-[-.06em]">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

export function ChartCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string
  subtitle: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-sm lg:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold tracking-tight">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
      <p className="text-sm font-semibold text-rose-700">Couldn&apos;t load live data</p>
      <p className="text-sm text-rose-700/80">{message}</p>
      {onRetry && (
        <Action variant="outline" onClick={onRetry}>
          Try again
        </Action>
      )}
    </div>
  )
}

export function Sidebar({
  active,
  setActive,
  role,
  collapsed,
  setCollapsed,
  mobile,
  setMobile,
}: {
  active: string
  setActive: (x: string) => void
  role: 'staff' | 'citizen'
  collapsed: boolean
  setCollapsed: (x: boolean) => void
  mobile: boolean
  setMobile: (x: boolean) => void
}) {
  const { user, logout } = useAuth()
  const items = role === 'staff' ? staffNav : citizenNav
  const initials = (user?.full_name ?? '')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r border-border bg-card px-3 py-6 transition-all duration-300 ${
          mobile ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-[82px]' : 'lg:w-64'} lg:static lg:translate-x-0`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'}`}>
          {!collapsed && <Mark />}
          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(!collapsed)}
            className="grid size-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </button>
        </div>
        <button
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
          className="absolute right-3 top-5 rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
        >
          <X />
        </button>
        <div className="mt-10 flex flex-col gap-1">
          {items.map((item) => (
            <button
              title={collapsed ? item.label : undefined}
              key={item.label}
              onClick={() => {
                setActive(item.label)
                setMobile(false)
                setCollapsed(true)
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                active === item.label
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/15'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <item.icon className="size-5 shrink-0" />
              {!collapsed && item.label}
            </button>
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-1">
          <button
            onClick={logout}
            className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-muted ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="size-5" />
            {!collapsed && 'Sign out'}
          </button>
          <button className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-muted-foreground hover:bg-muted ${collapsed ? 'justify-center' : ''}`}>
            <Settings className="size-5" />
            {!collapsed && 'Settings'}
          </button>
          {!collapsed && (
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-muted p-3">
              <div className="grid size-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials || (role === 'staff' ? 'ST' : 'CT')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.full_name ?? 'CivicAI user'}</p>
                <p className="truncate text-xs text-muted-foreground">{role === 'staff' ? 'City operations' : 'Resident account'}</p>
              </div>
            </div>
          )}
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="Close navigation backdrop"
          onClick={() => setMobile(false)}
          className="fixed inset-0 z-20 bg-primary/25 backdrop-blur-sm lg:hidden"
        />
      )}
    </>
  )
}

export function CompactCard({
  title,
  subtitle,
  children,
  action,
  className = '',
}: {
  title: string
  subtitle?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function CompactMetric({
  label,
  value,
  delta,
  icon: Icon,
  tone = 'blue',
  note,
}: {
  label: string
  value: string
  delta?: string
  icon: ElementType
  tone?: Tone
  note?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div
          className={`grid size-8 place-items-center rounded-lg ${
            tone === 'green'
              ? 'bg-teal-500/10 text-teal-700'
              : tone === 'amber'
                ? 'bg-amber-500/15 text-amber-800'
                : tone === 'rose'
                  ? 'bg-rose-500/10 text-rose-700'
                  : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="size-4" />
        </div>
        {delta && <span className="text-[11px] font-semibold text-teal-700">{delta}</span>}
      </div>
      <p className="mt-3 text-xl font-semibold tracking-tight">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
      {note && <p className="mt-1.5 text-[11px] text-muted-foreground">{note}</p>}
    </div>
  )
}

export function MiniTable({
  columns,
  rows,
  emptyLabel = 'Nothing to show yet.',
}: {
  columns: string[]
  rows: ReactNode[][]
  emptyLabel?: string
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i !== rows.length - 1 ? 'border-t border-border/60' : ''}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-center text-muted-foreground" colSpan={columns.length}>
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <button
      aria-label="Open navigation"
      onClick={onMenu}
      className="fixed left-4 top-4 z-20 grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground shadow-lg shadow-primary/5 hover:bg-muted lg:hidden"
    >
      <Menu />
    </button>
  )
}