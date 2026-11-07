import { useCallback, useEffect, useState } from 'react'
import { BedDouble, Pencil, Plus, RefreshCw, Save, X } from 'lucide-react'
import { Alert, Button, Input, Select, Spinner, Textarea } from '../ui'
import { estateApi } from '../../services/estateApi'
import type { EstateRoom } from '../../types/estate'

type RoomFormState = { code: string; name: string; kind: 'room' | 'villa'; category: string; description: string; adults: string; children: string; bedrooms: string; areaSqm: string; baseRate: string; image: string }
const initial: RoomFormState = { code: '', name: '', kind: 'room', category: 'Garden Room', description: '', adults: '2', children: '0', bedrooms: '1', areaSqm: '42', baseRate: '8500', image: '' }
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function RoomsAdmin({ token }: { token: string }) {
  const [rooms, setRooms] = useState<EstateRoom[]>([])
  const [form, setForm] = useState(initial)
  const [editing, setEditing] = useState<EstateRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { const result = await estateApi.adminList('rooms', token, { page: 1, limit: 100 }); setRooms(result.items as EstateRoom[]) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Rooms could not be loaded') }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])
  const set = (field: keyof RoomFormState, value: string) => setForm((current) => ({ ...current, [field]: value }))

  function beginEdit(room: EstateRoom) {
    setEditing(room)
    setForm({ code: room.code, name: room.name, kind: room.kind, category: room.category, description: room.description, adults: String(room.capacity.adults), children: String(room.capacity.children), bedrooms: String(room.bedrooms), areaSqm: String(room.areaSqm), baseRate: String(room.baseRate), image: room.images[0] ?? '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function reset() { setEditing(null); setForm(initial) }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setNotice(null)
    const input = { code: form.code, name: form.name, kind: form.kind, category: form.category, description: form.description, capacity: { adults: Number(form.adults), children: Number(form.children) }, bedrooms: Number(form.bedrooms), areaSqm: Number(form.areaSqm), baseRate: Number(form.baseRate), amenities: editing?.amenities ?? [], images: form.image ? [form.image] : editing?.images ?? [], active: editing?.active ?? true }
    try {
      if (editing) await estateApi.adminUpdateRoom(editing._id, input, token)
      else await estateApi.adminCreateRoom(input, token)
      setNotice(editing ? 'Residence updated.' : 'Residence created.')
      reset(); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Room could not be saved') }
    finally { setSaving(false) }
  }

  async function toggleActive(room: EstateRoom) {
    setError(null)
    try { await estateApi.adminUpdateRoom(room._id, { active: !(room as EstateRoom & { active?: boolean }).active }, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Room status could not be changed') }
  }

  return <div>
    <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-[0.62rem] font-semibold tracking-[0.2em] text-gold-600 uppercase">Accommodation inventory</p><h2 className="mt-2 font-display text-3xl font-semibold text-brand-900">Rooms & villas</h2><p className="mt-2 text-sm text-sand-500">Edit the bookable catalogue. Deactivate a residence to remove it from guest search.</p></div><Button variant="outline" size="sm" onClick={() => void load()} leading={<RefreshCw className="size-4" />}>Refresh</Button></div>
    {error && <Alert className="mb-4" variant="danger" title="Room action failed">{error}</Alert>}{notice && <Alert className="mb-4" variant="success" title="Saved">{notice}</Alert>}
    <form onSubmit={submit} className="mb-6 rounded-2xl border border-sand-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><BedDouble className="size-4" /></span><div><h3 className="text-sm font-semibold text-brand-900">{editing ? `Edit ${editing.code}` : 'Add a residence'}</h3><p className="text-xs text-sand-500">Changes save directly to the catalogue.</p></div></div>{editing && <Button type="button" size="sm" variant="ghost" onClick={reset} leading={<X className="size-4" />}>Cancel edit</Button>}</div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Input label="Inventory code" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} required disabled={Boolean(editing)} />
        <Input label="Display name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        <Select label="Type" value={form.kind} onChange={(e) => set('kind', e.target.value as 'room' | 'villa')}><option value="room">Room / suite</option><option value="villa">Villa</option></Select>
        <Input label="Category" value={form.category} onChange={(e) => set('category', e.target.value)} required />
        <Input label="Adults" type="number" min="1" value={form.adults} onChange={(e) => set('adults', e.target.value)} required />
        <Input label="Children" type="number" min="0" value={form.children} onChange={(e) => set('children', e.target.value)} required />
        <Input label="Bedrooms" type="number" min="1" value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} required />
        <Input label="Area (m²)" type="number" min="1" value={form.areaSqm} onChange={(e) => set('areaSqm', e.target.value)} required />
        <Input label="Base tariff / night (INR)" type="number" min="0" value={form.baseRate} onChange={(e) => set('baseRate', e.target.value)} required />
        <Input label="Image URL (optional)" type="url" value={form.image} onChange={(e) => set('image', e.target.value)} />
        <div className="sm:col-span-2 xl:col-span-4"><Textarea label="Description" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} required /></div>
      </div>
      <Button type="submit" className="mt-4" loading={saving} leading={editing ? <Save className="size-4" /> : <Plus className="size-4" />}>{editing ? 'Save residence' : 'Create residence'}</Button>
    </form>

    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
      <div className="flex items-center justify-between border-b border-sand-100 px-5 py-4"><div><h3 className="text-sm font-semibold text-brand-900">Estate inventory</h3><p className="mt-1 text-xs text-sand-500">{rooms.length} loaded residences</p></div></div>
      {loading ? <div className="flex h-48 items-center justify-center"><Spinner className="size-7" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-sand-50 text-[0.6rem] tracking-[0.14em] text-sand-500 uppercase"><tr>{['Code / residence', 'Category', 'Guests', 'Base tariff', 'Status', 'Actions'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-sand-100">{rooms.map((room) => { const active = (room as EstateRoom & { active?: boolean }).active !== false; return <tr key={room._id} className="hover:bg-sand-50/60"><td className="px-4 py-3.5"><p className="font-mono text-xs text-sand-500">{room.code}</p><p className="mt-1 font-semibold text-brand-900">{room.name}</p></td><td className="px-4 py-3.5 text-sand-600">{room.category}</td><td className="px-4 py-3.5 text-sand-600">{room.capacity.adults} adults · {room.bedrooms} bd</td><td className="px-4 py-3.5 font-medium text-brand-900">{money.format(room.baseRate)}</td><td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-sand-100 text-sand-500'}`}>{active ? 'Active' : 'Hidden'}</span></td><td className="px-4 py-3.5"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => beginEdit(room)} leading={<Pencil className="size-3.5" />}>Edit</Button><Button size="sm" variant="ghost" onClick={() => void toggleActive(room)}>{active ? 'Deactivate' : 'Activate'}</Button></div></td></tr>})}</tbody></table></div>}
    </div>
  </div>
}
