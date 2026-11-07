import { useCallback, useEffect, useState } from 'react'
import { Download, Search, SlidersHorizontal } from 'lucide-react'
import { Alert, Button, Select, Spinner } from '../ui'
import { estateApi } from '../../services/estateApi'

const STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'] as const
const today = () => new Date().toISOString().slice(0, 10)
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const dateLabel = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export function BookingsAdmin({ token }: { token: string }) {
  const [items, setItems] = useState<Record<string, any>[]>([])
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const [exportDate, setExportDate] = useState(today())
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { const result = await estateApi.adminBookings(token, { status, from: from || undefined, to: to || undefined, search: search || undefined, limit: 100 }); setItems(result.items) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Bookings could not be loaded') }
    finally { setLoading(false) }
  }, [token, status, from, to, search])
  useEffect(() => { void load() }, [load])

  async function updateStatus(id: string, nextStatus: string) {
    setBusyId(id); setError(null)
    try { await estateApi.adminUpdateBooking(id, nextStatus, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Booking update failed') }
    finally { setBusyId(null) }
  }

  async function exportCsv() {
    setError(null)
    try {
      const blob = await estateApi.adminExportCsv(token, exportDate, status)
      const url = URL.createObjectURL(blob); const link = document.createElement('a')
      link.href = url; link.download = `estatestay-bookings-${exportDate}.csv`; link.click(); URL.revokeObjectURL(url)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'CSV export failed') }
  }

  return <div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[0.62rem] font-semibold tracking-[0.2em] text-gold-600 uppercase">Reservations desk</p><h2 className="mt-2 font-display text-3xl font-semibold text-brand-900">Booking management</h2><p className="mt-2 text-sm text-sand-500">Search reservations, update status, and export daily arrivals.</p></div><div className="flex flex-wrap items-end gap-2 rounded-2xl border border-sand-200 bg-white p-3"><label className="text-[0.65rem] text-sand-500">CSV check-in date<input type="date" value={exportDate} onChange={(e) => setExportDate(e.target.value)} className="mt-1 block h-9 rounded-lg border border-sand-200 bg-sand-50 px-2 text-xs text-brand-900" /></label><Button size="sm" onClick={() => void exportCsv()} leading={<Download className="size-4" />}>Export CSV</Button></div></div>

    <div className="mb-4 grid gap-3 rounded-2xl border border-sand-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
      <label className="relative sm:col-span-2 xl:col-span-1"><span className="sr-only">Search bookings</span><Search className="absolute top-3 left-3 size-4 text-sand-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, reference" className="h-10 w-full rounded-xl border border-sand-200 bg-sand-50 pl-9 pr-3 text-sm outline-none focus:border-brand-500" /></label>
      <Select aria-label="Booking status" value={status} onChange={(e) => setStatus(e.target.value)} className="h-10"><option value="all">All statuses</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</Select>
      <label className="text-[0.63rem] text-sand-500">Check-in from<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-sand-200 bg-sand-50 px-3 text-xs text-brand-900" /></label>
      <label className="text-[0.63rem] text-sand-500">Check-in to<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block h-10 w-full rounded-xl border border-sand-200 bg-sand-50 px-3 text-xs text-brand-900" /></label>
      <Button variant="outline" className="h-10 self-end" onClick={() => void load()} leading={<SlidersHorizontal className="size-4" />}>Apply filters</Button>
    </div>

    {error && <Alert className="mb-4" variant="danger" title="Action failed">{error}</Alert>}
    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
      {loading ? <div className="flex h-56 items-center justify-center"><Spinner className="size-7" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[970px] text-left text-sm"><thead className="bg-sand-50 text-[0.62rem] font-semibold tracking-[0.14em] text-sand-500 uppercase"><tr>{['Reference / guest', 'Residence', 'Stay', 'Total', 'Payment', 'Booking status'].map((head) => <th key={head} className="px-4 py-3.5">{head}</th>)}</tr></thead><tbody className="divide-y divide-sand-100">{items.map((booking) => {
        const room = booking.room as { name?: string; code?: string } | undefined
        return <tr key={booking._id} className="transition hover:bg-sand-50/70"><td className="px-4 py-4"><p className="font-mono text-xs font-semibold text-brand-800">{booking.reference}</p><p className="mt-1 text-sm font-medium text-brand-900">{booking.guestSnapshot?.name ?? 'Guest'}</p><p className="mt-0.5 text-xs text-sand-500">{booking.guestSnapshot?.email}</p></td><td className="px-4 py-4"><p className="font-medium text-brand-900">{room?.name ?? room?.code ?? 'Residence'}</p><p className="mt-1 text-xs text-sand-500">{booking.guests?.adults} adults · {booking.nights} nights</p></td><td className="px-4 py-4 text-xs text-sand-600">{dateLabel(booking.checkIn)}<br /><span className="text-sand-400">to {dateLabel(booking.checkOut)}</span></td><td className="px-4 py-4"><p className="font-semibold text-brand-900">{money.format(booking.total)}</p><p className="mt-1 text-[0.65rem] text-sand-500">GST {money.format(booking.tax)}</p></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${booking.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : booking.paymentStatus === 'failed' ? 'bg-red-50 text-red-700' : 'bg-gold-50 text-gold-800'}`}>{booking.paymentStatus ?? 'pending'}</span></td><td className="px-4 py-4"><div className="flex items-center gap-2"><select value={booking.status} disabled={busyId === booking._id} onChange={(e) => void updateStatus(booking._id, e.target.value)} className="h-9 rounded-lg border border-sand-200 bg-white px-2 text-xs capitalize text-brand-900 disabled:opacity-50">{STATUSES.map((value) => <option key={value}>{value}</option>)}</select>{busyId === booking._id && <Spinner className="size-4" />}</div></td></tr>
      })}</tbody></table>{items.length === 0 && <p className="py-16 text-center text-sm text-sand-500">No bookings match these filters.</p>}</div>}
    </div>
    <p className="mt-3 text-right text-xs text-sand-500">Showing {items.length} reservations (up to 100 per request)</p>
  </div>
}
