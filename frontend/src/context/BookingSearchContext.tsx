import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { StaySearch } from '../types/estate'
import type { EstateRoom } from '../types/estate'

interface BookingSearchContextValue {
  search: StaySearch | null
  results: EstateRoom[] | null
  setSearch: (search: StaySearch, results: EstateRoom[]) => void
}

const BookingSearchContext = createContext<BookingSearchContextValue | null>(null)

export function BookingSearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearchState] = useState<StaySearch | null>(null)
  const [results, setResults] = useState<EstateRoom[] | null>(null)
  const setSearch = (nextSearch: StaySearch, nextResults: EstateRoom[]) => { setSearchState(nextSearch); setResults(nextResults) }
  const value = useMemo(() => ({ search, results, setSearch }), [search, results])
  return <BookingSearchContext.Provider value={value}>{children}</BookingSearchContext.Provider>
}

export function useBookingSearch() {
  const value = useContext(BookingSearchContext)
  if (!value) throw new Error('useBookingSearch must be used inside BookingSearchProvider')
  return value
}
