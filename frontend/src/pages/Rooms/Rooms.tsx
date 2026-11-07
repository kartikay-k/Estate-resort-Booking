import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Building2, RefreshCw } from 'lucide-react'
import { Alert, Button, Container, SectionHeading, Spinner } from '../../components/ui'
import { ResidenceCard } from '../../components/site/FeaturedVillas'
import { BookingDialog } from '../../components/site/BookingDialog'
import { FadeIn } from '../../components/motion/FadeIn'
import { estateApi } from '../../services/estateApi'
import { useBookingSearch } from '../../context/BookingSearchContext'
import type { EstateRoom } from '../../types/estate'

const PAGE_SIZE = 18

export default function RoomsPage() {
  const { search, results } = useBookingSearch()
  const [kind, setKind] = useState<'all' | 'room' | 'villa'>('all')
  const [page, setPage] = useState(1)
  const [rooms, setRooms] = useState<EstateRoom[]>([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<EstateRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadCount, setReloadCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    let live = true
    setLoading(true); setError(null)
    if (results !== null) {
      const filtered = results.filter((room) => kind === 'all' || room.kind === kind)
      setTotal(filtered.length)
      setRooms(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE))
      setLoading(false)
      return () => { live = false }
    }
    estateApi.rooms({ ...(kind === 'all' ? {} : { kind }), page, limit: PAGE_SIZE })
      .then((response) => { if (live) { setRooms(response.items); setTotal(response.total) } })
      .catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : 'The residence collection could not be loaded') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [kind, page, results, reloadCount])

  function changeKind(next: 'all' | 'room' | 'villa') { setKind(next); setPage(1) }

  return <>
    <section className="bg-brand-950 px-4 pt-32 pb-16 text-sand-50 sm:px-6 lg:px-8">
      <Container>
        <FadeIn><p className="text-[0.65rem] font-semibold tracking-[0.25em] text-gold-300 uppercase">The EstateStay collection</p><h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">A key for every kind of escape.</h1><p className="mt-5 max-w-2xl text-base leading-relaxed text-sand-300">Browse our 64 rooms and 12 private villas. Dates and website allotment are verified live when you search and again before a reservation is created.</p></FadeIn>
      </Container>
    </section>
    <section className="min-h-[60vh] bg-sand-50 py-14 lg:py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-5"><SectionHeading eyebrow={search ? 'Live availability' : 'Find your place'} title={search ? `${total} residences for your dates` : 'Rooms & villas'} description={search ? `${search.checkIn} → ${search.checkOut} · ${search.adults + search.children} guests · prices pulled from daily MongoDB rates` : 'Each residence has its own character, a private veranda and the estate just beyond the door.'} /><div className="flex flex-wrap gap-2">{(['all', 'room', 'villa'] as const).map((value) => <button key={value} type="button" onClick={() => changeKind(value)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${kind === value ? 'bg-brand-800 text-white' : 'border border-sand-200 bg-white text-sand-600 hover:border-brand-300 hover:text-brand-800'}`}>{value === 'all' ? 'All stays' : value === 'room' ? 'Rooms & suites' : 'Villas'}</button>)}</div></div>
        {error && <Alert className="mt-7" variant="danger" title="Could not load residences">{error}<Button size="sm" variant="outline" className="ml-3" onClick={() => setReloadCount((value) => value + 1)}>Retry</Button></Alert>}
        {loading ? <div className="flex min-h-60 items-center justify-center"><Spinner className="size-8" /></div> : rooms.length ? <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((room, index) => <ResidenceCard key={room._id} room={room} index={index} search={search} onReserve={setSelected} />)}</div> : !error ? <div className="mt-12 rounded-3xl border border-sand-200 bg-white px-6 py-16 text-center"><Building2 className="mx-auto size-8 text-sand-400" /><p className="mt-4 font-display text-2xl font-semibold text-brand-900">No residences for these dates.</p><p className="mt-2 text-sm text-sand-500">Try different dates or another stay type.</p></div> : null}
        {!loading && pages > 1 && <div className="mt-10 flex items-center justify-center gap-4"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} leading={<ArrowLeft className="size-4" />}>Previous</Button><span className="text-xs text-sand-500">Page {page} of {pages} · {total} residences</span><Button variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} trailing={<ArrowRight className="size-4" />}>Next</Button></div>}
        {!search && !loading && <p className="mt-8 flex items-center justify-center gap-2 text-xs text-sand-500"><RefreshCw className="size-3.5" />Select dates on the home page to see live availability and nightly prices.</p>}
      </Container>
      {selected && <BookingDialog room={selected} search={search} onClose={() => setSelected(null)} />}
    </section>
  </>
}
