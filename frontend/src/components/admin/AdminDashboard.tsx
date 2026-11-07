import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChartNoAxesCombined, ClipboardList, DoorOpen, Inbox, LogOut, Percent, ShieldCheck, Tags } from 'lucide-react'
import type { EstateUser } from '../../services/estateApi'
import { Button, Logo } from '../ui'
import { Overview } from './Overview'
import { BookingsAdmin } from './BookingsAdmin'
import { RoomsAdmin } from './RoomsAdmin'
import { RatesAdmin } from './RatesAdmin'
import { AllotmentAdmin } from './AllotmentAdmin'
import { PromosAdmin } from './PromosAdmin'
import { EnquiriesAdmin } from './EnquiriesAdmin'

export type AdminSection = 'overview' | 'bookings' | 'enquiries' | 'rooms' | 'rates' | 'allotments' | 'promos'
const NAV: { id: AdminSection; label: string; icon: typeof ChartNoAxesCombined }[] = [
  { id: 'overview', label: 'Overview', icon: ChartNoAxesCombined },
  { id: 'bookings', label: 'Bookings', icon: ClipboardList },
  { id: 'enquiries', label: 'Enquiries', icon: Inbox },
  { id: 'rooms', label: 'Rooms', icon: DoorOpen },
  { id: 'rates', label: 'Daily rates', icon: Tags },
  { id: 'allotments', label: 'Allotment calendar', icon: CalendarDays },
  { id: 'promos', label: 'Promo codes', icon: Percent },
]

export function AdminDashboard({ token, user, onSignOut }: { token: string; user: EstateUser; onSignOut: () => void }) {
  const [section, setSection] = useState<AdminSection>('overview')
  const page = {
    overview: <Overview token={token} />,
    bookings: <BookingsAdmin token={token} />,
    enquiries: <EnquiriesAdmin token={token} />,
    rooms: <RoomsAdmin token={token} />,
    rates: <RatesAdmin token={token} />,
    allotments: <AllotmentAdmin token={token} />,
    promos: <PromosAdmin token={token} />,
  }[section]

  return (
    <div className="min-h-screen bg-white text-sand-900 lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 z-40 flex h-auto flex-col border-b border-sand-200 bg-white px-4 py-4 text-sand-700 lg:h-screen lg:border-r lg:border-b-0 lg:px-5 lg:py-7">
        <div className="px-2"><Logo /></div>
        <p className="mt-10 px-3 text-[0.59rem] font-semibold tracking-[0.24em] text-sand-500 uppercase">Estate management</p>
        <nav aria-label="Admin navigation" className="mt-3 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {NAV.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSection(id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-200 ${section === id ? 'bg-brand-50 text-brand-800' : 'text-sand-600 hover:bg-sand-50 hover:text-brand-800'}`}><Icon className={`size-4 ${section === id ? 'text-brand-700' : 'text-sand-400'}`} />{label}</button>)}
        </nav>
        <div className="mt-auto hidden border-t border-sand-200 pt-5 lg:block">
          <div className="flex items-center gap-3 px-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 font-display text-sm font-semibold text-brand-800">{user.name.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0"><p className="truncate text-xs font-semibold text-brand-900">{user.name}</p><p className="mt-0.5 text-[0.62rem] text-sand-500">Reservations Staff</p></div>
          </div>
          <button type="button" onClick={onSignOut} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sand-500 transition hover:bg-sand-50 hover:text-brand-800"><LogOut className="size-4" />Sign out</button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-sand-200 bg-white/95 px-5 backdrop-blur-xl sm:px-8">
          <div><p className="text-[0.58rem] font-semibold tracking-[0.22em] text-brand-600 uppercase">EstateStay · Staff Console</p><h1 className="mt-0.5 text-sm font-semibold text-brand-900">{NAV.find((item) => item.id === section)?.label}</h1></div>
          <div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-full border border-sand-200 bg-white px-3 py-1.5 text-[0.68rem] text-sand-600 sm:flex"><ShieldCheck className="size-3.5 text-brand-600" />Admin session</div><Button size="sm" variant="outline" onClick={onSignOut} leading={<LogOut className="size-3.5" />}>Sign out</Button></div>
        </header>
        <main className="mx-auto max-w-[1500px] p-5 sm:p-8">
          <AnimatePresence mode="wait"><motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }}>{page}</motion.div></AnimatePresence>
        </main>
      </div>
    </div>
  )
}
