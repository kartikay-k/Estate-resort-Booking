import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Check, CircleAlert } from 'lucide-react'
import { Container, Spinner } from '../../components/ui'
import { estateApi, getAuthToken } from '../../services/estateApi'
import type { BookingRecord } from '../../types/estate'

/** Server-backed confirmation lookup for a guest's authenticated booking. */
export default function ConfirmationPage() {
  const { id } = useParams()
  const [booking, setBooking] = useState<BookingRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getAuthToken()
    if (!id || !token) { setError('Sign in with the account used for this booking to view its confirmation.'); setLoading(false); return }
    estateApi.booking(id, token).then(setBooking).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Booking could not be loaded')).finally(() => setLoading(false))
  }, [id])

  return <Container className="flex min-h-[65vh] items-center justify-center py-16"><section className="w-full max-w-xl rounded-[28px] border border-sand-200 bg-white p-8 text-center shadow-lift sm:p-12">
    {loading ? <Spinner className="mx-auto size-8" /> : error ? <><CircleAlert className="mx-auto size-10 text-gold-600" /><h1 className="mt-4 font-display text-3xl font-semibold text-brand-900">Confirmation unavailable</h1><p className="mt-3 text-sm text-sand-600">{error}</p></> : booking ? <><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-800"><Check className="size-7" /></span><p className="mt-5 text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">{booking.status === 'confirmed' ? 'Reservation confirmed' : `Payment ${booking.paymentStatus}`}</p><h1 className="mt-2 font-display text-3xl font-semibold text-brand-900">{booking.reference}</h1><p className="mt-3 text-sm text-sand-600">{booking.checkIn.slice(0, 10)} → {booking.checkOut.slice(0, 10)} · {booking.nights} nights</p><p className="mt-2 font-semibold text-brand-900">Total {new Intl.NumberFormat('en-IN', { style: 'currency', currency: booking.currency || 'INR', maximumFractionDigits: 0 }).format(booking.total)}</p></> : null}
    <Link to="/" className="mt-8 inline-flex h-11 items-center rounded-full bg-brand-800 px-6 text-sm font-medium text-white transition hover:bg-brand-700">Return to EstateStay</Link>
  </section></Container>
}
