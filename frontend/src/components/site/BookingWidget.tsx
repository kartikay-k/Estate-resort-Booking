import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Users,
} from 'lucide-react'
import { Button } from '../ui'
import { estateApi } from '../../services/estateApi'
import type { StaySearch } from '../../types/estate'
import { useBookingSearch } from '../../context/BookingSearchContext'

const GUESTS = ['1 guest', '2 guests', '3 guests', '4 guests', '5 guests', '6 guests', '7 guests', '8 guests']

const RESIDENCES = [
  { value: 'any', label: 'Any stay' },
  { value: 'villas', label: 'Villas' },
  { value: 'suites', label: 'Suites' },
] as const

const todayISO = (): string => new Date().toISOString().split('T')[0]

function FieldShell({
  label,
  icon,
  htmlFor,
  children,
}: {
  label: string
  icon: ReactNode
  htmlFor: string
  children: ReactNode
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="group flex cursor-pointer flex-col gap-1 rounded-2xl px-4 py-3 transition-colors duration-200 hover:bg-white focus-within:bg-white"
    >
      <span className="flex items-center gap-1.5 text-[0.62rem] font-semibold tracking-[0.18em] text-sand-500 uppercase">
        <span className="text-gold-600">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  )
}

const controlClass =
  'w-full appearance-none bg-transparent text-sm font-medium text-brand-900 focus:outline-none [color-scheme:light]'

/**
 * Booking search widget — the hero's floating glass panel.
 * Animated in on load; validates dates locally and hands the guest
 * down to the villa selection (live availability arrives in Phase 3).
 */
export function BookingWidget() {
  const { setSearch } = useBookingSearch()
  const [arrival, setArrival] = useState('')
  const [departure, setDeparture] = useState('')
  const [guests, setGuests] = useState('2 guests')
  const [residence, setResidence] = useState<string>('any')
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [availabilityCount, setAvailabilityCount] = useState<number | null>(null)

  const nights =
    arrival && departure
      ? Math.round(
          (new Date(departure).getTime() - new Date(arrival).getTime()) /
            86_400_000,
        )
      : 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!arrival || !departure) {
      setConfirmed(false)
      setError('Choose your arrival and departure dates.')
      return
    }
    if (nights <= 0) {
      setConfirmed(false)
      setError('Departure must be after arrival.')
      return
    }
    setError(null)
    const search: StaySearch = {
      checkIn: arrival,
      checkOut: departure,
      adults: Number.parseInt(guests, 10) || 2,
      children: 0,
      ...(residence === 'villas' ? { kind: 'villa' as const } : residence === 'suites' ? { kind: 'room' as const } : {}),
    }
    setChecking(true)
    try {
      const result = await estateApi.availability(search)
      setAvailabilityCount(result.items.length)
      setConfirmed(true)
      setSearch(search, result.items)
      document.getElementById('villas')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (cause) {
      setConfirmed(false)
      setError(cause instanceof Error ? cause.message : 'Could not check availability. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 44 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[28px] border border-white/60 bg-sand-50/95 p-2 shadow-[0_24px_80px_-20px_rgba(13,32,24,0.55)] backdrop-blur-xl"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="grid gap-1 sm:grid-cols-2 md:grid-cols-[1.15fr_1fr_1fr_0.95fr_auto] md:items-stretch">
          <FieldShell
            label="Arrival"
            icon={<CalendarDays className="size-3.5" />}
            htmlFor="booking-arrival"
          >
            <input
              id="booking-arrival"
              type="date"
              min={todayISO()}
              value={arrival}
              onChange={(e) => {
                setArrival(e.target.value)
                if (departure && departure <= e.target.value) setDeparture('')
              }}
              className={controlClass}
            />
          </FieldShell>

          <FieldShell
            label="Departure"
            icon={<CalendarDays className="size-3.5" />}
            htmlFor="booking-departure"
          >
            <input
              id="booking-departure"
              type="date"
              min={arrival || todayISO()}
              value={departure}
              onChange={(e) => setDeparture(e.target.value)}
              className={controlClass}
            />
          </FieldShell>

          <FieldShell
            label="Guests"
            icon={<Users className="size-3.5" />}
            htmlFor="booking-guests"
          >
            <div className="relative">
              <select
                id="booking-guests"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className={`${controlClass} pr-5`}
              >
                {GUESTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-0 size-3.5 -translate-y-1/2 text-sand-500"
              />
            </div>
          </FieldShell>

          <FieldShell
            label="Residence"
            icon={<Building2 className="size-3.5" />}
            htmlFor="booking-residence"
          >
            <div className="relative">
              <select
                id="booking-residence"
                value={residence}
                onChange={(e) => setResidence(e.target.value)}
                className={`${controlClass} pr-5`}
              >
                {RESIDENCES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-0 size-3.5 -translate-y-1/2 text-sand-500"
              />
            </div>
          </FieldShell>

          <div className="flex p-1 sm:col-span-2 md:col-span-1 md:items-stretch md:p-0">
            <Button
              type="submit"
              variant="accent"
              size="lg"
              loading={checking}
              className="h-14 w-full rounded-2xl px-5 md:h-full md:px-4 lg:px-7"
              trailing={<ArrowRight className="size-4" />}
            >
              Check availability
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden px-5 pt-1 pb-3 text-xs font-medium text-red-600"
              role="alert"
            >
              {error}
            </motion.p>
          )}
          {confirmed && !error && (
            <motion.p
              key="confirmed"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 overflow-hidden px-5 pt-1 pb-3 text-xs font-medium text-brand-700"
            >
              <Check className="size-3.5 text-gold-600" aria-hidden="true" />
              {availabilityCount} available {availabilityCount === 1 ? 'stay' : 'stays'} · {nights} {nights === 1 ? 'night' : 'nights'} · {guests}.
            </motion.p>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  )
}
