'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { LandingPage } from './civicai/landing'
import { AuthPage } from './civicai/auth'
import { Sidebar, Topbar } from './civicai/shell'
import { CitizenOverview, CommandCenter } from './civicai/overview'
import { Reports } from './civicai/reports'
import { Insights } from './civicai/insights'
import { CityMap, CitizenMap } from './civicai/city-map'
import { CitizenReport } from './civicai/citizen-report'
import { MyReports } from './civicai/my-reports'
import { WeatherPanel, RoadSimulation } from './civicai/staff-tools'
import { Assistant } from './civicai/assistant'

type View = 'landing' | 'auth' | 'app'

function StaffApp({ active, setActive }: { active: string; setActive: (v: string) => void }) {
  switch (active) {
    case 'Reports':
      return <Reports />
    case 'City map':
      return <CityMap />
    case 'Insights':
      return <Insights />
    case 'Road simulation':
      return <RoadSimulation />
    case 'Weather / AQI':
      return <WeatherPanel />
    case 'Assistant':
      return <Assistant />
    default:
      return <CommandCenter onOpenReports={() => setActive('Reports')} onOpenMap={() => setActive('City map')} />
  }
}

function CitizenApp({ active, setActive }: { active: string; setActive: (v: string) => void }) {
  switch (active) {
    case 'Report an Issue':
      return <CitizenReport onViewMyReports={() => setActive('My Reports')} />
    case 'My Reports':
      return <MyReports />
    case 'City map':
      return <CitizenMap onReportSimilar={() => setActive('Report an Issue')} />
    case 'Assistant':
      return <Assistant />
    default:
      return (
        <CitizenOverview
          onReport={() => setActive('Report an Issue')}
          onOpenMap={() => setActive('City map')}
          onOpenReports={() => setActive('My Reports')}
        />
      )
  }
}

function AppShell() {
  const { user } = useAuth()
  const role = user?.role ?? 'citizen'
  const [active, setActive] = useState('Overview')
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active={active} setActive={setActive} role={role} collapsed={collapsed} setCollapsed={setCollapsed} mobile={mobile} setMobile={setMobile} />
      <Topbar onMenu={() => setMobile(true)} />
      <main className="min-h-screen flex-1 overflow-x-hidden">
        {role === 'staff' ? <StaffApp active={active} setActive={setActive} /> : <CitizenApp active={active} setActive={setActive} />}
      </main>
    </div>
  )
}

function Gate({ view, setView }: { view: View; setView: (v: View) => void }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading CivicAI…
        </div>
      </div>
    )
  }

  if (user) return <AppShell />
  if (view === 'auth') return <AuthPage onSuccess={() => setView('app')} onBack={() => setView('landing')} />
  return <LandingPage onEnter={() => setView('auth')} />
}

export default function CivicAIApp() {
  const [view, setView] = useState<View>('landing')
  return (
    <AuthProvider>
      <Gate view={view} setView={setView} />
    </AuthProvider>
  )
}
