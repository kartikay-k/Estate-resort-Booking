import { api } from './api'
import type { ApiEnvelope } from '../types/api'
import type { BookingLookupResult, BookingRecord, EstateRoom, StaySearch } from '../types/estate'

export interface EstateUser {
  id: string
  name: string
  email: string
  role: 'guest' | 'reservations_staff'
  phone?: string
}

export interface AvailabilityResult {
  checkIn: string
  checkOut: string
  nights: number
  guests: { adults: number; children: number }
  items: EstateRoom[]
}

export interface ApiResult<T> {
  success: true
  message: string | null
  data: T
}

export interface AdminAnalytics {
  period: { from: string; to: string; days: number }
  metrics: { activeRooms: number; bookingsInPeriod: number; paidRevenue: number; pendingPayments: number; occupancyPercent: number }
  statusCounts: Record<string, number>
  dailyBookings: { date: string; bookings: number; paidRevenue: number }[]
}

function unwrap<T>(response: { data: ApiEnvelope<T> }): T {
  const envelope = response.data
  if (!envelope.success) throw new Error(envelope.message)
  return envelope.data
}

export const estateApi = {
  async rooms(params: { kind?: 'room' | 'villa'; page?: number; limit?: number } = {}) {
    return unwrap(await api.get<ApiEnvelope<{ items: EstateRoom[]; page: number; pages: number; total: number }>>('/rooms', { params }))
  },
  async availability(search: StaySearch) {
    return unwrap(await api.get<ApiEnvelope<AvailabilityResult>>('/availability', { params: search }))
  },
  async rates(roomId: string, from: string, to: string) {
    return unwrap(await api.get<ApiEnvelope<{ items: unknown[] }>>('/rates', { params: { roomId, from, to } }))
  },
  async register(input: { name: string; email: string; password: string; phone?: string; privacyAccepted: true }) {
    return unwrap(await api.post<ApiEnvelope<{ user: EstateUser; token: string }>>('/auth/register', input))
  },
  async login(input: { email: string; password: string }) {
    return unwrap(await api.post<ApiEnvelope<{ user: EstateUser; token: string }>>('/auth/login', input))
  },
  async me(token: string) {
    return unwrap(await api.get<ApiEnvelope<{ user: EstateUser }>>('/auth/me', { headers: { Authorization: `Bearer ${token}` } }))
  },
  async createBooking(input: {
    token: string
    roomId: string
    checkIn: string
    checkOut: string
    adults: number
    children: number
    ratePlanCode?: string
    promoCode?: string
    guestName?: string
    guestEmail?: string
    guestPhone?: string
  }) {
    const { token, ...body } = input
    return unwrap(await api.post<ApiEnvelope<BookingRecord>>('/bookings', body, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async testPayment(bookingId: string, token: string, outcome: 'success' | 'failure' | 'pending') {
    return unwrap(await api.post<ApiEnvelope<{ booking: { id: string; reference: string; status: 'pending' | 'confirmed' | 'cancelled' | 'completed'; paymentStatus: 'pending' | 'paid' | 'failed' }; payment: { id: string; status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded'; amount: number; currency: string; providerReference: string } }>>(`/bookings/${encodeURIComponent(bookingId)}/test-payment`, { outcome }, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async applyBookingPromo(bookingId: string, token: string, code: string) {
    return unwrap(await api.post<ApiEnvelope<BookingRecord>>(`/bookings/${encodeURIComponent(bookingId)}/promo`, { code }, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async myBookings(token: string) {
    return unwrap(await api.get<ApiEnvelope<{ items: BookingRecord[] }>>('/bookings', { headers: { Authorization: `Bearer ${token}` } }))
  },
  async booking(id: string, token: string) {
    return unwrap(await api.get<ApiEnvelope<BookingRecord>>(`/bookings/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async lookupBooking(input: { reference: string; email: string }) {
    return unwrap(await api.post<ApiEnvelope<BookingLookupResult>>('/bookings/lookup', input))
  },
  async cancelBooking(id: string, token: string) {
    return unwrap(await api.post<ApiEnvelope<{ reference: string; status: string }>>(`/bookings/${encodeURIComponent(id)}/cancel`, {}, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async submitEnquiry(input: { name: string; email: string; phone?: string; subject: string; message: string; category?: string; arrivalDate?: string; departureDate?: string; guestCount?: number; nightsRequested?: number; budgetAmount?: number; privacyAccepted: boolean }) {
    return unwrap(await api.post<ApiEnvelope<{ reference: string; category: string; status: string; routing: { department: string; confidence: number } }>>('/enquiries', input))
  },
  async adminList(kind: string, token: string, params: Record<string, string | number> = {}) {
    return unwrap(await api.get<ApiEnvelope<{ items: unknown[]; total: number }>>(`/admin/${encodeURIComponent(kind)}`, { params, headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminAnalytics(token: string, days = 14) {
    return unwrap(await api.get<ApiEnvelope<AdminAnalytics>>('/admin/analytics', { params: { days }, headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminBookings(token: string, params: { status?: string; from?: string; to?: string; search?: string; page?: number; limit?: number } = {}) {
    return unwrap(await api.get<ApiEnvelope<{ items: Record<string, any>[]; total: number; page: number; pages: number }>>('/admin/bookings', { params, headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminEnquiries(token: string, params: { status?: string; category?: string; source?: string; search?: string; alertGM?: boolean; page?: number; limit?: number } = {}) {
    return unwrap(await api.get<ApiEnvelope<{ items: Record<string, any>[]; total: number; page: number; pages: number }>>('/admin/enquiries', { params, headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminSimulateEnquiry(input: { source: 'website' | 'email' | 'whatsapp'; name: string; email: string; phone?: string; subject: string; message: string }, token: string) {
    return unwrap(await api.post<ApiEnvelope<{ id: string; reference: string; category: string; status: string; priority: string; alertGM: boolean; confidence: number }>>('/admin/enquiries/simulate', input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminClassifyEnquiry(id: string, token: string) {
    return unwrap(await api.post<ApiEnvelope<Record<string, any>>>(`/admin/enquiries/${encodeURIComponent(id)}/classify`, {}, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminDraftEnquiryReply(id: string, token: string) {
    return unwrap(await api.post<ApiEnvelope<{ reference: string; replyDraft: string; commercialContext: Record<string, any>; sent: false }>>(`/admin/enquiries/${encodeURIComponent(id)}/draft-reply`, {}, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminAllotments(token: string, params: { from: string; to: string; roomId?: string }) {
    return unwrap(await api.get<ApiEnvelope<{ items: Record<string, any>[] }>>('/admin/allotments', { params, headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminRates(token: string, params: { from: string; to: string; roomId?: string }) {
    return unwrap(await api.get<ApiEnvelope<{ items: Record<string, any>[] }>>('/admin/rates', { params, headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminSetBlackout(token: string, input: { from: string; to: string; roomIds?: string[]; closed: boolean }) {
    return unwrap(await api.post<ApiEnvelope<{ closed: boolean; from: string; to: string; rooms: number; dates: number }>>('/admin/blackouts', input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminUpdatePromo(id: string, input: Record<string, unknown>, token: string) {
    return unwrap(await api.patch<ApiEnvelope<unknown>>(`/admin/promocodes/${encodeURIComponent(id)}`, input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminExportCsv(token: string, date: string, status = 'all') {
    const response = await api.get<Blob>('/admin/bookings/export.csv', { params: { date, status }, responseType: 'blob', headers: { Authorization: `Bearer ${token}` } })
    return response.data
  },
  async adminCreateRoom(input: Record<string, unknown>, token: string) {
    return unwrap(await api.post<ApiEnvelope<EstateRoom>>('/admin/rooms', input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminUpdateRoom(id: string, input: Record<string, unknown>, token: string) {
    return unwrap(await api.patch<ApiEnvelope<EstateRoom>>(`/admin/rooms/${encodeURIComponent(id)}`, input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminSetRate(input: { roomId: string; ratePlanId: string; date: string; amount: number; closed?: boolean }, token: string) {
    return unwrap(await api.post<ApiEnvelope<unknown>>('/admin/rates', input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminSetAllotment(input: { roomId: string; date: string; total: number; closed?: boolean }, token: string) {
    return unwrap(await api.post<ApiEnvelope<unknown>>('/admin/allotments', input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminCreateRatePlan(input: Record<string, unknown>, token: string) {
    return unwrap(await api.post<ApiEnvelope<unknown>>('/admin/rateplans', input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminCreatePromo(input: Record<string, unknown>, token: string) {
    return unwrap(await api.post<ApiEnvelope<unknown>>('/admin/promocodes', input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminUpdateBooking(id: string, status: string, token: string) {
    return unwrap(await api.patch<ApiEnvelope<unknown>>(`/admin/bookings/${encodeURIComponent(id)}`, { status }, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminUpdatePayment(id: string, input: Record<string, unknown>, token: string) {
    return unwrap(await api.patch<ApiEnvelope<unknown>>(`/admin/payments/${encodeURIComponent(id)}`, input, { headers: { Authorization: `Bearer ${token}` } }))
  },
  async adminUpdateEnquiry(id: string, input: Record<string, unknown>, token: string) {
    return unwrap(await api.patch<ApiEnvelope<unknown>>(`/admin/enquiries/${encodeURIComponent(id)}`, input, { headers: { Authorization: `Bearer ${token}` } }))
  },
}

export const AUTH_TOKEN_KEY = 'estatestay_access_token'
export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY)
export const saveAuthToken = (token: string) => localStorage.setItem(AUTH_TOKEN_KEY, token)
