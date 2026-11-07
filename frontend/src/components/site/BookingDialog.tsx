import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CreditCard, X } from 'lucide-react'
import { estateApi, getAuthToken, saveAuthToken } from '../../services/estateApi'
import type { BookingRecord, EstateRoom, StaySearch } from '../../types/estate'
import { Button, Input } from '../ui'

type PaymentOutcome = 'success' | 'failure' | 'pending'
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function BookingDialog({ room, search, onClose }: { room: EstateRoom; search: StaySearch | null; onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [token, setToken] = useState(getAuthToken())
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  const [booking, setBooking] = useState<BookingRecord | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!search) {
      setError('Choose arrival and departure dates in the booking search first.')
      return
    }
    setBusy(true); setError(null)
    try {
      let accessToken = token
      if (!accessToken) {
        const authResult = mode === 'register'
          ? await estateApi.register({ name, email, phone, password, privacyAccepted: true })
          : await estateApi.login({ email, password })
        accessToken = authResult.token
        setToken(accessToken)
        saveAuthToken(accessToken)
      }
      const created = await estateApi.createBooking({
        token: accessToken,
        roomId: room._id,
        checkIn: search.checkIn,
        checkOut: search.checkOut,
        adults: search.adults,
        children: search.children,
        ratePlanCode: 'FLEX',
        guestName: name || undefined,
        guestEmail: email,
        guestPhone: phone || undefined,
      })
      setBooking(created)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create your booking')
    } finally {
      setBusy(false)
    }
  }

  async function pay(outcome: PaymentOutcome) {
    if (!booking || !token) return
    setBusy(true); setError(null); setPaymentMessage(null)
    try {
      const result = await estateApi.testPayment(booking._id, token, outcome)
      setBooking((current) => current ? { ...current, status: result.booking.status, paymentStatus: result.booking.paymentStatus } : current)
      if (outcome === 'success') {
        setConfirmed(true)
      } else if (outcome === 'failure') {
        setPaymentMessage('Payment failed. Your room remains reserved temporarily; you can retry the test payment.')
      } else {
        setPaymentMessage('Payment is pending. The reservation remains unconfirmed until payment succeeds.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment could not be processed')
    } finally {
      setBusy(false)
    }
  }

  async function applyPromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!booking || !token) return
    setBusy(true); setError(null); setPaymentMessage(null)
    try {
      const updated = await estateApi.applyBookingPromo(booking._id, token, promoCode)
      setBooking(updated)
      setPromoCode(updated.promoCode ?? '')
      setPaymentMessage(updated.promoCode ? `Promo ${updated.promoCode} applied. The server recalculated discount and GST.` : 'Promo removed. The server recalculated GST and total.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Promo code could not be applied')
    } finally { setBusy(false) }
  }

  const taxLines = booking?.taxBreakdown ?? []

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-brand-950/75 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
      >
        <motion.section
          role="dialog" aria-modal="true" aria-labelledby="booking-dialog-title"
          initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }}
          className="relative my-auto w-full max-w-xl rounded-[28px] bg-sand-50 p-6 shadow-2xl sm:p-9"
        >
          <button type="button" onClick={onClose} aria-label="Close booking" className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full text-sand-500 transition hover:bg-sand-100 hover:text-brand-900"><X className="size-5" /></button>

          {confirmed && booking ? (
            <div className="py-8 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-800"><Check className="size-7" /></span>
              <p className="mt-5 text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Booking confirmed</p>
              <h2 id="booking-dialog-title" className="mt-2 font-display text-3xl font-semibold text-brand-900">Your stay is reserved.</h2>
              <p className="mt-3 text-sm text-sand-600">Confirmation <strong className="text-brand-900">{booking.reference}</strong></p>
              <p className="mt-2 text-sm text-sand-600">{search?.checkIn} → {search?.checkOut} · {booking.nights} nights</p>
              <p className="mt-2 font-semibold text-brand-900">{currency.format(booking.total)} paid (test payment)</p>
              <Link to={`/confirmation/${booking._id}`} className="mt-7 inline-flex h-11 items-center rounded-full bg-brand-800 px-6 text-sm font-medium text-white transition-colors hover:bg-brand-700">View booking confirmation</Link>
            </div>
          ) : booking ? (
            <>
              <p className="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Step 2 · Review & payment</p>
              <h2 id="booking-dialog-title" className="mt-2 pr-8 font-display text-3xl font-semibold tracking-tight text-brand-900">Your stay at {room.name}</h2>
              <p className="mt-2 text-sm text-sand-600">Booking reference <strong className="text-brand-900">{booking.reference}</strong> · {booking.paymentStatus}</p>

              <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-5">
                <div className="flex justify-between gap-4 text-sm"><span className="text-sand-600">Dates</span><strong className="text-right text-brand-900">{booking.checkIn.slice(0, 10)} → {booking.checkOut.slice(0, 10)}</strong></div>
                <div className="mt-3 flex justify-between gap-4 text-sm"><span className="text-sand-600">Guests · nights</span><strong className="text-right text-brand-900">{booking.guests.adults} adults, {booking.guests.children} children · {booking.nights} nights</strong></div>
                <div className="my-4 border-t border-sand-100" />
                <form onSubmit={applyPromo} className="mb-4 border-b border-sand-100 pb-4">
                  <label htmlFor="booking-promo" className="text-sm font-semibold text-brand-900">Have a promo code?</label>
                  <div className="mt-2 flex gap-2">
                    <input id="booking-promo" value={promoCode} onChange={(event) => setPromoCode(event.target.value.toUpperCase())} maxLength={32} placeholder="Enter code" disabled={busy || booking.paymentStatus !== 'pending'} className="h-11 min-w-0 flex-1 rounded-full border border-sand-300 bg-white px-4 text-sm uppercase text-brand-900 outline-none transition placeholder:normal-case placeholder:text-sand-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15 disabled:bg-sand-50" />
                    <Button type="submit" variant={booking.promoCode ? 'outline' : 'primary'} loading={busy} disabled={booking.paymentStatus !== 'pending' || (!promoCode.trim() && !booking.promoCode)}>{booking.promoCode ? 'Update' : 'Apply'}</Button>
                  </div>
                  {booking.promoCode && <p className="mt-2 text-xs font-medium text-brand-700">{booking.promoCode} is applied. Apply an empty code to remove it.</p>}
                </form>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><span className="text-sand-600">Room tariff</span><span>{currency.format(booking.subtotal)}</span></div>
                  {booking.discount > 0 && <div className="flex justify-between gap-4 text-brand-700"><span>Promo discount</span><span>−{currency.format(booking.discount)}</span></div>}
                  {taxLines.map((line) => <div key={line.date} className="flex justify-between gap-4 text-sand-600"><span>GST {Math.round(line.rate * 100)}% · {line.date.slice(0, 10)} (tariff {currency.format(line.tariff)})</span><span>{currency.format(line.amount)}</span></div>)}
                  <div className="my-3 border-t border-sand-100" />
                  <div className="flex justify-between gap-4 text-base font-semibold text-brand-900"><span>Total incl. GST</span><span>{currency.format(booking.total)}</span></div>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-gold-50 p-4 text-xs leading-relaxed text-gold-900 ring-1 ring-gold-200">
                <p className="flex items-center gap-2 font-semibold"><CreditCard className="size-4" />Test payment mode</p>
                <p className="mt-1">These controls record a simulated payment outcome in MongoDB; they do not charge a card.</p>
              </div>
              {paymentMessage && <p role="status" className="mt-4 rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-900">{paymentMessage}</p>}
              {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <Button loading={busy} onClick={() => void pay('success')}>Test success</Button>
                <Button variant="outline" disabled={busy} onClick={() => void pay('failure')}>Test failure</Button>
                <Button variant="ghost" disabled={busy} onClick={() => void pay('pending')}>Leave pending</Button>
              </div>
              <p className="mt-3 text-center text-[0.68rem] text-sand-500">Only a successful server-verified test payment confirms the booking.</p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Step 1 · Guest details</p>
              <h2 id="booking-dialog-title" className="mt-2 pr-8 font-display text-3xl font-semibold tracking-tight text-brand-900">Reserve {room.name}</h2>
              <p className="mt-2 text-sm text-sand-600">{search ? `${search.checkIn} → ${search.checkOut} · ${search.adults} adults, ${search.children} children` : 'Select dates in the booking search before reserving.'}</p>

              {!token && <div className="mt-5 inline-flex rounded-full bg-sand-100 p-1">
                {(['login', 'register'] as const).map((item) => <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${mode === item ? 'bg-brand-800 text-white' : 'text-sand-600'}`}>{item === 'login' ? 'I have an account' : 'Create account'}</button>)}
              </div>}

              <form onSubmit={reserve} className="mt-5 space-y-4">
                {(mode === 'register' || token) && <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />}
                <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                <Input label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required />
                {!token && <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 10 : 1} required hint={mode === 'register' ? 'At least 10 characters.' : undefined} />}
                {!token && mode === 'register' && <label className="flex items-start gap-2.5 text-xs leading-relaxed text-sand-600"><input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required className="mt-0.5 size-4 shrink-0 accent-brand-700" /><span>I agree to the processing of my account and booking details as described in the <Link to="/privacy" className="font-medium text-brand-800 underline underline-offset-2">privacy notice</Link>.</span></label>}
                {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
                <Button type="submit" loading={busy} className="w-full" size="lg">{token ? 'Review booking & total' : mode === 'register' ? 'Create account & continue' : 'Sign in & continue'}</Button>
                <p className="text-center text-[0.68rem] leading-relaxed text-sand-500">Your dates and final tariff are revalidated on the server before the room is held.</p>
              </form>
            </>
          )}
        </motion.section>
      </motion.div>
    </AnimatePresence>
  )
}
