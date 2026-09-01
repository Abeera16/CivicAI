'use client'

import type { ElementType } from 'react'
import { ArrowRight, CircleHelp, ShieldCheck, Target, Users } from 'lucide-react'
import { Action, Mark, Tag } from './shell'

function Feature({ icon: Icon, title, copy }: { icon: ElementType; title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <div className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-5 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
    </div>
  )
}

function Step({ n, title, copy }: { n: string; title: string; copy: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-7">
      <span className="font-mono text-xs font-semibold text-teal-700">{n}</span>
      <div className="mt-14 h-px bg-border" />
      <h3 className="mt-6 text-2xl font-semibold tracking-tight">{title}</h3>
      <p className="mt-3 leading-7 text-muted-foreground">{copy}</p>
    </div>
  )
}

function ImpactStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-6">
      <p className="text-4xl font-semibold tracking-[-.07em]">{value}</p>
      <p className="mt-2 text-sm text-primary-foreground/60">{label}</p>
    </div>
  )
}

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Mark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#platform" className="hover:text-foreground">Platform</a>
            <a href="#impact" className="hover:text-foreground">Impact</a>
            <a href="#workflow" className="hover:text-foreground">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Action variant="quiet" onClick={onEnter}>Sign in</Action>
            <Action onClick={onEnter}>
              Open CivicAI <ArrowRight />
            </Action>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-16 px-6 pb-28 pt-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-10 lg:pb-40 lg:pt-28">
        <div>
          <Tag tone="green">
            <span className="size-1.5 rounded-full bg-teal-600" /> Built for Lahore
          </Tag>
          <h1 className="mt-7 max-w-2xl text-pretty text-6xl font-semibold leading-[.95] tracking-[-.075em] sm:text-7xl lg:text-[88px]">
            Make every <span className="text-primary">signal</span> count.
          </h1>
          <p className="mt-8 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">
            CivicAI turns the everyday experience of residents into a live operating picture for the people improving Lahore — real reports, real incidents, real response.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Action onClick={onEnter}>
              Explore the platform <ArrowRight />
            </Action>
            <Action variant="quiet">
              <CircleHelp /> See how it works
            </Action>
          </div>
        </div>
      </section>

      <section id="platform" className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
          <div className="max-w-2xl">
            <Tag>One civic signal layer</Tag>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-.06em] sm:text-6xl">From scattered reports to shared confidence.</h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              CivicAI gives residents a clear voice and city teams the context to act. Every report becomes a traceable signal, every action becomes visible progress.
            </p>
          </div>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            <Feature icon={Users} title="Listen at scale" copy="Bring resident reports, weather signals and field updates into one reliable picture." />
            <Feature icon={Target} title="Prioritise with context" copy="Spot clusters and severity before they become service failures." />
            <Feature icon={ShieldCheck} title="Earn public trust" copy="Close the loop with status updates residents can actually understand." />
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-36">
        <div className="grid gap-14 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <Tag tone="amber">A better operating rhythm</Tag>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-.06em] sm:text-6xl">The city gets clearer with every report.</h2>
            <p className="mt-6 leading-8 text-muted-foreground">
              Designed for the realities of public service: incomplete information, competing priorities and a high bar for accountability.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Step n="01" title="Capture" copy="Residents report in seconds with location, category and optional photo context." />
            <Step n="02" title="Understand" copy="AI classifies and groups related signals, scoring each one's real-world impact." />
            <Step n="03" title="Resolve" copy="Teams coordinate action, track outcomes and communicate progress back." />
          </div>
        </div>
      </section>

      <section id="impact" className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-32">
          <div>
            <Tag tone="green">Measured public impact</Tag>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-.06em] sm:text-6xl">Better information. Better decisions. Better Lahore.</h2>
            <p className="mt-6 max-w-md leading-8 text-primary-foreground/65">
              The platform is built to make progress legible — for the people doing the work and the people it serves.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ImpactStat value="AI-scored" label="every incident's real-world impact" />
            <ImpactStat value="Live" label="hotspot clustering across Lahore" />
            <ImpactStat value="Grounded" label="AI assistant answers, with citations" />
            <ImpactStat value="Closed-loop" label="citizens confirm the fix themselves" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-sm lg:p-14">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <Tag tone="green">Ready when you are</Tag>
              <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-[-.06em] sm:text-6xl">Give your city a clearer signal.</h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-muted-foreground">Join the teams making everyday civic work more visible, measurable and human.</p>
            </div>
            <Action onClick={onEnter}>
              Enter CivicAI <ArrowRight />
            </Action>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <Mark />
          <span>CivicAI Platform · Lahore civic intelligence</span>
        </div>
      </footer>
    </main>
  )
}
