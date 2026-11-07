import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, RefreshCw, Save, UnlockKeyhole } from 'lucide-react'
import { Alert, Button, Input, Select, Spinner } from '../ui'
import { estateApi } from '../../services/estateApi'
import type { EstateRoom } from '../../types/estate'

type InventoryRow = Record<string, any>
const today = () => new Date().toISOString().slice(0, 10)
const plus = (date: string, days: number) => new Date(new Date(`${date}T00:00:00`).getTime() + days * 86_400_000).toISOString().slice(0, 10)

export function AllotmentAdmin({ token }: { token: string }) {
  const [rooms, setRooms] = useState<EstateRoom[]>([])
  const [items, setItems] = useState<InventoryRow[]>([])
  const [from, setFrom] = useState(today())
  const [windowDays, setWindowDays] = useState(14)
  const [editRoomId, setEditRoomId] = useState('')
  const [date, setDate] = useState(today())
  const [total, setTotal] = useState('1')
  const [isClosed, setIsClosed] = useState(false)
  const [blackoutFrom, setBlackoutFrom] = useState(today())
  const [blackoutTo, setBlackoutTo] = useState(plus(today(), 1))
  const [blackoutRoom, setBlackoutRoom] = useState('all')
  const [blackoutMode, setBlackoutMode] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const days = useMemo(() => Array.from({ length: windowDays }, (_, index) => plus(from, index)), [from, windowDays])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [roomResult, calendar] = await Promise.all([
        estateApi.adminList('rooms', token, { page: 1, limit: 100 }),
        estateApi.adminAllotments(token, { from, to: plus(from, windowDays) }),
      ])
      setRooms((roomResult.items as EstateRoom[]).filter((room) => room.active !== false)); setItems(calendar.items)
      setEditRoomId((current) => current || (roomResult.items[0] as EstateRoom | undefined)?._id || '')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Allotment calendar could not be loaded') }
    finally { setLoading(false) }
  }, [token, from, windowDays])
  useEffect(() => { void load() }, [load])

  const byRoomDay = useMemo(() => new Map(items.map((item) => [`${String(item.room?._id)}:${String(item.date).slice(0, 10)}`, item])), [items])

  async function saveAllotment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setNotice(null)
    try {
      await estateApi.adminSetAllotment({ roomId: editRoomId, date, total: Number(total), closed: isClosed }, token)
      setNotice(`Website allotment saved for ${date}.`); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Allotment could not be saved') }
    finally { setSaving(false) }
  }

  async function applyBlackout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setNotice(null)
    try {
      const result = await estateApi.adminSetBlackout(token, { from: blackoutFrom, to: blackoutTo, roomIds: blackoutRoom === 'all' ? undefined : [blackoutRoom], closed: blackoutMode })
      setNotice(`${result.closed ? 'Blackout applied' : 'Blackout removed'} · ${result.rooms} residences · ${result.dates} nights.`)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Blackout dates could not be updated') }
    finally { setSaving(false) }
  }

  function chooseCell(room: EstateRoom, day: string) {
    setEditRoomId(room._id); setDate(day)
    const row = byRoomDay.get(`${room._id}:${day}`)
    setTotal(String(row?.total ?? 1)); setIsClosed(Boolean(row?.closed))
  }

  return <div>
    <div className="mb-6"><p className="text-[0.62rem] font-semibold tracking-[0.2em] text-gold-600 uppercase">Website inventory control</p><h2 className="mt-2 font-display text-3xl font-semibold text-brand-900">Allotment calendar</h2><p className="mt-2 text-sm text-sand-500">The website can only sell the room allotment shown here. Blackouts stop new website sales while preserving existing bookings and holds.</p></div>
    {error && <Alert className="mb-4" variant="danger" title="Inventory update failed">{error}</Alert>}{notice && <Alert className="mb-4" variant="success" title="Inventory updated">{notice}</Alert>}
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-sand-200 bg-white p-4"><label className="text-[0.63rem] text-sand-500">Calendar starts<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block h-10 rounded-xl border border-sand-200 bg-sand-50 px-3 text-xs text-brand-900" /></label><Select label="Days to show" value={String(windowDays)} onChange={(e) => setWindowDays(Number(e.target.value))} className="min-w-32"><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option></Select><Button variant="outline" size="sm" onClick={() => void load()} loading={loading} leading={<RefreshCw className="size-3.5" />}>Refresh calendar</Button><span className="ml-auto flex items-center gap-2 text-xs text-sand-500"><span className="size-2 rounded-full bg-emerald-500" />Available <span className="ml-2 size-2 rounded-full bg-gold-500" />Booked/held <span className="ml-2 size-2 rounded-full bg-red-500" />Blackout</span></div>

    <div className="mb-6 overflow-hidden rounded-2xl border border-sand-200 bg-white">
      {loading ? <div className="flex h-48 items-center justify-center"><Spinner className="size-7" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1150px] border-collapse text-center text-xs"><thead><tr className="bg-sand-50"><th className="sticky left-0 z-10 min-w-48 border-b border-sand-200 bg-sand-50 p-3 text-left text-[0.6rem] tracking-wider text-sand-500 uppercase">Residence</th>{days.map((day) => <th key={day} className="min-w-[58px] border-b border-sand-200 px-1 py-3"><span className="block text-[0.58rem] font-normal text-sand-500">{new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</span><span className="mt-1 block text-xs font-semibold text-brand-900">{day.slice(8, 10)}</span></th>)}</tr></thead><tbody className="divide-y divide-sand-100">{rooms.map((room) => <tr key={room._id}><td className="sticky left-0 z-10 border-r border-sand-100 bg-white p-3 text-left"><p className="font-mono text-[0.6rem] text-sand-500">{room.code}</p><p className="mt-1 truncate font-medium text-brand-900">{room.name}</p></td>{days.map((day) => { const row = byRoomDay.get(`${room._id}:${day}`); const booked = Number(row?.booked ?? 0) + Number(row?.held ?? 0); const closed = Boolean(row?.closed); const capacity = Number(row?.total ?? 0); const available = Math.max(0, capacity - booked); const tone = closed ? 'bg-red-100 text-red-800 hover:bg-red-200' : booked ? 'bg-gold-100 text-gold-900 hover:bg-gold-200' : available ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'bg-sand-100 text-sand-500 hover:bg-sand-200'; return <td key={day} className="p-1"><button type="button" onClick={() => chooseCell(room, day)} title={`${day} · ${available} available · ${booked} booked/held${closed ? ' · blackout' : ''}`} className={`h-9 w-full rounded-lg text-[0.62rem] font-semibold transition ${tone}`}>{closed ? 'BLK' : `${available}/${capacity}`}</button></td>})}</tr>)}</tbody></table>{rooms.length === 0 && <p className="py-10 text-center text-sm text-sand-500">No rooms in the catalogue.</p>}</div>}
      <p className="border-t border-sand-100 px-4 py-3 text-[0.65rem] text-sand-500">Select a cell to edit that residence’s date-specific allotment.</p>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={saveAllotment} className="rounded-2xl border border-sand-200 bg-white p-5"><h3 className="text-sm font-semibold text-brand-900">Set website allotment</h3><p className="mt-1 text-xs text-sand-500">Changing total below current booked/held stock is rejected by the API.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Select label="Residence" value={editRoomId} onChange={(e) => setEditRoomId(e.target.value)} required>{rooms.map((room) => <option key={room._id} value={room._id}>{room.code} · {room.name}</option>)}</Select><Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /><Input label="Website allotment" type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)} required /><label className="flex items-center gap-2 self-end pb-3 text-sm text-sand-700"><input type="checkbox" checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} className="size-4 accent-brand-700" />Close sales on this date</label></div><Button type="submit" loading={saving} className="mt-4" leading={<Save className="size-4" />}>Save allotment</Button></form>

      <form onSubmit={applyBlackout} className="rounded-2xl border border-sand-200 bg-white p-5"><div className="flex items-center gap-2"><Ban className="size-4 text-red-600" /><h3 className="text-sm font-semibold text-brand-900">Blackout dates</h3></div><p className="mt-1 text-xs text-sand-500">Date range is end-exclusive. Stop new website sales across one or all residences without cancelling existing bookings or holds.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><Input label="From" type="date" value={blackoutFrom} onChange={(e) => setBlackoutFrom(e.target.value)} required /><Input label="To (exclusive)" type="date" value={blackoutTo} onChange={(e) => setBlackoutTo(e.target.value)} required /><Select label="Scope" value={blackoutRoom} onChange={(e) => setBlackoutRoom(e.target.value)}><option value="all">All active residences</option>{rooms.map((room) => <option key={room._id} value={room._id}>{room.code} · {room.name}</option>)}</Select><Select label="Action" value={blackoutMode ? 'close' : 'open'} onChange={(e) => setBlackoutMode(e.target.value === 'close')}><option value="close">Apply blackout</option><option value="open">Remove blackout</option></Select></div><Button type="submit" loading={saving} className="mt-4" variant={blackoutMode ? 'danger' : 'primary'} leading={blackoutMode ? <Ban className="size-4" /> : <UnlockKeyhole className="size-4" />}>{blackoutMode ? 'Apply blackout' : 'Reopen sales'}</Button></form>
    </div>
  </div>
}
