import { useCallback, useEffect, useState } from 'react'
import { BadgePercent, Plus, Power, RefreshCw } from 'lucide-react'
import { Alert, Button, Input, Select, Spinner, Textarea } from '../ui'
import { estateApi } from '../../services/estateApi'

type Promo = { _id: string; code: string; description: string; kind: 'fixed' | 'percent'; value: number; minSpend: number; maxDiscount?: number; startsAt: string; endsAt: string; usageLimit?: number; usedCount: number; active: boolean }
const localDateTime = (date: Date) => { const pad = (n: number) => String(n).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}` }

export function PromosAdmin({ token }: { token: string }) {
  const [promos, setPromos] = useState<Promo[]>([])
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<'fixed' | 'percent'>('percent')
  const [value, setValue] = useState('10')
  const [minSpend, setMinSpend] = useState('0')
  const [maxDiscount, setMaxDiscount] = useState('')
  const [startsAt, setStartsAt] = useState(localDateTime(new Date()))
  const [endsAt, setEndsAt] = useState(localDateTime(new Date(Date.now() + 365 * 86_400_000)))
  const [usageLimit, setUsageLimit] = useState('100')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { const result = await estateApi.adminList('promos', token, { page: 1, limit: 100 }); setPromos(result.items as Promo[]) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Promo codes could not be loaded') }
    finally { setLoading(false) }
  }, [token])
  useEffect(() => { void load() }, [load])

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setNotice(null)
    try {
      await estateApi.adminCreatePromo({ code: code.toUpperCase(), description, kind, value: Number(value), minSpend: Number(minSpend), ...(maxDiscount ? { maxDiscount: Number(maxDiscount) } : {}), startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), ...(usageLimit ? { usageLimit: Number(usageLimit) } : {}) }, token)
      setNotice(`Promo ${code.toUpperCase()} created.`); setCode(''); setDescription(''); await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Promo could not be created') }
    finally { setSaving(false) }
  }

  async function toggle(promo: Promo) {
    setError(null)
    try { await estateApi.adminUpdatePromo(promo._id, { active: !promo.active }, token); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Promo status could not be changed') }
  }

  return <div>
    <div className="mb-6"><p className="text-[0.62rem] font-semibold tracking-[0.2em] text-gold-600 uppercase">Guest offers</p><h2 className="mt-2 font-display text-3xl font-semibold text-brand-900">Promo codes</h2><p className="mt-2 text-sm text-sand-500">Create and activate date-bounded offers. The booking API validates limits and computes discounts.</p></div>
    {error && <Alert className="mb-4" variant="danger" title="Promo action failed">{error}</Alert>}{notice && <Alert className="mb-4" variant="success" title="Promo saved">{notice}</Alert>}
    <form onSubmit={create} className="mb-6 rounded-2xl border border-sand-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-xl bg-gold-50 text-gold-700"><BadgePercent className="size-4" /></span><div><h3 className="text-sm font-semibold text-brand-900">Create promotion</h3><p className="text-xs text-sand-500">New promo code is active immediately.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Input label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))} required maxLength={32} />
        <Select label="Discount type" value={kind} onChange={(e) => setKind(e.target.value as 'fixed' | 'percent')}><option value="percent">Percent</option><option value="fixed">Fixed INR</option></Select>
        <Input label={kind === 'percent' ? 'Percent off' : 'INR off'} type="number" min="0.01" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} required />
        <Input label="Minimum spend (INR)" type="number" min="0" value={minSpend} onChange={(e) => setMinSpend(e.target.value)} required />
        <Input label="Maximum discount (optional)" type="number" min="0.01" value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} />
        <Input label="Usage limit (optional)" type="number" min="1" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
        <Input label="Starts at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
        <Input label="Ends at" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
        <div className="sm:col-span-2 xl:col-span-4"><Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Guest-facing offer description" /></div>
      </div>
      <Button type="submit" loading={saving} className="mt-4" leading={<Plus className="size-4" />}>Create promo code</Button>
    </form>

    <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white"><div className="flex items-center justify-between border-b border-sand-100 px-5 py-4"><div><h3 className="text-sm font-semibold text-brand-900">Promotion inventory</h3><p className="mt-1 text-xs text-sand-500">{promos.length} codes</p></div><Button size="sm" variant="outline" onClick={() => void load()} leading={<RefreshCw className="size-3.5" />}>Refresh</Button></div>
      {loading ? <div className="flex h-44 items-center justify-center"><Spinner className="size-7" /></div> : <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-sand-50 text-[0.6rem] tracking-[0.14em] text-sand-500 uppercase"><tr>{['Code / offer', 'Discount', 'Validity', 'Redemptions', 'Status', 'Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-sand-100">{promos.map((promo) => <tr key={promo._id} className="hover:bg-sand-50/60"><td className="px-4 py-3.5"><p className="font-mono font-semibold text-brand-900">{promo.code}</p><p className="mt-1 text-xs text-sand-500">{promo.description || 'Estate promotion'}</p></td><td className="px-4 py-3.5 font-medium text-brand-800">{promo.kind === 'percent' ? `${promo.value}%` : `₹${promo.value}`}<p className="mt-1 text-[0.63rem] font-normal text-sand-500">Min ₹{promo.minSpend}</p></td><td className="px-4 py-3.5 text-xs text-sand-600">{new Date(promo.startsAt).toLocaleDateString()} – {new Date(promo.endsAt).toLocaleDateString()}</td><td className="px-4 py-3.5 text-sand-600">{promo.usedCount}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}</td><td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${promo.active ? 'bg-emerald-50 text-emerald-700' : 'bg-sand-100 text-sand-500'}`}>{promo.active ? 'Active' : 'Inactive'}</span></td><td className="px-4 py-3.5"><Button size="sm" variant={promo.active ? 'outline' : 'primary'} onClick={() => void toggle(promo)} leading={<Power className="size-3.5" />}>{promo.active ? 'Deactivate' : 'Activate'}</Button></td></tr>)}</tbody></table>{promos.length === 0 && <p className="py-12 text-center text-sm text-sand-500">No promotion codes created.</p>}</div>}
    </div>
  </div>
}
