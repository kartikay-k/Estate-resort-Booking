import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Allotment } from '../models/allotment.model.js';
import { Booking } from '../models/booking.model.js';
import { DailyRate } from '../models/dailyRate.model.js';
import { Enquiry } from '../models/enquiry.model.js';
import { Payment } from '../models/payment.model.js';
import { PromoCode } from '../models/promoCode.model.js';
import { RatePlan } from '../models/ratePlan.model.js';
import { Room } from '../models/room.model.js';
import { User } from '../models/user.model.js';

const base = process.env.API_URL ?? 'http://localhost:5001/api';
const staffEmail = process.env.SEED_RESERVATIONS_STAFF_EMAIL;
const staffPassword = process.env.SEED_RESERVATIONS_STAFF_PASSWORD;
if (!staffEmail || !staffPassword) {
  throw new Error('SEED_RESERVATIONS_STAFF_EMAIL and SEED_RESERVATIONS_STAFF_PASSWORD are required');
}
let passed = 0;
const assert: (condition: unknown, message: string) => void = (condition, message) => { if (!condition) throw new Error(message); passed++; console.log(`✓ ${message}`); };
async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) } });
  const body = await response.json() as { success: boolean; message?: string; data: any };
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path}: HTTP ${response.status} ${body.message ?? ''}`);
  return body.data;
}
async function rawRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) } });
  return { status: response.status, body: await response.json() as { success: boolean; message?: string; data: any } };
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const post = (body: unknown) => ({ method: 'POST', body: JSON.stringify(body) });
const patch = (body: unknown) => ({ method: 'PATCH', body: JSON.stringify(body) });

async function cleanupSmokeData() {
  await connectDatabase();
  const users = await User.find({ email: /^(guest|event)-.*@example\.test$/ }).select('_id email').lean();
  const emails = users.map((user) => user.email);
  const testBookings = await Booking.find({ 'guestSnapshot.email': { $in: emails } }).select('_id room checkIn checkOut status').lean();
  for (const booking of testBookings) {
    if (booking.status === 'pending' || booking.status === 'confirmed') {
      for (let date = new Date(booking.checkIn); date < booking.checkOut; date = new Date(date.getTime() + 86_400_000)) {
        const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        await Allotment.updateOne({ room: booking.room, date: day, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
      }
    }
  }
  const bookingIds = testBookings.map((booking) => booking._id);
  await Promise.all([
    Payment.deleteMany({ booking: { $in: bookingIds } }),
    Booking.deleteMany({ _id: { $in: bookingIds } }),
    Enquiry.deleteMany({ email: /^(event)-.*@example\.test$/ }),
    User.deleteMany({ _id: { $in: users.map((user) => user._id) } }),
    Room.deleteMany({ code: /^QA-/ }),
    PromoCode.deleteMany({ code: /^QA/ }),
  ]);
  const qaPlans = await RatePlan.find({ code: /^QA/ }).select('_id').lean();
  await DailyRate.deleteMany({ ratePlan: { $in: qaPlans.map((plan) => plan._id) } });
  await RatePlan.deleteMany({ _id: { $in: qaPlans.map((plan) => plan._id) } });
  await disconnectDatabase();
}

async function main() {
  const health = await request('/health'); assert(health.status === 'ok', 'GET /health');
  const catalog = await request('/rooms?kind=villa&limit=12'); assert(catalog.items.length === 12, 'GET /rooms returns seeded villas');
  const tomorrow = new Date(Date.now() + 2 * 86_400_000); tomorrow.setUTCHours(0, 0, 0, 0);
  const checkout = new Date(tomorrow.getTime() + 2 * 86_400_000);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const checkIn = iso(tomorrow); const checkOut = iso(checkout);
  const availabilityData = await request(`/availability?checkIn=${checkIn}&checkOut=${checkOut}&adults=2&children=0&kind=villa`);
  assert(availabilityData.items.length > 0, 'GET /availability returns bookable villa');
  const room = availabilityData.items[0];
  const roomDetail = await request(`/rooms/${room._id}`); assert(roomDetail._id === room._id, 'GET /rooms/:id returns room detail');
  const rates = await request(`/rates?roomId=${room._id}&from=${checkIn}&to=${checkOut}`);
  assert(rates.items.length >= 4, 'GET /rates returns dated rate-plan prices');

  const suffix = `${Date.now()}`;
  const guest = await request('/auth/register', post({ name: 'Smoke Test Guest', email: `guest-${suffix}@example.test`, password: 'Smoke-Test-Password-123', privacyAccepted: true }));
  assert(Boolean(guest.token), 'POST /auth/register creates guest and JWT');
  const noConsentRegister = await rawRequest('/auth/register', post({ name: 'No Consent Guest', email: `guest-noconsent-${suffix}@example.test`, password: 'Smoke-Test-Password-123' }));
  assert(noConsentRegister.status === 422, 'Guest registration requires privacy consent');
  const logged = await request('/auth/login', post({ email: `guest-${suffix}@example.test`, password: 'Smoke-Test-Password-123' }));
  assert(Boolean(logged.token), 'POST /auth/login authenticates guest');
  const self = await request('/auth/me', { headers: auth(guest.token) }); assert(self.user.email === `guest-${suffix}@example.test`, 'GET /auth/me returns authenticated user');

  const challenger = await request('/auth/register', post({ name: 'Concurrent Guest', email: `guest-race-${suffix}@example.test`, password: 'Smoke-Test-Password-123', privacyAccepted: true }));
  const contenderBody = { roomId: room._id, ratePlanCode: 'FLEX', checkIn, checkOut, adults: 2, children: 0 };
  const concurrent = await Promise.all([
    rawRequest('/bookings', { ...post(contenderBody), headers: auth(guest.token) }),
    rawRequest('/bookings', { ...post(contenderBody), headers: auth(challenger.token) }),
  ]);
  const winnerIndex = concurrent.findIndex((result) => result.status === 201);
  assert(winnerIndex >= 0 && concurrent.filter((result) => result.status === 409).length === 1, 'Concurrent users: exactly one claim succeeds for the last room');
  const winner = concurrent[winnerIndex].body.data;
  const winnerToken = winnerIndex === 0 ? guest.token : challenger.token;
  const released = await request(`/bookings/${winner._id}/cancel`, { method: 'POST', headers: auth(winnerToken) });
  assert(released.status === 'cancelled', 'Concurrent booking winner cancellation releases the inventory claim');

  const booking = await request('/bookings', { ...post({ roomId: room._id, ratePlanCode: 'FLEX', checkIn, checkOut, adults: 2, children: 0 }), headers: auth(guest.token) });
  assert(booking.status === 'pending' && Boolean(booking.reference), 'POST /bookings creates pending reservation and payment');
  assert(booking.taxBreakdown.length === booking.nights && booking.taxBreakdown.every((line: any) => line.rate === (line.tariff <= 7500 ? 0.05 : 0.18)) && booking.total === booking.subtotal - booking.discount + booking.tax, 'Booking total snapshots per-night tariff GST and exact total');
  const promoBooking = await request(`/bookings/${booking._id}/promo`, { ...post({ code: 'ESTATE10' }), headers: auth(guest.token) });
  assert(promoBooking.promoCode === 'ESTATE10' && promoBooking.discount > 0 && promoBooking.total === promoBooking.subtotal - promoBooking.discount + promoBooking.tax, 'Guest promo application recalculates discount, GST and total server-side');
  const promoRemoved = await request(`/bookings/${booking._id}/promo`, { ...post({ code: '' }), headers: auth(guest.token) });
  assert(promoRemoved.discount === 0 && !promoRemoved.promoCode, 'Guest can remove a promo before payment and backend reprices');
  const myBookings = await request('/bookings', { headers: auth(guest.token) }); assert(myBookings.items.some((item: any) => item._id === booking._id), 'GET /bookings lists own reservations');
  const bookingDetail = await request(`/bookings/${booking._id}`, { headers: auth(guest.token) }); assert(bookingDetail.reference === booking.reference, 'GET /bookings/:id returns owner reservation');
  const guestLookup = await request('/bookings/lookup', post({ reference: booking.reference.toLowerCase(), email: `guest-${suffix}@example.test` }));
  assert(guestLookup.reference === booking.reference && guestLookup.room?.name, 'POST /bookings/lookup verifies booking reference and matching email');
  const privateLookup = await rawRequest('/bookings/lookup', post({ reference: booking.reference, email: 'not-the-booking-email@example.test' }));
  assert(privateLookup.status === 404, 'POST /bookings/lookup hides reservation details when verification fails');
  const csvResponse = await fetch(`${base}/admin/bookings/export.csv?date=${checkIn}`, { headers: auth((await request('/auth/login', post({ email: staffEmail, password: staffPassword }))).token) });
  assert(csvResponse.ok && (await csvResponse.text()).includes(booking.reference), 'GET /admin/bookings/export.csv exports daily reservation CSV');
  const pendingPayment = await request(`/bookings/${booking._id}/test-payment`, { ...post({ outcome: 'pending' }), headers: auth(guest.token) });
  assert(pendingPayment.booking.paymentStatus === 'pending' && pendingPayment.booking.status === 'pending', 'Test payment pending state persists without confirmation');
  const failedPayment = await request(`/bookings/${booking._id}/test-payment`, { ...post({ outcome: 'failure' }), headers: auth(guest.token) });
  assert(failedPayment.booking.paymentStatus === 'failed' && failedPayment.booking.status === 'pending', 'Test payment failure persists and allows retry');
  const successfulPayment = await request(`/bookings/${booking._id}/test-payment`, { ...post({ outcome: 'success' }), headers: auth(guest.token) });
  assert(successfulPayment.booking.paymentStatus === 'paid' && successfulPayment.booking.status === 'confirmed', 'Test payment success confirms the booking server-side');

  const enquiry = await request('/enquiries', post({ name: 'Event Guest', email: `event-${suffix}@example.test`, subject: 'Wedding celebration enquiry', message: 'We would like to arrange a wedding ceremony at the estate.', category: 'general', arrivalDate: checkIn, departureDate: checkOut, guestCount: 120, nightsRequested: 2, budgetAmount: 500000, privacyAccepted: true }));
  assert(enquiry.category === 'wedding' && enquiry.routing.department === 'Events', 'POST /enquiries routes wedding enquiry');
  await connectDatabase();
  const storedEvent = await Enquiry.findById(enquiry.id).lean();
  await disconnectDatabase();
  assert(Boolean(storedEvent?.privacyConsentAt) && storedEvent?.guestCount === 120 && storedEvent.nightsRequested === 2 && storedEvent.budgetAmount === 500000 && new Date(storedEvent!.arrivalDate!).toISOString().slice(0, 10) === checkIn && new Date(storedEvent!.departureDate!).toISOString().slice(0, 10) === checkOut, 'Structured event enquiry stores consent, dates, guest count, nights and budget');
  const noConsentEnquiry = await rawRequest('/enquiries', post({ name: 'No Consent Guest', email: `event-noconsent-${suffix}@example.test`, subject: 'Wedding celebration enquiry', message: 'We would like to arrange a wedding ceremony at the estate.' }));
  assert(noConsentEnquiry.status === 422, 'Website enquiry requires privacy consent');
  const complaint = await request('/enquiries', post({ name: 'Concerned Guest', email: `event-complaint-${suffix}@example.test`, subject: 'Complaint about our stay', message: 'I want to complain about the service and request a manager.', privacyAccepted: true }));
  assert(complaint.alertGM === true, 'New complaints automatically raise a GM alert');

  const admin = await request('/auth/login', post({ email: staffEmail, password: staffPassword }));
  assert(admin.user.role === 'reservations_staff', 'POST /auth/login authenticates Reservations Staff');
  const adminToken = admin.token;
  const complaintClearAttempt = await request(`/admin/enquiries/${complaint.id}`, { ...patch({ alertGM: false }), headers: auth(adminToken) });
  assert(complaintClearAttempt.alertGM === true, 'Complaint GM alert cannot be cleared by staff mutation');
  const now = new Date();
  const november = new Date(Date.UTC(now.getUTCFullYear(), 10, 14)) < new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const january = now.getUTCFullYear() + (now.getUTCMonth() > 0 ? 1 : 0);
  const expectedEnquiries: { reference: string; category: string; guestCount?: number; nightsRequested?: number; budgetAmount?: number; arrivalDate?: string; departureDate?: string; stayPeriod?: string; alertGM?: boolean }[] = [
    { reference: 'ENQ-4410', category: 'wedding', guestCount: 250, nightsRequested: 2, stayPeriod: 'February 2027' },
    { reference: 'ENQ-4411', category: 'booking', guestCount: 3, arrivalDate: `${november}-11-14`, departureDate: `${november}-11-16` },
    { reference: 'ENQ-4412', category: 'corporate', guestCount: 45, stayPeriod: `January ${january} (month requested; exact dates not specified)` },
  ];
  const classifiedFixtures = [] as any[];
  for (const expected of expectedEnquiries) {
    const list = await request(`/admin/enquiries?search=${expected.reference}`, { headers: auth(adminToken) });
    const fixture = list.items.find((item: any) => item.reference === expected.reference);
    assert(Boolean(fixture), `${expected.reference} sample seeded in inbox`);
    const classified = await request(`/admin/enquiries/${fixture._id}/classify`, { ...post({}), headers: auth(adminToken) });
    assert(classified.category === expected.category, `${expected.reference} classified as ${expected.category}`);
    assert(Boolean(classified.assignedTo), `${expected.reference} assigns a staff owner automatically`);
    if (expected.guestCount) assert(classified.guestCount === expected.guestCount, `${expected.reference} extracts guest count`);
    if (expected.nightsRequested) assert(classified.nightsRequested === expected.nightsRequested, `${expected.reference} extracts requested nights`);
    if (expected.budgetAmount) assert(classified.budgetAmount === expected.budgetAmount, `${expected.reference} extracts budget`);
    if (expected.arrivalDate) assert(String(classified.arrivalDate).slice(0, 10) === expected.arrivalDate, `${expected.reference} extracts arrival date`);
    if (expected.departureDate) assert(String(classified.departureDate).slice(0, 10) === expected.departureDate, `${expected.reference} extracts departure date`);
    if (expected.stayPeriod) assert(classified.requestedPeriod === expected.stayPeriod, `${expected.reference} preserves approximate stay period without inventing exact days`);
    if (expected.alertGM) assert(classified.alertGM === true, `${expected.reference} raises GM complaint alert`);
    classifiedFixtures.push(classified);
  }
  const sampleDraft = await request(`/admin/enquiries/${classifiedFixtures[0]._id}/draft-reply`, { ...post({}), headers: auth(adminToken) });
  assert(sampleDraft.sent === false && sampleDraft.commercialContext.source.includes('MongoDB'), 'AI reply is an unsent draft with MongoDB commercial context');
  const analytics = await request('/admin/analytics', { headers: auth(adminToken) }); assert(typeof analytics.metrics.occupancyPercent === 'number' && Array.isArray(analytics.dailyBookings) && analytics.period.days === 14, 'GET /admin/analytics defaults to a 14-day chart period');
  const monthlyAnalytics = await request('/admin/analytics?days=30', { headers: auth(adminToken) }); assert(monthlyAnalytics.period.days === 30 && monthlyAnalytics.metrics.bookingsInPeriod === Object.values(monthlyAnalytics.statusCounts).reduce((sum: number, count: any) => sum + count, 0), 'GET /admin/analytics applies selected period to metrics');
  const invalidAnalytics = await rawRequest('/admin/analytics?days=100', { headers: auth(adminToken) }); assert(invalidAnalytics.status === 422 && !invalidAnalytics.body.success, 'GET /admin/analytics rejects unsupported period lengths');
  const adminBookings = await request(`/admin/bookings?status=confirmed&from=${checkIn}&to=${checkOut}`, { headers: auth(adminToken) }); assert(Array.isArray(adminBookings.items), 'GET /admin/bookings supports status/date filters');
  const calendar = await request(`/admin/allotments?from=${checkIn}&to=${checkOut}&roomId=${room._id}`, { headers: auth(adminToken) }); assert(Array.isArray(calendar.items), 'GET /admin/allotments returns calendar data');
  const dailyRates = await request(`/admin/rates?from=${checkIn}&to=${checkOut}&roomId=${room._id}`, { headers: auth(adminToken) }); assert(Array.isArray(dailyRates.items), 'GET /admin/rates returns managed daily rates');
  for (const kind of ['rooms', 'bookings', 'enquiries', 'payments', 'promos', 'users', 'rateplans']) {
    const result = await request(`/admin/${kind}`, { headers: auth(adminToken) }); assert(Array.isArray(result.items), `GET /admin/${kind} admin authorization`);
  }
  const staffList = await request('/admin/users?limit=100', { headers: auth(adminToken) });
  const staffUser = staffList.items.find((item: any) => item.role === 'reservations_staff' && item.staffDepartment !== 'Reservations');
  assert(Boolean(staffUser), 'Seeded staff roster is available for assignment');
  const simulated = await request('/admin/enquiries/simulate', { ...post({ source: 'whatsapp', name: 'Simulated Guest', email: `event-${suffix}@example.test`, subject: 'WhatsApp wedding question', message: 'We would like to ask about a wedding event in December.' }), headers: auth(adminToken) });
  assert(simulated.source === 'whatsapp' && simulated.category === 'wedding', 'Simulated WhatsApp source enters and classifies in inbox');
  const corrected = await request(`/admin/enquiries/${simulated.id}`, { ...patch({ category: 'corporate', assignedTo: staffUser._id, replyDraft: 'Thank you for contacting EstateStay. Our Corporate Sales team will follow up after checking your request.' }), headers: auth(adminToken) });
  assert(corrected.ai.manualOverride === true && corrected.assignedDepartment === staffUser.staffDepartment && String(corrected.assignedTo._id ?? corrected.assignedTo) === staffUser._id, 'Manual correction, staff assignment and reply-draft edit persist');
  const newRoom = await request('/admin/rooms', { ...post({ code: `QA-${suffix}`, name: 'QA Garden Room', kind: 'room', category: 'Garden Room', description: 'QA room for endpoint verification only.', capacity: { adults: 2, children: 1 }, bedrooms: 1, areaSqm: 40, amenities: [], images: [], baseRate: 1000 }), headers: auth(adminToken) });
  assert(Boolean(newRoom._id), 'POST /admin/rooms creates room');
  const updatedRoom = await request(`/admin/rooms/${newRoom._id}`, { ...patch({ active: false }), headers: auth(adminToken) });
  assert(updatedRoom.active === false, 'PATCH /admin/rooms/:id updates room');
  const plan = await request('/admin/rateplans', { ...post({ code: `QA${suffix}`, name: 'QA rate plan', inclusions: [] }), headers: auth(adminToken) });
  assert(Boolean(plan._id), 'POST /admin/rateplans creates rate plan');
  const promo = await request('/admin/promocodes', { ...post({ code: `QA${suffix}`, kind: 'fixed', value: 500, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString() }), headers: auth(adminToken) });
  assert(Boolean(promo._id), 'POST /admin/promocodes creates promo');
  const updatedPromo = await request(`/admin/promocodes/${promo._id}`, { ...patch({ active: false }), headers: auth(adminToken) }); assert(updatedPromo.active === false, 'PATCH /admin/promocodes/:id toggles promo status');
  const adminBooking = await request(`/admin/bookings/${booking._id}`, { ...patch({ status: 'confirmed' }), headers: auth(adminToken) });
  assert(adminBooking.status === 'confirmed', 'PATCH /admin/bookings/:id updates booking');
  const payments = await request('/admin/payments', { headers: auth(adminToken) });
  const payment = payments.items.find((item: any) => String(item.booking) === booking._id);
  if (payment) {
    const paid = await request(`/admin/payments/${payment._id}`, { ...patch({ status: 'paid', providerReference: `QA-${suffix}` }), headers: auth(adminToken) });
    assert(paid.status === 'paid', 'PATCH /admin/payments/:id updates payment and confirms booking');
  }
  const patchedEnquiry = await request(`/admin/enquiries/${enquiry.id}`, { ...patch({ status: 'in_progress' }), headers: auth(adminToken) });
  assert(patchedEnquiry.status === 'in_progress', 'PATCH /admin/enquiries/:id updates enquiry');
  const rate = await request('/admin/rates', { ...post({ roomId: room._id, ratePlanId: plan._id, date: checkIn, amount: 9999 }), headers: auth(adminToken) });
  assert(rate.amount === 9999, 'POST /admin/rates upserts daily price');
  const allotment = await request('/admin/allotments', { ...post({ roomId: room._id, date: checkIn, total: 1 }), headers: auth(adminToken) });
  assert(allotment.total === 1, 'POST /admin/allotments upserts inventory');
  const blackout = await request('/admin/blackouts', { ...post({ from: checkIn, to: checkOut, closed: true }), headers: auth(adminToken) });
  assert(blackout.closed && blackout.rooms === 76 && blackout.dates === 2, 'POST /admin/blackouts closes all 76 residences over a date range');
  const closedInventory = await request(`/admin/allotments?from=${checkIn}&to=${checkOut}&roomId=${room._id}`, { headers: auth(adminToken) });
  const bookedNightWhileClosed = closedInventory.items.find((item: any) => String(item.date).slice(0, 10) === checkIn);
  assert(bookedNightWhileClosed?.closed === true && bookedNightWhileClosed.booked === 1, 'Blackout preserves existing booked inventory while blocking new sales');
  const reopened = await request('/admin/blackouts', { ...post({ from: checkIn, to: checkOut, closed: false }), headers: auth(adminToken) });
  assert(!reopened.closed && reopened.rooms === 76, 'POST /admin/blackouts reopens all residences without changing bookings');

  const forbidden = await fetch(`${base}/admin/rooms`);
  assert(forbidden.status === 401, 'admin management rejects unauthenticated requests');
  const guestForbidden = await fetch(`${base}/admin/rooms`, { headers: auth(guest.token) });
  assert(guestForbidden.status === 403, 'admin management rejects authenticated guest roles');
  const invalid = await fetch(`${base}/availability?checkIn=not-a-date&checkOut=${checkOut}`, { headers: { 'Content-Type': 'application/json' } });
  assert(invalid.status === 422, 'availability validates malformed dates');
  const cancelled = await request(`/bookings/${booking._id}/cancel`, { method: 'POST', headers: auth(guest.token) });
  assert(cancelled.status === 'cancelled', 'POST /bookings/:id/cancel releases stay inventory');
  await cleanupSmokeData();
  console.log(`\nSmoke tests passed: ${passed}`);
}

main().catch(async (error) => { console.error('Smoke tests failed:', error); try { await cleanupSmokeData(); } catch (cleanupError) { console.error('Smoke cleanup failed:', cleanupError); } process.exitCode = 1; });
