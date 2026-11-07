import { useState } from 'react'
import type { FormEvent } from 'react'
import { BadgeCheck, CircleHelp, SearchCheck } from 'lucide-react'
import { Alert, Button, Container, Input } from '../../components/ui'
import { estateApi } from '../../services/estateApi'
import type { BookingLookupResult } from '../../types/estate'

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const dateLabel = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export default function MyBookingsPage() {
  const [reference, setReference] = useState('')
  const [email, setEmail] = useState('')
  const [booking, setBooking] = useState<BookingLookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(null); setBooking(null)
    try { setBooking(await estateApi.lookupBooking({ reference: reference.trim().toUpperCase(), email: email.trim().toLowerCase() })) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not verify that reservation. Check the reference and booking email.') }
    finally { setLoading(false) }
  }

  return <>
    <section className="bg-brand-950 px-4 pt-32 pb-14 text-sand-50 sm:px-6 lg:px-8"><Container><p className="text-[0.65rem] font-semibold tracking-[0.25em] text-gold-300 uppercase">Guest services</p><h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">My bookings</h1><p className="mt-4 max-w-2xl text-sm leading-relaxed text-sand-300 sm:text-base">Look up your reservation using its reference and the email address used at booking. We verify both details before showing booking information.</p></Container></section>
    <section className="min-h-[55vh] bg-sand-50 px-4 py-14 sm:px-6 lg:px-8"><Container className="max-w-3xl">
      <form onSubmit={lookup} className="rounded-[26px] border border-sand-200 bg-white p-6 shadow-lift sm:p-8">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><SearchCheck className="size-5" /></span><div><h2 className="font-display text-2xl font-semibold text-brand-900">Verify your reservation</h2><p className="mt-1 text-xs leading-relaxed text-sand-500">Your booking reference is in your reservation confirmation. Enter the exact booking email as a second verification detail.</p></div></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><Input label="Booking reference" value={reference} onChange={(event) => setReference(event.target.value.toUpperCase())} placeholder="ES-…" autoComplete="off" required minLength={8} maxLength={80} /><Input label="Booking email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required /></div>
        {error && <Alert className="mt-4" variant="warning" title="Reservation not verified">{error}</Alert>}
        <Button className="mt-5" type="submit" loading={loading} leading={<SearchCheck className="size-4" />}>Find my booking</Button>
      </form>

      {booking && <article className="mt-6 overflow-hidden rounded-[26px] border border-brand-200 bg-white shadow-lift">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-50 px-6 py-5"><div><p className="text-[0.6rem] font-semibold tracking-[0.2em] text-brand-600 uppercase">Verified reservation</p><h2 className="mt-1 font-mono text-lg font-semibold text-brand-900">{booking.reference}</h2></div><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold capitalize text-brand-800 ring-1 ring-brand-200"><BadgeCheck className="size-4" />{booking.status.replace('_', ' ')}</span></div>
        <div className="grid gap-0 sm:grid-cols-2">
          <div className="space-y-4 border-b border-sand-100 p-6 sm:border-r"><div><p className="text-[0.6rem] font-semibold tracking-wider text-sand-500 uppercase">Residence</p><p className="mt-1 font-display text-xl font-semibold text-brand-900">{booking.room.name}</p><p className="mt-1 text-xs text-sand-500">{booking.room.category} · {booking.ratePlan.name}</p></div><div><p className="text-[0.6rem] font-semibold tracking-wider text-sand-500 uppercase">Stay dates</p><p className="mt-1 text-sm font-medium text-brand-900">{dateLabel(booking.checkIn)} — {dateLabel(booking.checkOut)}</p><p className="mt-1 text-xs text-sand-500">{booking.nights} nights · {booking.guests.adults} adults · {booking.guests.children} children</p></div></div>
          <div className="space-y-3 p-6"><div className="flex justify-between gap-3 text-sm"><span className="text-sand-600">Room tariff</span><span>{money.format(booking.subtotal)}</span></div>{booking.discount > 0 && <div className="flex justify-between gap-3 text-sm text-brand-700"><span>Discount</span><span>−{money.format(booking.discount)}</span></div>}<div className="flex justify-between gap-3 text-sm"><span className="text-sand-600">GST</span><span>{money.format(booking.tax)}</span></div><div className="border-t border-sand-100 pt-3"><div className="flex justify-between gap-3 font-semibold text-brand-900"><span>Total</span><span>{money.format(booking.total)}</span></div><p className="mt-2 text-xs text-sand-500">Payment status: <span className="font-medium capitalize text-brand-800">{booking.paymentStatus}</span></p></div></div>
        </div>
        <div className="flex items-start gap-2 border-t border-sand-100 bg-sand-50 px-6 py-4 text-[0.68rem] leading-relaxed text-sand-600"><CircleHelp className="mt-0.5 size-4 shrink-0 text-gold-600" />For changes or help with this reservation, contact the EstateStay reservations team. Verification checks your booking reference and booking email; no full contact information is exposed here.</div>
      </article>}
    </Container></section>
  </>
}
