import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Bot, CircleHelp, Mail, MessageCircle, Plus, RefreshCw, Send, Sparkles, Globe2 } from 'lucide-react'
import { Alert, Button, Input, Select, Spinner, Textarea } from '../ui'
import { estateApi } from '../../services/estateApi'

type EnquiryRow = Record<string, any>
type StaffOption = { _id: string; name: string; email: string; role: string; staffDepartment?: string }
const CATEGORIES = ['unsorted', 'booking', 'wedding', 'corporate', 'experience', 'complaint', 'general']
const STATUSES = ['unsorted', 'new', 'routed', 'in_progress', 'resolved', 'spam']
const SOURCES = ['website', 'email', 'whatsapp'] as const
const categoryLabel: Record<string, string> = { unsorted: 'Unsorted', booking: 'Booking', wedding: 'Wedding', corporate: 'Corporate', experience: 'Experience', complaint: 'Complaint', general: 'General' }

function SourceIcon({ source }: { source: string }) {
  const Icon = source === 'whatsapp' ? MessageCircle : source === 'email' ? Mail : Globe2
  return <Icon className="size-3.5" />
}

export function EnquiriesAdmin({ token }: { token: string }) {
  const [items, setItems] = useState<EnquiryRow[]>([])
  const [staff, setStaff] = useState<StaffOption[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [source, setSource] = useState('all')
  const [alertGM, setAlertGM] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showSimulate, setShowSimulate] = useState(false)
  const [simulateSource, setSimulateSource] = useState<(typeof SOURCES)[number]>('email')
  const [draft, setDraft] = useState('')
  const [commercial, setCommercial] = useState<Record<string, any> | null>(null)
  const [simulation, setSimulation] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const selected = items.find((item) => item._id === selectedId) ?? items[0]

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [inbox, userList] = await Promise.all([
        estateApi.adminEnquiries(token, { status, category, source, search, alertGM, limit: 100 }),
        estateApi.adminList('users', token, { page: 1, limit: 100 }),
      ])
      setItems(inbox.items)
      setStaff((userList.items as StaffOption[]).filter((user) => user.role === 'reservations_staff'))
      setSelectedId((current) => inbox.items.some((item) => item._id === current) ? current : inbox.items[0]?._id ?? '')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Enquiry inbox could not be loaded') }
    finally { setLoading(false) }
  }, [token, status, category, source, search, alertGM])
  useEffect(() => { void load() }, [load])
  useEffect(() => { setDraft(selected?.ai?.replyDraft ?? ''); setCommercial(null) }, [selected?._id, selected?.ai?.replyDraft])

  const confidence = selected?.ai?.confidence ?? selected?.routing?.confidence

  async function updateSelected(input: Record<string, unknown>, successMessage: string) {
    if (!selected) return
    setBusy(true); setError(null); setNotice(null)
    try { await estateApi.adminUpdateEnquiry(selected._id, input, token); setNotice(successMessage); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Enquiry update failed') }
    finally { setBusy(false) }
  }

  async function classify() {
    if (!selected) return
    setBusy(true); setError(null); setNotice(null)
    try { await estateApi.adminClassifyEnquiry(selected._id, token); setNotice('AI classification refreshed. Review before following up.'); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Classification failed') }
    finally { setBusy(false) }
  }

  async function generateDraft() {
    if (!selected) return
    setBusy(true); setError(null); setNotice(null)
    try { const result = await estateApi.adminDraftEnquiryReply(selected._id, token); setDraft(result.replyDraft); setCommercial(result.commercialContext); setNotice('Reply draft saved for staff review. It has not been sent.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Draft generation failed') }
    finally { setBusy(false) }
  }

  async function simulate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setNotice(null)
    try {
      const result = await estateApi.adminSimulateEnquiry({ ...simulation, source: simulateSource, phone: simulation.phone || undefined }, token)
      setNotice(`${result.reference} received via ${simulateSource} and routed to ${result.category}.`); setSimulation({ name: '', email: '', phone: '', subject: '', message: '' }); setShowSimulate(false); setStatus('all'); setCategory('all'); setSource('all'); await load()
      setSelectedId(result.id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Simulated enquiry could not be created') }
    finally { setBusy(false) }
  }

  return <div>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[0.62rem] font-semibold tracking-[0.2em] text-gold-600 uppercase">Guest communications</p><h2 className="mt-2 font-display text-3xl font-semibold text-brand-900">Unified enquiry inbox</h2><p className="mt-2 text-sm text-sand-500">Website, email, and WhatsApp in one review queue. AI drafts never send automatically.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void load()} leading={<RefreshCw className="size-3.5" />}>Refresh</Button><Button size="sm" onClick={() => setShowSimulate((current) => !current)} leading={<Plus className="size-4" />}>Simulate enquiry</Button></div></div>
    {error && <Alert className="mb-4" variant="danger" title="Inbox action failed">{error}</Alert>}{notice && <Alert className="mb-4" variant="success" title="Saved">{notice}</Alert>}

    {showSimulate && <form onSubmit={simulate} className="mb-5 rounded-2xl border border-brand-200 bg-brand-50/70 p-5"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-brand-900">Add simulated channel message</h3><p className="mt-1 text-xs text-sand-600">Creates a real enquiry record in MongoDB and runs classification.</p></div><Select aria-label="Message source" value={simulateSource} onChange={(e) => setSimulateSource(e.target.value as (typeof SOURCES)[number])}>{SOURCES.map((item) => <option key={item} value={item}>{item}</option>)}</Select></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Input label="Guest name" value={simulation.name} onChange={(e) => setSimulation({ ...simulation, name: e.target.value })} required /><Input label="Guest email" type="email" value={simulation.email} onChange={(e) => setSimulation({ ...simulation, email: e.target.value })} required /><Input label="Phone (optional)" value={simulation.phone} onChange={(e) => setSimulation({ ...simulation, phone: e.target.value })} /><Input label="Subject" value={simulation.subject} onChange={(e) => setSimulation({ ...simulation, subject: e.target.value })} required /><div className="sm:col-span-2 xl:col-span-4"><Textarea label="Message" rows={3} value={simulation.message} onChange={(e) => setSimulation({ ...simulation, message: e.target.value })} required /></div></div><Button type="submit" className="mt-4" loading={busy}>Add to inbox</Button></form>}

    <div className="mb-4 grid gap-3 rounded-2xl border border-sand-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
      <Input aria-label="Search inbox" placeholder="Search name, subject, message…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Select aria-label="Queue status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All queue statuses</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</Select>
      <Select aria-label="Category filter" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</Select>
      <Select aria-label="Source filter" value={source} onChange={(e) => setSource(e.target.value)}><option value="all">All channels</option>{SOURCES.map((value) => <option key={value}>{value}</option>)}</Select>
      <button type="button" onClick={() => setAlertGM((current) => !current)} className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition ${alertGM ? 'border-red-200 bg-red-50 text-red-800' : 'border-sand-200 bg-white text-sand-600 hover:bg-sand-50'}`}><AlertTriangle className="size-4" />{alertGM ? 'GM alerts only' : 'All GM alert states'}</button>
    </div>

    <div className="grid min-h-[620px] gap-4 xl:grid-cols-[0.88fr_1.5fr]">
      <section className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
        <div className="flex items-center justify-between border-b border-sand-100 px-4 py-3"><div><h3 className="text-sm font-semibold text-brand-900">Inbox</h3><p className="mt-0.5 text-[0.65rem] text-sand-500">{items.length} messages · unsorted items need review</p></div><CircleHelp className="size-4 text-sand-400" /></div>
        {loading ? <div className="flex h-64 items-center justify-center"><Spinner className="size-7" /></div> : <div className="max-h-[720px] divide-y divide-sand-100 overflow-y-auto">{items.map((item) => { const active = selected?._id === item._id; return <button type="button" key={item._id} onClick={() => setSelectedId(item._id)} className={`w-full px-4 py-4 text-left transition ${active ? 'bg-brand-50/80' : 'hover:bg-sand-50/80'}`}><div className="flex items-start justify-between gap-2"><span className="flex items-center gap-1.5 text-[0.63rem] font-mono font-semibold text-brand-700"><SourceIcon source={item.source} />{item.reference}</span>{item.alertGM && <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[0.57rem] font-bold tracking-wide text-red-800"><AlertTriangle className="size-3" />GM ALERT</span>}</div><p className="mt-2 line-clamp-1 text-sm font-semibold text-brand-900">{item.subject}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-sand-600">{item.message}</p><div className="mt-3 flex items-center justify-between"><span className={`rounded-full px-2 py-1 text-[0.58rem] font-semibold ${item.status === 'unsorted' ? 'bg-gold-100 text-gold-900' : 'bg-brand-50 text-brand-700'}`}>{item.status.replace('_', ' ')}</span><span className="text-[0.6rem] text-sand-500">{categoryLabel[item.category] ?? item.category}</span></div></button>})}{items.length === 0 && <p className="px-4 py-12 text-center text-sm text-sand-500">Inbox is clear for these filters.</p>}</div>}
      </section>

      {!selected ? <section className="flex items-center justify-center rounded-2xl border border-dashed border-sand-300 bg-white text-sm text-sand-500">Choose an enquiry to review.</section> : <section className="min-w-0 rounded-2xl border border-sand-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-xs font-semibold text-brand-700">{selected.reference}</p><span className="flex items-center gap-1 rounded-full bg-sand-100 px-2.5 py-1 text-[0.6rem] capitalize text-sand-600"><SourceIcon source={selected.source} />{selected.source}</span>{selected.alertGM && <span className="rounded-full bg-red-100 px-2.5 py-1 text-[0.6rem] font-bold text-red-800">GM ALERT</span>}</div><h3 className="mt-3 font-display text-2xl font-semibold text-brand-900">{selected.subject}</h3><p className="mt-1 text-sm text-sand-600">{selected.name} · {selected.email}{selected.phone ? ` · ${selected.phone}` : ''}</p></div><Button size="sm" variant="outline" loading={busy} onClick={() => void classify()} leading={<Sparkles className="size-3.5" />}>AI classify</Button></div>
        <div className="mt-5 rounded-xl bg-sand-50 p-4 text-sm leading-relaxed text-sand-800">{selected.message}</div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-sand-200 p-3"><p className="text-[0.58rem] font-semibold tracking-wider text-sand-500 uppercase">AI category</p><Select aria-label="Manual category correction" value={selected.category} onChange={(e) => void updateSelected({ category: e.target.value }, 'Manual category correction saved.')} className="mt-2 h-9">{CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabel[item]}</option>)}</Select></div>
          <div className="rounded-xl border border-sand-200 p-3"><p className="text-[0.58rem] font-semibold tracking-wider text-sand-500 uppercase">Queue status</p><Select aria-label="Enquiry status" value={selected.status} onChange={(e) => void updateSelected({ status: e.target.value }, 'Enquiry status updated.')} className="mt-2 h-9">{STATUSES.map((item) => <option key={item}>{item}</option>)}</Select></div>
          <div className="rounded-xl border border-sand-200 p-3"><p className="text-[0.58rem] font-semibold tracking-wider text-sand-500 uppercase">Staff assignment</p><Select aria-label="Assign staff" value={selected.assignedTo?._id ?? ''} onChange={(e) => void updateSelected({ assignedTo: e.target.value || null }, 'Staff assignment saved.')} className="mt-2 h-9"><option value="">Unassigned</option>{staff.map((person) => <option key={person._id} value={person._id}>{person.name} · {person.staffDepartment}</option>)}</Select></div>
          <div className="rounded-xl border border-sand-200 p-3"><p className="text-[0.58rem] font-semibold tracking-wider text-sand-500 uppercase">Assigned department</p><Select aria-label="Assign department" value={selected.assignedDepartment ?? ''} onChange={(e) => void updateSelected({ assignedDepartment: e.target.value }, 'Department reassignment saved.')} className="mt-2 h-9"><option value="">Unassigned</option>{['Reservations', 'Events', 'Corporate Sales', 'Guest Experience', 'Guest Services', 'General Manager'].map((team) => <option key={team}>{team}</option>)}</Select></div>
          <div className="rounded-xl border border-sand-200 p-3"><p className="text-[0.58rem] font-semibold tracking-wider text-sand-500 uppercase">Routing confidence</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-brand-900"><span className="h-2 flex-1 overflow-hidden rounded-full bg-sand-100"><span className="block h-full rounded-full bg-brand-600" style={{ width: `${Math.round((confidence ?? 0) * 100)}%` }} /></span>{confidence == null ? '—' : `${Math.round(confidence * 100)}%`}</p><p className="mt-1 text-[0.58rem] text-sand-500">{selected.ai?.provider ?? 'Awaiting triage'}{selected.ai?.manualOverride ? ' · manually corrected' : ''}</p></div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-sand-200 p-4"><div className="flex items-center gap-2 text-xs font-semibold text-brand-900"><Bot className="size-4 text-gold-600" />Extracted enquiry details</div><dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-sand-500">Arrival</dt><dd className="mt-1 font-medium text-brand-900">{selected.arrivalDate ? String(selected.arrivalDate).slice(0, 10) : 'Not stated'}</dd></div><div><dt className="text-sand-500">Departure</dt><dd className="mt-1 font-medium text-brand-900">{selected.departureDate ? String(selected.departureDate).slice(0, 10) : 'Not stated'}</dd></div><div><dt className="text-sand-500">Requested period</dt><dd className="mt-1 font-medium text-brand-900">{selected.requestedPeriod ?? 'Not stated'}</dd></div><div><dt className="text-sand-500">Guests / nights</dt><dd className="mt-1 font-medium text-brand-900">{selected.guestCount ?? 'Not stated'} · {selected.nightsRequested ? `${selected.nightsRequested} nights` : 'nights not stated'}</dd></div><div><dt className="text-sand-500">Budget</dt><dd className="mt-1 font-medium text-brand-900">{selected.budgetAmount != null ? `${selected.budgetCurrency ?? 'INR'} ${Number(selected.budgetAmount).toLocaleString('en-IN')}` : 'Not stated'}</dd></div></dl><p className="mt-3 border-t border-sand-100 pt-3 text-[0.65rem] leading-relaxed text-sand-500">{selected.ai?.reason ?? selected.routing?.reason ?? 'Classify this enquiry to see routing rationale.'}</p></div>
          <div className={`rounded-xl border p-4 ${selected.alertGM ? 'border-red-200 bg-red-50/70' : 'border-sand-200'}`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-xs font-semibold text-brand-900"><AlertTriangle className={`size-4 ${selected.alertGM ? 'text-red-600' : 'text-sand-400'}`} />General Manager alert</div>{selected.category === 'complaint' ? <span className="rounded-full bg-red-700 px-3 py-1.5 text-[0.63rem] font-semibold text-white">Required for complaints</span> : <button type="button" aria-pressed={Boolean(selected.alertGM)} onClick={() => void updateSelected({ alertGM: !selected.alertGM }, selected.alertGM ? 'GM alert cleared.' : 'GM alert raised.')} className={`rounded-full px-3 py-1.5 text-[0.63rem] font-semibold ${selected.alertGM ? 'bg-red-700 text-white' : 'bg-sand-100 text-sand-700'}`}>{selected.alertGM ? 'Alert active' : 'Raise alert'}</button>}</div><p className="mt-3 text-xs leading-relaxed text-sand-600">Complaints always remain flagged for GM review. Urgent and low-confidence enquiries can also be flagged; this creates an in-app alert and does not send a message.</p></div>
        </div>

        <div className="mt-5 rounded-xl border border-brand-200 bg-brand-50/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="flex items-center gap-2 text-sm font-semibold text-brand-900"><Sparkles className="size-4 text-gold-600" />AI reply draft</h4><p className="mt-1 text-[0.65rem] text-sand-600">Human review required. This draft is never sent automatically.</p></div><Button size="sm" variant="outline" loading={busy} onClick={() => void generateDraft()} leading={<Sparkles className="size-3.5" />}>Generate draft</Button></div><Textarea aria-label="Editable unsent reply draft" className="mt-3 bg-white" rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Generate an AI draft or write a staff reply…" /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-1.5 text-[0.63rem] font-semibold text-red-700"><Send className="size-3.5" />Draft only · no send action exists</p><Button size="sm" disabled={!draft.trim() || busy} onClick={() => void updateSelected({ replyDraft: draft }, 'Unsent reply draft saved.')}>Save draft</Button></div></div>

        {commercial && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4"><p className="text-xs font-semibold text-emerald-900">Commercial context · fetched from MongoDB</p><p className="mt-1 text-[0.62rem] text-emerald-800">{commercial.source} · {commercial.asOf}</p><p className="mt-1 text-[0.62rem] text-emerald-800">{commercial.note}</p>{commercial.residences?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{commercial.residences.map((room: any) => <div key={room.code} className="rounded-lg bg-white px-3 py-2 text-xs"><span className="font-semibold text-brand-900">{room.name}</span>{room.totalTariffINR != null && <span className="ml-2 text-emerald-800">₹{Number(room.totalTariffINR).toLocaleString('en-IN')} total</span>}{room.nightlyRates?.map((rate: any) => <span key={rate.date} className="ml-2 text-sand-600">{rate.date}: ₹{Number(rate.tariffINR).toLocaleString('en-IN')}</span>)}</div>)}</div> : <p className="mt-2 text-xs text-emerald-900">No matching live inventory was found for the extracted dates.</p>}</div>}
      </section>}
    </div>
  </div>
}
