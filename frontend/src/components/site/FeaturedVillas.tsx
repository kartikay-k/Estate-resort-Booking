import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, ArrowUpRight, BedDouble, MapPin, Ruler, Star, Users } from 'lucide-react'
import { FadeIn } from '../motion/FadeIn'
import { Alert, Button, Container, SectionHeading, Spinner } from '../ui'
import { estateApi } from '../../services/estateApi'
import type { EstateRoom, StaySearch } from '../../types/estate'
import { BookingDialog } from './BookingDialog'
import { useBookingSearch } from '../../context/BookingSearchContext'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export function ResidenceCard({ room, index, search, onReserve }: { room: EstateRoom; index: number; search: StaySearch | null; onReserve: (room: EstateRoom) => void }) {
  const price = room.nightlyRates?.length
    ? Math.round(room.nightlyRates.reduce((sum, rate) => sum + rate.amount, 0) / room.nightlyRates.length)
    : room.baseRate
  const image = room.images?.[0] || '/images/villa-cedar-ridge.webp'
  return (
    <FadeIn delay={index * 0.09} className="h-full">
      <article className="group relative h-full overflow-hidden rounded-[26px] bg-brand-950 ring-1 ring-brand-950/10">
        <div className="relative aspect-[4/5] overflow-hidden">
          <img src={image} alt={`${room.name}, a ${room.kind} at EstateStay`} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/20 to-brand-950/10" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
            <span className="rounded-full bg-white/12 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.16em] text-sand-50 uppercase ring-1 ring-white/25 backdrop-blur-md">{room.kind === 'villa' ? 'Villa' : 'Suite'}</span>
            <span className="flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 text-xs font-medium text-sand-50 ring-1 ring-white/25 backdrop-blur-md"><Star className="size-3 fill-gold-300 text-gold-300" aria-hidden="true" />4.9</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <p className="flex items-center gap-1.5 text-[0.62rem] tracking-[0.18em] text-sand-300 uppercase"><MapPin className="size-3 text-gold-400" aria-hidden="true" />EstateStay · Chikkamagaluru</p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-sand-50">{room.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-sand-300/90">{room.description}</p>
            <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-sand-300">
              <li className="flex items-center gap-1.5"><Users className="size-3.5 text-gold-400" aria-hidden="true" />{room.capacity.adults} guests</li>
              <li className="flex items-center gap-1.5"><BedDouble className="size-3.5 text-gold-400" aria-hidden="true" />{room.bedrooms} {room.bedrooms === 1 ? 'bedroom' : 'bedrooms'}</li>
              <li className="flex items-center gap-1.5"><Ruler className="size-3.5 text-gold-400" aria-hidden="true" />{room.areaSqm} m²</li>
            </ul>
            <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/15 pt-4">
              <p className="text-sand-50"><span className="font-display text-xl font-semibold">{inr.format(price)}</span><span className="text-xs text-sand-400"> / night</span></p>
              <Button size="sm" variant="accent" trailing={<ArrowRight className="size-3.5" />} onClick={() => onReserve(room)} title={!search ? 'Choose dates in the search widget first' : undefined}>Reserve</Button>
            </div>
          </div>
        </div>
      </article>
    </FadeIn>
  )
}

/** Featured residences are live Mongo-backed room records; availability searches add dated rates. */
export function FeaturedVillas() {
  const navigate = useNavigate()
  const { search, results } = useBookingSearch()
  const [rooms, setRooms] = useState<EstateRoom[]>([])
  const [selected, setSelected] = useState<EstateRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    estateApi.rooms({ kind: 'villa', limit: 12 }).then(({ items }) => {
      if (live) setRooms(items.slice(0, 3))
    }).catch((cause: unknown) => {
      if (live) setError(cause instanceof Error ? cause.message : 'Could not load residences')
    }).finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [])

  useEffect(() => {
    if (results === null) return
    setError(null)
    setRooms(results.slice(0, 3))
  }, [results])

  return (
    <section id="villas" className="scroll-mt-24 bg-sand-50 py-24 lg:py-32">
      <Container>
        <FadeIn><SectionHeading eyebrow="Stay" title="Rooms & villas, each with a view" description="Sixty-four rooms and twelve private villas across the estate — rooms that open onto the coffee terraces, villas that hold the whole valley. Every one comes with a private veranda and coffee ground the morning you arrive." actions={<Button variant="outline" trailing={<ArrowUpRight className="size-4" />} onClick={() => navigate('/rooms')}>View all residences</Button>} /></FadeIn>
        {error && <Alert className="mt-8" variant="warning" title="Live catalogue unavailable">{error} — confirm the API is running, then refresh.</Alert>}
        {loading ? <div className="flex justify-center py-20"><Spinner className="size-8" /></div> : rooms.length ? <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((room, index) => <ResidenceCard key={room._id} room={room} index={index} search={search} onReserve={setSelected} />)}</div> : !error && <p className="py-16 text-center text-sand-600">No residences match these dates. Try adjusting your stay.</p>}
        <FadeIn delay={0.1}><p className="mt-10 text-center text-[0.68rem] tracking-[0.16em] text-sand-500 uppercase">Rates include breakfast, estate walks and transfers from Mangalore airport</p></FadeIn>
      </Container>
      {selected && <BookingDialog room={selected} search={search} onClose={() => setSelected(null)} />}
    </section>
  )
}
