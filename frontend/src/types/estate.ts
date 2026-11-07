export interface EstateRoom {
  _id: string
  code: string
  name: string
  kind: 'room' | 'villa'
  category: string
  description: string
  capacity: { adults: number; children: number }
  bedrooms: number
  areaSqm: number
  amenities: string[]
  images: string[]
  baseRate: number
  active?: boolean
  totalFrom?: number
  currency?: string
  nightlyRates?: { date: string; amount: number; ratePlanId?: string }[]
}

export interface StaySearch {
  checkIn: string
  checkOut: string
  adults: number
  children: number
  kind?: 'room' | 'villa'
}

export interface BookingRecord {
  _id: string
  reference: string
  status: string
  paymentStatus: 'pending' | 'paid' | 'failed'
  checkIn: string
  checkOut: string
  nights: number
  guests: { adults: number; children: number }
  subtotal: number
  discount: number
  promoCode?: string
  tax: number
  total: number
  currency: string
  taxBreakdown?: { date: string; tariff: number; rate: number; amount: number }[]
}

export interface BookingLookupResult extends Omit<BookingRecord, '_id'> {
  room: { code: string; name: string; kind: 'room' | 'villa'; category: string; images: string[] }
  ratePlan: { code: string; name: string }
}
