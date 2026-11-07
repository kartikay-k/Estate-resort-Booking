import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, RefreshCw, Save } from 'lucide-react'
import { Alert, Button, Input, Select, Spinner } from '../ui'
import { estateApi } from '../../services/estateApi'
import type { EstateRoom } from '../../types/estate'

type RateRow = Record<string, any>
type RatePlanOption = { _id: string; code: string; name: string }
const today = () => new Date().toISOString().slice(0, 10)
const plus = (date: string, days: number) => new Date(new Date(`${date}T00:00:00`).getTime() + days * 86_400_000).toISOString().slice(0, 10)
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function RatesAdmin({ token }: { token: string }) {
  const [rooms, setRooms] = useState<EstateRoom[]>([])
  const [plans, setPlans] = useState<RatePlanOption[]>([])
  const [rows, setRows] = useState<RateRow[]>([])
  const [roomId, setRoomId] = useState('')
  const [planId, setPlanId] = useState('')
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(plus(today(), 14))
  const [date, setDate] = useState(today())
  const [amount, setAmount] = useState('')
  const [closed, setClosed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadOptions = useCallback(async () => {
    try {
      const [roomResult, planResult] = await Promise.all([estateApi.adminList('rooms', token, { page: 1, limit: 100 }), estateApi.adminList('rateplans', token, { page: 1, limit: 100 })])
      const nextRooms = roomResult.items as EstateRoom[]; const nextPlans = planResult.items as RatePlanOption[]
      setRooms(nextRooms); setPlans(nextPlans)
      setRoomId((current) => current || nextRooms[0]?._id || '')
      setPlanId((current) => current || nextPlans[0]?._id || '')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Rate editor options could not be loaded') }
  }, [token])
  const loadRates = useCallback(async () => {
    if (!roomId || !from || !to) return
    setLoading(true); setError(null)
    try { const result = await estateApi.adminRates(token, { from, to, roomId }); setRows(result.items) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Daily rates could not be loaded') }
    finally { setLoading(false) }
  }, [token, roomId, from, to])
  useEffect(() => { void loadOptions() }, [loadOptions])
  useEffect(() => { void loadRates() }, [loadRates])

  async function saveRate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setNotice(null)
    try {
      await estateApi.adminSetRate({ roomId, ratePlanId: planId, date, amount: Number(amount), closed }, token)
      setNotice('Daily rate saved to MongoDB.'); await loadRates()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Daily rate could not be saved') }
    finally { setSaving(false) }
  }
  function editRow(row: RateRow) {
    setDate(String(row.date).slice(0, 10)); setAmount(String(row.amount)); setClosed(Boolean(row.closed)); setPlanId(row.ratePlan?._id ?? planId)
  }

  return <div>
    <div className="mb-6"><p className="text-[0.62rem] font-semibold tracking-[0.2em] text-gold-600 uppercase">Yield management</p><h2 className="mt-2 font-display text-3xl font-semibold text-brand-900">Daily rates</h2><p className="mt-2 text-sm text-sand-500">Set room-by-room tariffs per rate plan and night. Booking totals and GST are recalculated server-side.</p></div>
    {error && <Alert className="mb-4" variant="danger" title="Rate management error">{error}</Alert>}{notice && <Alert className="mb-4" variant="success" title="Rate saved">{notice}</Alert>}
    <form onSubmit={saveRate} className="mb-5 rounded-2xl border border-sand-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2"><CalendarClock className="size-4 text-gold-600" /><h3 className="text-sm font-semibold text-brand-900">Set a nightly rate</h3></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Select label="Residence" value={roomId} onChange={(e) => setRoomId(e.target.value)} required>{rooms.map((room) => <option key={room._id} value={room._id}>{room.code} · {room.name}</option>)}</Select>
        <Select label="Rate plan" value={planId} onChange={(e) => setPlanId(e.target.value)} required>{plans.map((plan) => <option key={plan._id} value={plan._id}>{plan.name}</option>)}</Select>
        <Input label="Night" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input label="Tariff (INR)" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-sand-700"><input type="checkbox" checked={closed} onChange={(e) => setClosed(e.target.checked)} className="size-4 accent-brand-700" />Close this rate</label>
      </div>
      <Button type="submit" loading={saving} className="mt-4" leading={<Save className="size-4" />}>Save daily rate</Button>
    </form>

    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-sand-200 bg-white p-4">
      <Select label="Residence calendar" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="min-w-56">{rooms.map((room) => <option key={room._id} value={room._id}>{room.code} · {room.name}</option>)}</Select>
      <label className="text-[0.63rem] text-sand-500">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block h-10 rounded-xl border border-sand-200 bg-sand-50 px-3 text-xs text-brand-900" /></label>
      <label className="text-[0.63rem] text-sand-500">To (exclusive)<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block h-10 rounded-xl border border-sand-200 bg-sand-50 px-3 text-xs text-brand-900" /></label>
      <Button variant="outline" size="sm" onClick={() => void loadRates()} leading={<RefreshCw className="size-3.5" />}>Refresh calendar</Button>
    </div>
    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
      {loading ? <div className="flex h-44 items-center justify-center"><Spinner className="size-7" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-sand-50 text-[0.6rem] tracking-[0.14em] text-sand-500 uppercase"><tr>{['Date', 'Residence', 'Rate plan', 'Nightly tariff', 'State', 'Edit'].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody className="divide-y divide-sand-100">{rows.map((row) => <tr key={row._id} className="hover:bg-sand-50/60"><td className="px-4 py-3 text-sand-700">{String(row.date).slice(0, 10)}</td><td className="px-4 py-3 font-medium text-brand-900">{row.room?.code} · {row.room?.name}</td><td className="px-4 py-3 text-sand-600">{row.ratePlan?.name}</td><td className="px-4 py-3 font-semibold text-brand-900">{money.format(row.amount)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[0.63rem] ${row.closed ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{row.closed ? 'Closed' : 'Open'}</span></td><td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => editRow(row)}>Load into editor</Button></td></tr>)}</tbody></table>{rows.length === 0 && <p className="py-12 text-center text-sm text-sand-500">No daily rates for this residence and date range.</p>}</div>}
    </div>
  </div>
}
