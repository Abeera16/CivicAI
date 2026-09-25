'use client'

import { useState } from 'react'
import { ChevronLeft, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { Action, Mark, Tag } from './shell'

export function AuthPage({ onSuccess, onBack }: { onSuccess: () => void; onBack: () => void }) {
  const { login, register, error, clearError } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [submitting, setSubmitting] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    clearError()
    try {
      if (mode === 'login') await login(email, password)
      else await register(fullName, email, password)
      onSuccess()
    } catch {
      // error is already surfaced via auth context
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[.85fr_1.15fr]">
      <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Mark inverse />
        <div>
          <Tag tone="green">Secure civic access</Tag>
          <h1 className="mt-7 max-w-lg text-6xl font-semibold leading-[.95] tracking-[-.07em]">
            The work behind a better city, in one place.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-primary-foreground/65">
            Clarity for residents. Context for teams. Better outcomes for Lahore.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/45">CivicAI Platform · Built for public impact</p>
      </section>
      <section className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md">
          <button onClick={onBack} className="mb-14 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft /> Back to home
          </button>
          <Mark />
          <h2 className="mt-12 text-3xl font-semibold tracking-[-.05em]">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="mt-2 text-muted-foreground">
            {mode === 'login' ? 'Sign in to continue to your workspace.' : 'Registration creates a resident (citizen) account. Staff access is granted separately by city admins.'}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            {(['login', 'register'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item)
                  clearError()
                }}
                className={`rounded-xl py-3 text-sm font-semibold capitalize transition ${
                  mode === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                {item === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <form className="mt-7 flex flex-col gap-4" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Full name
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  minLength={2}
                  className="rounded-xl border border-input bg-card px-4 py-3 font-normal outline-none transition focus:ring-4 focus:ring-primary/10"
                  placeholder="Your full name"
                />
              </label>
            )}
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Email address
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-input bg-card px-4 py-3 font-normal outline-none transition focus:ring-4 focus:ring-primary/10"
                placeholder="you@example.com"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold">
              Password
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="rounded-xl border border-input bg-card px-4 py-3 font-normal outline-none transition focus:ring-4 focus:ring-primary/10"
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'}
              />
            </label>
            {error && (
              <p className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-700">{error}</p>
            )}
            <Action type="submit" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in securely' : 'Create account'}
              {mode === 'login' ? <LogIn /> : <UserPlus />}
            </Action>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            By continuing, you agree to CivicAI&apos;s terms and privacy policy.
          </p>
        </div>
      </section>
    </main>
  )
}