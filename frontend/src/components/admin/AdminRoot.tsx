import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react'
import { estateApi, getAuthToken, saveAuthToken } from '../../services/estateApi'
import type { EstateUser } from '../../services/estateApi'
import { Button, Input, Logo, Spinner } from '../ui'
import { AdminDashboard } from './AdminDashboard'

function AdminLogin({ onAuthenticated }: { onAuthenticated: (token: string, user: EstateUser) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null)
    try {
      const result = await estateApi.login({ email, password })
      if (result.user.role !== 'reservations_staff') throw new Error('Reservations Staff access is required.')
      saveAuthToken(result.token)
      onAuthenticated(result.token, result.user)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in')
    } finally { setBusy(false) }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-4 py-12">
      <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-[28px] border border-sand-200 bg-white p-7 shadow-lift sm:p-10">
        <a href="/" aria-label="Return to EstateStay"><Logo /></a>
        <p className="mt-9 flex items-center gap-2 text-[0.65rem] font-semibold tracking-[0.22em] text-brand-600 uppercase"><ShieldCheck className="size-4" />Reservations Staff access</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-brand-900">Estate console</h1>
        <p className="mt-2 text-sm leading-relaxed text-sand-600">Sign in with a Reservations Staff account. Guest accounts cannot access this area.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <Input label="Reservations Staff email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <Button type="submit" loading={busy} className="w-full" size="lg" leading={<KeyRound className="size-4" />}>Sign in securely</Button>
        </form>
        <a href="/" className="mt-6 inline-flex items-center gap-2 text-xs text-sand-500 transition hover:text-brand-800"><ArrowLeft className="size-3.5" />Back to EstateStay</a>
      </motion.section>
    </main>
  )
}

export function AdminRoot() {
  const [token, setToken] = useState<string | null>(getAuthToken())
  const [user, setUser] = useState<EstateUser | null>(null)
  const [checking, setChecking] = useState(Boolean(token))

  useEffect(() => {
    if (!token) { setChecking(false); return }
    let active = true
    estateApi.me(token).then(({ user: current }) => {
      if (!active) return
      if (current.role !== 'reservations_staff') throw new Error('Reservations Staff access is required')
      setUser(current)
    }).catch(() => {
      if (!active) return
      localStorage.removeItem('estatestay_access_token')
      setToken(null); setUser(null)
    }).finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [token])

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-sand-50"><Spinner className="size-8" /></div>
  if (!token || !user) return <AdminLogin onAuthenticated={(nextToken, nextUser) => { setToken(nextToken); setUser(nextUser); setChecking(false) }} />
  return <AdminDashboard token={token} user={user} onSignOut={() => { localStorage.removeItem('estatestay_access_token'); setToken(null); setUser(null) }} />
}
