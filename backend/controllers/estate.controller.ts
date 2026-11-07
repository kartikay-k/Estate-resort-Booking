import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { env } from '../config/env.js';
import { Allotment } from '../models/allotment.model.js';
import { Booking } from '../models/booking.model.js';
import { DailyRate } from '../models/dailyRate.model.js';
import { Enquiry } from '../models/enquiry.model.js';
import { Payment } from '../models/payment.model.js';
import { PromoCode } from '../models/promoCode.model.js';
import { RatePlan } from '../models/ratePlan.model.js';
import { Room } from '../models/room.model.js';
import { User } from '../models/user.model.js';
import type { AuthRequest } from '../middleware/auth.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { classifyEnquiry, generateReplyDraft, type EnquiryInput } from '../services/enquiryAi.service.js';

const DAY = 86_400_000;
const GST_TARIFF_THRESHOLD_INR = 7_500;
const GST_LOW_TARIFF_RATE = 0.05;
const GST_HIGH_TARIFF_RATE = 0.18;
const day = (value: string | Date) => new Date(`${new Date(value).toISOString().slice(0, 10)}T00:00:00.000Z`);
const dayRange = (from: Date, to: Date) => {
  const result: Date[] = [];
  for (let cursor = new Date(from); cursor < to; cursor = new Date(cursor.getTime() + DAY)) result.push(new Date(cursor));
  return result;
};
const tokenFor = (user: { id: string; role: string }) => jwt.sign({ role: user.role }, env.jwtSecret, { subject: user.id, expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
const publicUser = (u: { id: string; name: string; email: string; role: string; phone?: string }) => ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone });
const aiSnapshot = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? { ...(value as Record<string, unknown>) } : {};

function discountForPromo(promo: { kind: string; value: number; maxDiscount?: number | null }, subtotal: number) {
  let discount = promo.kind === 'percent' ? subtotal * promo.value / 100 : promo.value;
  if (promo.maxDiscount != null) discount = Math.min(discount, promo.maxDiscount);
  return Math.min(Math.round(discount), subtotal);
}

function repriceBooking(booking: InstanceType<typeof Booking>, discount: number) {
  const factor = booking.subtotal > 0 ? (booking.subtotal - discount) / booking.subtotal : 1;
  const taxBreakdown = (booking.taxBreakdown ?? []).map((line) => ({
    date: line.date,
    tariff: line.tariff,
    rate: line.rate,
    amount: Math.round(line.tariff * factor * line.rate),
  }));
  const tax = taxBreakdown.reduce((sum, line) => sum + line.amount, 0);
  return { discount, taxBreakdown, tax, total: booking.subtotal - discount + tax };
}

export async function register(req: Request, res: Response) {
  const { name, email, password, phone } = req.body;
  const exists = await User.exists({ email });
  if (exists) throw ApiError.conflict('An account with this email already exists');
  const user = await User.create({ name, email, phone, privacyConsentAt: new Date(), passwordHash: await bcrypt.hash(password, 12), role: 'guest' });
  sendSuccess(res, 201, { user: publicUser(user), token: tokenFor(user) }, 'Account created');
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.isActive || !(await bcrypt.compare(password, String(user.passwordHash)))) throw ApiError.unauthorized('Email or password is incorrect');
  sendSuccess(res, 200, { user: publicUser(user), token: tokenFor(user) }, 'Signed in');
}

export async function me(req: AuthRequest, res: Response) {
  const user = await User.findById(req.user!.id);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is unavailable');
  sendSuccess(res, 200, { user: publicUser(user) });
}

export async function listRooms(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 24));
  const filter: Record<string, unknown> = { active: true };
  if (req.query.kind === 'room' || req.query.kind === 'villa') filter.kind = req.query.kind;
  if (typeof req.query.category === 'string') filter.category = req.query.category;
  const [items, total] = await Promise.all([Room.find(filter).sort({ kind: 1, code: 1 }).skip((page - 1) * limit).limit(limit).lean(), Room.countDocuments(filter)]);
  sendSuccess(res, 200, { items, page, limit, total, pages: Math.ceil(total / limit) });
}

export async function getRoom(req: Request, res: Response) {
  const room = await Room.findOne({ _id: req.params.id, active: true }).lean();
  if (!room) throw ApiError.notFound('Room not found');
  sendSuccess(res, 200, room);
}

export async function availability(req: Request, res: Response) {
  const query = req.query as unknown as { checkIn: string; checkOut: string; adults: string | number; children: string | number; kind?: 'room' | 'villa' };
  const { checkIn, checkOut, kind } = query;
  const adults = Number(query.adults ?? 2);
  const children = Number(query.children ?? 0);
  const from = day(checkIn); const to = day(checkOut);
  if (to <= from) throw ApiError.validation('checkOut must be after checkIn');
  if (from < day(new Date())) throw ApiError.validation('checkIn must be today or later');
  if ((to.getTime() - from.getTime()) / DAY > 30) throw ApiError.validation('Stay cannot exceed 30 nights');
  const dates = dayRange(from, to);
  const filter: Record<string, unknown> = { active: true, 'capacity.adults': { $gte: adults }, 'capacity.children': { $gte: children } };
  if (kind) filter.kind = kind;
  const rooms = await Room.find(filter).lean();
  const roomIds = rooms.map((room) => room._id);
  const [allotments, rates, flexPlan] = await Promise.all([
    Allotment.find({ room: { $in: roomIds }, date: { $in: dates } }).lean(),
    DailyRate.find({ room: { $in: roomIds }, date: { $in: dates }, closed: false }).populate('ratePlan', 'code name').lean(),
    RatePlan.findOne({ code: 'FLEX', active: true }).lean(),
  ]);
  const inventory = new Map(allotments.map((a) => [`${a.room}:${a.date.toISOString().slice(0, 10)}`, a]));
  const daily = new Map<string, typeof rates>();
  for (const rate of rates) {
    const key = `${rate.room}:${rate.date.toISOString().slice(0, 10)}`;
    daily.set(key, [...(daily.get(key) ?? []), rate]);
  }
  const items = rooms.filter((room) => dates.every((date) => {
    const key = `${room._id}:${date.toISOString().slice(0, 10)}`;
    const a = inventory.get(key);
    return Boolean(a && !a.closed && a.total - a.held - a.booked > 0 && (daily.get(key)?.length ?? 0) > 0);
  })).map((room) => {
    const nightly = dates.map((date) => {
      const key = `${room._id}:${date.toISOString().slice(0, 10)}`;
      const options = daily.get(key) ?? [];
      const chosen = options.find((r) => (r.ratePlan as unknown as { code?: string })?.code === 'FLEX') ?? options[0];
      return { date: date.toISOString().slice(0, 10), amount: chosen?.amount ?? room.baseRate, ratePlanId: chosen?.ratePlan?._id };
    });
    return { ...room, available: true, nights: dates.length, totalFrom: nightly.reduce((sum, rate) => sum + rate.amount, 0), currency: 'INR', nightlyRates: nightly, ratePlan: flexPlan };
  });
  sendSuccess(res, 200, { checkIn: from.toISOString().slice(0, 10), checkOut: to.toISOString().slice(0, 10), nights: dates.length, guests: { adults, children }, items });
}

export async function getRates(req: Request, res: Response) {
  const roomId = String(req.query.roomId ?? '');
  const fromText = String(req.query.from ?? ''); const toText = String(req.query.to ?? '');
  if (!Types.ObjectId.isValid(roomId) || !/^\d{4}-\d{2}-\d{2}$/.test(fromText) || !/^\d{4}-\d{2}-\d{2}$/.test(toText)) throw ApiError.validation('roomId, from and to are required');
  const from = day(fromText); const to = day(toText);
  if (to <= from || (to.getTime() - from.getTime()) / DAY > 90) throw ApiError.validation('Rate range must be 1–90 days');
  const rates = await DailyRate.find({ room: roomId, date: { $gte: from, $lt: to } }).populate('ratePlan', 'code name inclusions cancellationPolicy').sort({ date: 1 }).lean();
  sendSuccess(res, 200, { roomId, from: fromText, to: toText, items: rates });
}

async function releaseInventory(booking: { room: Types.ObjectId; checkIn: Date; checkOut: Date; nights: number }) {
  for (const date of dayRange(day(booking.checkIn), day(booking.checkOut))) {
    await Allotment.updateOne({ room: booking.room, date, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
  }
}

export async function createBooking(req: AuthRequest, res: Response) {
  const input = req.body;
  const checkIn = day(input.checkIn); const checkOut = day(input.checkOut);
  if (checkOut <= checkIn) throw ApiError.validation('checkOut must be after checkIn');
  const nights = (checkOut.getTime() - checkIn.getTime()) / DAY;
  if (nights > 30 || checkIn < day(new Date())) throw ApiError.validation('Booking dates are outside allowed range');
  const room = await Room.findOne({ _id: input.roomId, active: true });
  if (!room) throw ApiError.notFound('Room not found');
  const capacity = room.capacity as { adults: number; children: number };
  if (input.adults > capacity.adults || input.children > capacity.children) throw ApiError.validation('Guest count exceeds this accommodation capacity');
  const plan = await RatePlan.findOne({ code: input.ratePlanCode, active: true });
  if (!plan) throw ApiError.validation('Rate plan is unavailable');
  const dates = dayRange(checkIn, checkOut);
  const rates = await DailyRate.find({ room: room._id, ratePlan: plan._id, date: { $in: dates }, closed: false }).lean();
  if (rates.length !== nights) throw ApiError.conflict('Selected rate is not available for all stay dates');
  const subtotal = rates.reduce((sum, rate) => sum + rate.amount, 0);
  let discount = 0; let promoCode: string | undefined;
  if (input.promoCode) {
    const promo = await PromoCode.findOne({ code: input.promoCode.toUpperCase(), active: true, startsAt: { $lte: new Date() }, endsAt: { $gte: new Date() }, $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }] });
    if (!promo || subtotal < promo.minSpend) throw ApiError.validation('Promo code is invalid or does not meet its minimum spend');
    discount = promo.kind === 'percent' ? subtotal * promo.value / 100 : promo.value;
    if (promo.maxDiscount != null) discount = Math.min(discount, promo.maxDiscount);
    discount = Math.min(Math.round(discount), subtotal);
    promoCode = promo.code;
  }
  // Indian hotel-accommodation GST is selected from each night's room tariff,
  // not the stay subtotal. Promotional discounts are allocated proportionally.
  const discountFactor = subtotal > 0 ? (subtotal - discount) / subtotal : 1;
  const taxBreakdown = rates.map((rate) => {
    const gstRate = rate.amount <= GST_TARIFF_THRESHOLD_INR ? GST_LOW_TARIFF_RATE : GST_HIGH_TARIFF_RATE;
    return { date: rate.date, tariff: rate.amount, rate: gstRate, amount: Math.round(rate.amount * discountFactor * gstRate) };
  });
  const taxable = subtotal - discount;
  const tax = taxBreakdown.reduce((sum, line) => sum + line.amount, 0);
  const total = taxable + tax;
  // Conditional per-night inventory claims prevent overselling without requiring replica-set transactions.
  const claimed: Date[] = [];
  let createdBookingId: Types.ObjectId | undefined;
  try {
    for (const date of dates) {
      const result = await Allotment.updateOne({ room: room._id, date, closed: false, $expr: { $gt: [{ $subtract: ['$total', { $add: ['$held', '$booked'] }] }, 0] } }, { $inc: { booked: 1 } });
      if (result.modifiedCount !== 1) throw ApiError.conflict('This accommodation is no longer available for the selected dates');
      claimed.push(date);
    }
    const user = await User.findById(req.user!.id);
    const booking = await Booking.create({ reference: `ES-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, user: req.user!.id, room: room._id, ratePlan: plan._id, checkIn, checkOut, nights, guests: { adults: input.adults, children: input.children }, subtotal, discount, tax, taxBreakdown, total, currency: 'INR', paymentStatus: 'pending', promoCode, specialRequests: input.specialRequests, guestSnapshot: { name: input.guestName ?? user?.name, email: input.guestEmail ?? user?.email, phone: input.guestPhone ?? user?.phone } });
    createdBookingId = booking._id;
    await Payment.create({ booking: booking._id, amount: total, currency: 'INR', status: 'pending', provider: 'manual' });
    if (promoCode) await PromoCode.updateOne({ code: promoCode }, { $inc: { usedCount: 1 } });
    const populated = await Booking.findById(booking._id).populate('room', 'code name kind category images').populate('ratePlan', 'code name').lean();
    sendSuccess(res, 201, populated, 'Booking created; payment is pending');
  } catch (error) {
    if (createdBookingId) {
      await Payment.deleteMany({ booking: createdBookingId });
      await Booking.deleteOne({ _id: createdBookingId });
    }
    for (const date of claimed) await Allotment.updateOne({ room: room._id, date, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
    throw error;
  }
}

export async function applyBookingPromo(req: AuthRequest, res: Response) {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (req.user!.role !== 'reservations_staff' && String(booking.user) !== req.user!.id) throw ApiError.forbidden('You cannot update this booking');
  if (booking.status !== 'pending' || booking.paymentStatus !== 'pending') throw ApiError.conflict('Promo codes can only be changed before payment');

  const requestedCode = String(req.body.code ?? '').trim().toUpperCase();
  const previousCode = booking.promoCode ?? undefined;
  if (requestedCode === (previousCode ?? '')) {
    const same = await Booking.findById(booking._id).populate('room', 'code name kind category images').populate('ratePlan', 'code name').lean();
    sendSuccess(res, 200, same, requestedCode ? 'Promo code is already applied' : 'No promo code applied');
    return;
  }

  let claimedPromoCode: string | undefined;
  let discount = 0;
  if (requestedCode) {
    const newPromo = await PromoCode.findOneAndUpdate(
      {
        code: requestedCode, active: true, startsAt: { $lte: new Date() }, endsAt: { $gte: new Date() },
        minSpend: { $lte: booking.subtotal },
        $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
      },
      { $inc: { usedCount: 1 } },
      { returnDocument: 'after' },
    );
    if (!newPromo) throw ApiError.validation('Promo code is invalid, expired, fully redeemed, or below its minimum spend');
    claimedPromoCode = requestedCode;
    discount = discountForPromo(newPromo as unknown as { kind: string; value: number; maxDiscount?: number | null }, booking.subtotal);
  }

  const pricing = repriceBooking(booking, discount);
  const update: Record<string, unknown> = { $set: { ...pricing }, $inc: { __v: 1 } };
  if (requestedCode) (update.$set as Record<string, unknown>).promoCode = requestedCode;
  else update.$unset = { promoCode: 1 };
  const changed = await Booking.findOneAndUpdate(
    { _id: booking._id, __v: booking.__v, status: 'pending', paymentStatus: 'pending' },
    update,
    { returnDocument: 'after', runValidators: true },
  );
  if (!changed) {
    if (claimedPromoCode) await PromoCode.updateOne({ code: claimedPromoCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
    throw ApiError.conflict('Booking changed while applying the promo; refresh the summary and try again');
  }
  if (previousCode) await PromoCode.updateOne({ code: previousCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
  await Payment.updateOne({ booking: changed._id, status: 'pending' }, { $set: { amount: changed.total, currency: changed.currency } });
  const result = await Booking.findById(changed._id).populate('room', 'code name kind category images').populate('ratePlan', 'code name').lean();
  sendSuccess(res, 200, result, requestedCode ? 'Promo code applied; total recalculated' : 'Promo code removed; total recalculated');
}

async function releasePromoUsage(booking: { promoCode?: string | null }) {
  if (booking.promoCode) await PromoCode.updateOne({ code: booking.promoCode, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}

export async function listBookings(req: AuthRequest, res: Response) {
  const filter = req.user!.role === 'reservations_staff' ? {} : { user: req.user!.id };
  const items = await Booking.find(filter).populate('room', 'code name kind category images').populate('ratePlan', 'code name').sort({ createdAt: -1 }).lean();
  sendSuccess(res, 200, { items });
}

export async function getBooking(req: AuthRequest, res: Response) {
  const booking = await Booking.findById(req.params.id).populate('room', 'code name kind category images').populate('ratePlan', 'code name').lean();
  if (!booking) throw ApiError.notFound('Booking not found');
  if (req.user!.role !== 'reservations_staff' && String(booking.user) !== req.user!.id) throw ApiError.forbidden('You cannot view this booking');
  sendSuccess(res, 200, booking);
}

/** Lookup verifies the unguessable booking reference and its guest email. */
export async function lookupBooking(req: Request, res: Response) {
  const reference = String(req.body.reference).toUpperCase();
  const email = String(req.body.email).trim().toLowerCase();
  const booking = await Booking.findOne({ reference }).populate('room', 'code name kind category images').populate('ratePlan', 'code name').lean();
  if (!booking) throw ApiError.notFound('No booking matched those verification details');
  const snapshotEmail = String(booking.guestSnapshot?.email ?? '').trim().toLowerCase();
  const user = snapshotEmail ? null : await User.findById(booking.user).select('email').lean();
  const verifiedEmail = snapshotEmail || String(user?.email ?? '').trim().toLowerCase();
  if (!verifiedEmail || verifiedEmail !== email) throw ApiError.notFound('No booking matched those verification details');
  sendSuccess(res, 200, {
    reference: booking.reference, status: booking.status, paymentStatus: booking.paymentStatus,
    checkIn: booking.checkIn, checkOut: booking.checkOut, nights: booking.nights, guests: booking.guests,
    room: booking.room, ratePlan: booking.ratePlan, subtotal: booking.subtotal, discount: booking.discount,
    tax: booking.tax, taxBreakdown: booking.taxBreakdown, total: booking.total, currency: booking.currency,
  }, 'Booking verified');
}

export async function cancelBooking(req: AuthRequest, res: Response) {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (req.user!.role !== 'reservations_staff' && String(booking.user) !== req.user!.id) throw ApiError.forbidden('You cannot cancel this booking');
  if (!['pending', 'confirmed'].includes(booking.status)) throw ApiError.conflict('Booking cannot be cancelled in its current state');
  const cancelled = await Booking.findOneAndUpdate({ _id: booking._id, status: { $in: ['pending', 'confirmed'] } }, { $set: { status: 'cancelled' } }, { returnDocument: 'after' });
  if (!cancelled) throw ApiError.conflict('Booking has already changed state');
  await releaseInventory(cancelled);
  await releasePromoUsage(cancelled);
  sendSuccess(res, 200, { reference: cancelled.reference, status: cancelled.status, paymentStatus: cancelled.paymentStatus }, 'Booking cancelled');
}

export async function testPayment(req: AuthRequest, res: Response) {
  const outcome = req.body.outcome as 'success' | 'failure' | 'pending';
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (req.user!.role !== 'reservations_staff' && String(booking.user) !== req.user!.id) throw ApiError.forbidden('You cannot pay for this booking');
  if (booking.status === 'cancelled' || booking.status === 'completed') throw ApiError.conflict('This booking is no longer payable');
  const payment = await Payment.findOne({ booking: booking._id });
  if (!payment) throw ApiError.notFound('Payment record not found');
  const status = outcome === 'success' ? 'paid' : outcome === 'failure' ? 'failed' : 'pending';
  payment.status = status;
  payment.provider = 'manual';
  payment.method = 'test';
  payment.providerReference = `TEST-${booking.reference}-${Date.now()}`;
  payment.paidAt = status === 'paid' ? new Date() : undefined;
  payment.metadata = { testOutcome: outcome };
  await payment.save();
  booking.paymentStatus = status;
  if (status === 'paid') booking.status = 'confirmed';
  await booking.save();
  sendSuccess(res, 200, { booking: { id: booking.id, reference: booking.reference, status: booking.status, paymentStatus: booking.paymentStatus }, payment: { id: payment.id, status: payment.status, amount: payment.amount, currency: payment.currency, providerReference: payment.providerReference } }, status === 'paid' ? 'Test payment succeeded; booking confirmed' : status === 'failed' ? 'Test payment failed; inventory remains held for retry' : 'Payment remains pending');
}

const CATEGORY_TEAM: Record<string, string> = {
  booking: 'Reservations', wedding: 'Events', corporate: 'Corporate Sales',
  experience: 'Guest Experience', complaint: 'General Manager', general: 'Guest Services',
};

function enquiryInput(input: Record<string, any>): EnquiryInput {
  return { name: String(input.name ?? ''), email: String(input.email ?? ''), phone: input.phone, subject: String(input.subject ?? ''), message: String(input.message ?? ''), category: input.category };
}

async function persistClassifiedEnquiry(input: Record<string, any>) {
  const classified = await classifyEnquiry(enquiryInput(input));
  const category = classified.confidence < 0.6 ? 'unsorted' : classified.category;
  const department = CATEGORY_TEAM[category];
  const alertGM = category === 'complaint' || classified.priority === 'urgent' || classified.confidence < 0.6;
  const reference = input.reference ?? `ENQ-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const owner = department ? await User.findOne({ role: 'reservations_staff', staffDepartment: department, isActive: true }).sort({ createdAt: 1 }).select('_id').lean() : null;
  const enquiry = await Enquiry.create({
    reference, name: input.name, email: input.email, phone: input.phone, subject: input.subject, message: input.message,
    source: input.source ?? 'website', category, status: category === 'unsorted' ? 'unsorted' : 'routed', priority: classified.priority, alertGM,
    arrivalDate: input.arrivalDate ? day(input.arrivalDate) : classified.arrivalDate ? day(classified.arrivalDate) : undefined,
    departureDate: input.departureDate ? day(input.departureDate) : classified.departureDate ? day(classified.departureDate) : undefined,
    requestedPeriod: classified.stayPeriod ?? undefined,
    guestCount: input.guestCount ?? classified.guestCount ?? undefined,
    nightsRequested: input.nightsRequested ?? classified.nightsRequested ?? undefined,
    budgetAmount: input.budgetAmount ?? classified.budgetAmount ?? undefined,
    budgetCurrency: input.budgetAmount !== undefined ? 'INR' : classified.budgetCurrency ?? undefined,
    privacyConsentAt: input.privacyAccepted ? new Date() : undefined,
    assignedDepartment: department,
    assignedTo: owner?._id,
    routing: { department, confidence: classified.confidence, reason: classified.reason },
    ai: { provider: classified.provider, model: classified.model, summary: classified.summary, reason: classified.reason, confidence: classified.confidence, manualOverride: false, classifiedAt: new Date() },
  });
  return enquiry;
}

export async function createEnquiry(req: Request, res: Response) {
  const enquiry = await persistClassifiedEnquiry({ ...req.body, source: req.body.source ?? 'website' });
  sendSuccess(res, 201, { id: enquiry.id, reference: enquiry.reference, category: enquiry.category, status: enquiry.status, priority: enquiry.priority, alertGM: enquiry.alertGM, routing: enquiry.routing, confidence: enquiry.ai?.confidence }, 'Enquiry received for staff review');
}

export async function simulateEnquiry(req: Request, res: Response) {
  const enquiry = await persistClassifiedEnquiry(req.body);
  sendSuccess(res, 201, { id: enquiry.id, reference: enquiry.reference, source: enquiry.source, category: enquiry.category, status: enquiry.status, priority: enquiry.priority, alertGM: enquiry.alertGM, routing: enquiry.routing, confidence: enquiry.ai?.confidence }, 'Simulated channel enquiry added to inbox');
}

export async function adminEnquiries(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const filter: Record<string, any> = {};
  for (const key of ['status', 'category', 'source'] as const) if (typeof req.query[key] === 'string' && req.query[key] !== 'all') filter[key] = req.query[key];
  if (req.query.alertGM === 'true') filter.alertGM = true;
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const text = req.query.search.trim();
    filter.$or = ['reference', 'name', 'email', 'subject', 'message'].map((field) => ({ [field]: { $regex: text, $options: 'i' } }));
  }
  const [items, total] = await Promise.all([
    Enquiry.find(filter).populate('assignedTo', 'name email role').sort({ alertGM: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Enquiry.countDocuments(filter),
  ]);
  sendSuccess(res, 200, { items, page, limit, total, pages: Math.ceil(total / limit) });
}

export async function adminClassifyEnquiry(req: Request, res: Response) {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  const classified = await classifyEnquiry(enquiryInput(enquiry.toObject() as Record<string, any>));
  const category = classified.confidence < 0.6 ? 'unsorted' : classified.category;
  const department = CATEGORY_TEAM[category];
  enquiry.category = category as typeof enquiry.category;
  enquiry.status = category === 'unsorted' ? 'unsorted' : 'routed';
  enquiry.priority = classified.priority;
  enquiry.alertGM = category === 'complaint' || classified.priority === 'urgent' || classified.confidence < 0.6;
  enquiry.arrivalDate = classified.arrivalDate ? day(classified.arrivalDate) : undefined;
  enquiry.departureDate = classified.departureDate ? day(classified.departureDate) : undefined;
  enquiry.requestedPeriod = classified.stayPeriod ?? undefined;
  enquiry.guestCount = classified.guestCount ?? undefined;
  enquiry.nightsRequested = classified.nightsRequested ?? undefined;
  enquiry.budgetAmount = classified.budgetAmount ?? undefined;
  enquiry.budgetCurrency = classified.budgetCurrency ?? undefined;
  enquiry.assignedDepartment = department;
  const owner = department ? await User.findOne({ role: 'reservations_staff', staffDepartment: department, isActive: true }).sort({ createdAt: 1 }).select('_id').lean() : null;
  enquiry.assignedTo = owner?._id;
  enquiry.routing = { department, confidence: classified.confidence, reason: classified.reason };
  enquiry.ai = { provider: classified.provider, model: classified.model, summary: classified.summary, reason: classified.reason, confidence: classified.confidence, manualOverride: false, classifiedAt: new Date() };
  await enquiry.save();
  sendSuccess(res, 200, enquiry, 'Enquiry classified and routed for staff review');
}

async function commercialContext(enquiry: InstanceType<typeof Enquiry>) {
  const filter: Record<string, any> = { active: true };
  if (enquiry.category === 'booking' && enquiry.guestCount) filter['capacity.adults'] = { $gte: enquiry.guestCount };
  const rooms = await Room.find(filter).select('code name category capacity baseRate').limit(40).lean();
  if (!enquiry.arrivalDate || !enquiry.departureDate || enquiry.departureDate <= enquiry.arrivalDate) {
    return { source: 'MongoDB Room catalogue', asOf: new Date().toISOString(), note: 'Base tariffs are indicative catalogue data, not a live quote or availability promise.', residences: rooms.map((room) => ({ code: room.code, name: room.name, category: room.category, baseTariffINR: room.baseRate })) };
  }
  const dates = dayRange(day(enquiry.arrivalDate), day(enquiry.departureDate));
  if (!dates.length || dates.length > 30) return { source: 'MongoDB', asOf: new Date().toISOString(), note: 'Requested date range is outside the live quote window.', residences: [] };
  const ids = rooms.map((room) => room._id);
  const [inventory, dailyRates, flexPlan] = await Promise.all([
    Allotment.find({ room: { $in: ids }, date: { $in: dates } }).lean(),
    DailyRate.find({ room: { $in: ids }, date: { $in: dates }, closed: false }).populate('ratePlan', 'code').lean(),
    RatePlan.findOne({ code: 'FLEX', active: true }).select('_id').lean(),
  ]);
  const inventoryMap = new Map(inventory.map((entry) => [`${entry.room}:${entry.date.toISOString().slice(0, 10)}`, entry]));
  const ratesMap = new Map<string, number[]>();
  for (const rate of dailyRates) {
    const plan = rate.ratePlan as unknown as { _id: Types.ObjectId; code: string };
    if (flexPlan && String(plan._id) !== String(flexPlan._id)) continue;
    const key = `${rate.room}:${rate.date.toISOString().slice(0, 10)}`;
    ratesMap.set(key, [...(ratesMap.get(key) ?? []), rate.amount]);
  }
  const residences = rooms.flatMap((room) => {
    const nightly = dates.map((date) => {
      const key = `${room._id}:${date.toISOString().slice(0, 10)}`;
      const stock = inventoryMap.get(key); const rate = ratesMap.get(key)?.[0];
      if (!stock || stock.closed || stock.total - stock.booked - stock.held < 1 || rate === undefined) return null;
      return { date: date.toISOString().slice(0, 10), tariffINR: rate };
    });
    return nightly.every(Boolean) ? [{ code: room.code, name: room.name, nightlyRates: nightly, totalTariffINR: nightly.reduce((sum, line) => sum + (line?.tariffINR ?? 0), 0) }] : [];
  });
  return { source: 'MongoDB DailyRate + Allotment', asOf: new Date().toISOString(), dates: dates.map((date) => date.toISOString().slice(0, 10)), note: 'This is accommodation inventory only, not wedding/event venue confirmation. Only listed residences are currently available for every requested night; staff must confirm event capacity and final terms.', residences };
}

export async function adminDraftEnquiryReply(req: Request, res: Response) {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  const context = await commercialContext(enquiry);
  const result = await generateReplyDraft(enquiryInput(enquiry.toObject() as Record<string, any>), context);
  enquiry.ai = { ...aiSnapshot(enquiry.ai), provider: result.provider, model: result.model, replyDraft: result.replyDraft, replyDraftedAt: result.generatedAt } as typeof enquiry.ai;
  await enquiry.save();
  sendSuccess(res, 200, { reference: enquiry.reference, replyDraft: result.replyDraft, commercialContext: context, sent: false }, 'Reply draft generated and saved; not sent');
}

export async function adminList(req: Request, res: Response) {
  const kind = String(req.params.kind);
  const map: Record<string, Model<any>> = { rooms: Room, bookings: Booking, enquiries: Enquiry, payments: Payment, promos: PromoCode, users: User, rateplans: RatePlan };
  const entity = map[kind]; if (!entity) throw ApiError.notFound('Admin resource not found');
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const [items, total] = await Promise.all([entity.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), entity.countDocuments()]);
  sendSuccess(res, 200, { items, page, limit, total });
}

export async function adminAnalytics(req: Request, res: Response) {
  const days = Number(req.query.days ?? 14);
  if (!Number.isInteger(days) || days < 1 || days > 90) throw ApiError.validation('Analytics days must be an integer from 1 to 90');
  const today = day(new Date());
  const from = new Date(today.getTime() - (days - 1) * DAY);
  const through = new Date(today.getTime() + DAY);
  const [roomCount, bookings, daily, allotments, paidRevenue, pendingPayments] = await Promise.all([
    Room.countDocuments({ active: true }),
    Booking.aggregate([{ $match: { createdAt: { $gte: from } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Booking.aggregate([
      { $match: { checkIn: { $gte: from, $lt: through }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkIn', timezone: 'UTC' } }, bookings: { $sum: 1 }, paidRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } } } },
      { $sort: { _id: 1 } },
    ]),
    Allotment.aggregate([{ $match: { date: { $gte: from, $lt: through } } }, { $group: { _id: null, total: { $sum: '$total' }, booked: { $sum: '$booked' } } }]),
    Booking.aggregate([{ $match: { paymentStatus: 'paid', status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Payment.countDocuments({ status: 'pending' }),
  ]);
  const statusCounts = Object.fromEntries(bookings.map((item) => [item._id, item.count]));
  const inventory = allotments[0] ?? { total: 0, booked: 0 };
  sendSuccess(res, 200, {
    period: { from: from.toISOString().slice(0, 10), to: today.toISOString().slice(0, 10), days },
    metrics: {
      activeRooms: roomCount,
      bookingsInPeriod: bookings.reduce((sum, item) => sum + item.count, 0),
      paidRevenue: paidRevenue[0]?.total ?? 0,
      pendingPayments,
      occupancyPercent: inventory.total ? Math.round((inventory.booked / inventory.total) * 1000) / 10 : 0,
    },
    statusCounts,
    dailyBookings: daily.map((item) => ({ date: item._id, bookings: item.bookings, paidRevenue: item.paidRevenue })),
  });
}

export async function adminBookings(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const filter: Record<string, unknown> = {};
  if (typeof req.query.status === 'string' && req.query.status !== 'all') filter.status = req.query.status;
  if (typeof req.query.from === 'string' || typeof req.query.to === 'string') {
    const checkIn: Record<string, Date> = {};
    if (typeof req.query.from === 'string') checkIn.$gte = day(String(req.query.from));
    if (typeof req.query.to === 'string') checkIn.$lt = new Date(day(String(req.query.to)).getTime() + DAY);
    filter.checkIn = checkIn;
  }
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const search = req.query.search.trim();
    filter.$or = [
      { reference: { $regex: search, $options: 'i' } },
      { 'guestSnapshot.name': { $regex: search, $options: 'i' } },
      { 'guestSnapshot.email': { $regex: search, $options: 'i' } },
    ];
  }
  const [items, total] = await Promise.all([
    Booking.find(filter).populate('room', 'code name kind category').populate('ratePlan', 'code name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  sendSuccess(res, 200, { items, page, limit, total, pages: Math.ceil(total / limit) });
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function adminExportBookingsCsv(req: Request, res: Response) {
  const dateText = typeof req.query.date === 'string' ? req.query.date : day(new Date()).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) throw ApiError.validation('date must use YYYY-MM-DD');
  const from = day(dateText); const to = new Date(from.getTime() + DAY);
  const filter: Record<string, unknown> = { checkIn: { $gte: from, $lt: to } };
  if (typeof req.query.status === 'string' && req.query.status !== 'all') filter.status = req.query.status;
  const bookings = await Booking.find(filter).populate('room', 'code name').populate('ratePlan', 'code name').sort({ checkIn: 1 }).lean();
  const header = ['reference', 'status', 'paymentStatus', 'guestName', 'guestEmail', 'guestPhone', 'roomCode', 'roomName', 'ratePlan', 'checkIn', 'checkOut', 'nights', 'adults', 'children', 'subtotal', 'discount', 'gst', 'total', 'currency'];
  const lines = bookings.map((booking) => {
    const room = booking.room as unknown as { code?: string; name?: string };
    const plan = booking.ratePlan as unknown as { name?: string };
    return [booking.reference, booking.status, booking.paymentStatus, booking.guestSnapshot?.name, booking.guestSnapshot?.email, booking.guestSnapshot?.phone, room.code, room.name, plan.name, booking.checkIn, booking.checkOut, booking.nights, booking.guests?.adults, booking.guests?.children, booking.subtotal, booking.discount, booking.tax, booking.total, booking.currency].map(csvCell).join(',');
  });
  res.status(200).setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="estatestay-bookings-${dateText}.csv"`);
  res.send([header.join(','), ...lines].join('\r\n'));
}

export async function adminGetRates(req: Request, res: Response) {
  const fromText = String(req.query.from ?? ''); const toText = String(req.query.to ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromText) || !/^\d{4}-\d{2}-\d{2}$/.test(toText)) throw ApiError.validation('from and to are required (YYYY-MM-DD)');
  const from = day(fromText); const to = day(toText);
  if (to <= from || (to.getTime() - from.getTime()) / DAY > 62) throw ApiError.validation('Rate calendar range must be 1–62 days');
  const filter: Record<string, unknown> = { date: { $gte: from, $lt: to } };
  if (typeof req.query.roomId === 'string' && Types.ObjectId.isValid(req.query.roomId)) filter.room = req.query.roomId;
  const items = await DailyRate.find(filter).populate('room', 'code name kind').populate('ratePlan', 'code name').sort({ date: 1 }).limit(5000).lean();
  sendSuccess(res, 200, { from: fromText, to: toText, items });
}

export async function adminGetAllotments(req: Request, res: Response) {
  const fromText = String(req.query.from ?? ''); const toText = String(req.query.to ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromText) || !/^\d{4}-\d{2}-\d{2}$/.test(toText)) throw ApiError.validation('from and to are required (YYYY-MM-DD)');
  const from = day(fromText); const to = day(toText);
  if (to <= from || (to.getTime() - from.getTime()) / DAY > 62) throw ApiError.validation('Allotment calendar range must be 1–62 days');
  const filter: Record<string, unknown> = { date: { $gte: from, $lt: to } };
  if (typeof req.query.roomId === 'string' && Types.ObjectId.isValid(req.query.roomId)) filter.room = req.query.roomId;
  const items = await Allotment.find(filter).populate('room', 'code name kind category').sort({ date: 1 }).limit(5000).lean();
  sendSuccess(res, 200, { from: fromText, to: toText, items });
}

export async function adminSetBlackout(req: Request, res: Response) {
  const { from: fromText, to: toText, roomIds, closed } = req.body as { from: string; to: string; roomIds?: string[]; closed: boolean };
  const from = day(fromText); const to = day(toText);
  const dates = dayRange(from, to);
  if (dates.length < 1 || dates.length > 62) throw ApiError.validation('Blackout range must be 1–62 days (to date exclusive)');
  const rooms = await Room.find({ active: true, ...(roomIds?.length ? { _id: { $in: roomIds } } : {}) }).select('_id').lean();
  if (!rooms.length) throw ApiError.validation('No active rooms selected');
  const changed: { room: Types.ObjectId; date: Date; previous: boolean; inserted: boolean }[] = [];
  try {
    for (const room of rooms) for (const date of dates) {
      const existing = await Allotment.findOne({ room: room._id, date }).select('_id closed booked held').lean();
      if (closed) {
        if (existing?.closed) continue;
        if (existing) {
          const result = await Allotment.updateOne({ _id: existing._id, closed: false }, { $set: { closed: true } });
          if (!result.modifiedCount) throw ApiError.conflict(`Inventory changed for ${room.code} on ${date.toISOString().slice(0, 10)}; refresh and try again`);
          changed.push({ room: room._id, date, previous: false, inserted: false });
        } else {
          try {
            await Allotment.create({ room: room._id, date, total: 1, booked: 0, held: 0, closed: true });
            changed.push({ room: room._id, date, previous: false, inserted: true });
          } catch (error) {
            if ((error as { code?: number }).code === 11000) throw ApiError.conflict(`Inventory was created concurrently for ${room.code} on ${date.toISOString().slice(0, 10)}; refresh and try again`);
            throw error;
          }
        }
      } else {
        if (existing) {
          if (!existing.closed) continue;
          const result = await Allotment.updateOne({ _id: existing._id, closed: true }, { $set: { closed: false } });
          if (!result.modifiedCount) throw ApiError.conflict(`Inventory changed for ${room.code} on ${date.toISOString().slice(0, 10)}; refresh and try again`);
          changed.push({ room: room._id, date, previous: true, inserted: false });
        } else {
          try {
            await Allotment.create({ room: room._id, date, total: 1, booked: 0, held: 0, closed: false });
            changed.push({ room: room._id, date, previous: true, inserted: true });
          } catch (error) {
            if ((error as { code?: number }).code === 11000) throw ApiError.conflict(`Inventory was created concurrently for ${room.code} on ${date.toISOString().slice(0, 10)}; refresh and try again`);
            throw error;
          }
        }
      }
    }
  } catch (error) {
    for (const item of changed.reverse()) {
      if (item.inserted) await Allotment.deleteOne({ room: item.room, date: item.date, booked: 0, held: 0 });
      else await Allotment.updateOne({ room: item.room, date: item.date, closed: !item.previous }, { $set: { closed: item.previous } });
    }
    throw error;
  }
  sendSuccess(res, 200, { closed, from: fromText, to: toText, rooms: rooms.length, dates: dates.length }, closed ? 'Blackout dates applied' : 'Blackout dates removed');
}

export async function adminUpdatePromo(req: Request, res: Response) {
  const promo = await PromoCode.findByIdAndUpdate(req.params.id, { $set: req.body }, { returnDocument: 'after', runValidators: true });
  if (!promo) throw ApiError.notFound('Promo code not found');
  sendSuccess(res, 200, promo, 'Promo code updated');
}

export async function adminCreateRoom(req: Request, res: Response) {
  const room = await Room.create(req.body); sendSuccess(res, 201, room, 'Room created');
}

export async function adminUpdateRoom(req: Request, res: Response) {
  const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!room) throw ApiError.notFound('Room not found'); sendSuccess(res, 200, room, 'Room updated');
}

export async function adminCreatePromo(req: Request, res: Response) {
  const promo = await PromoCode.create({ ...req.body, code: String(req.body.code).toUpperCase() }); sendSuccess(res, 201, promo, 'Promo code created');
}

export async function adminSetRate(req: Request, res: Response) {
  const { roomId, ratePlanId, date, amount, closed } = req.body;
  const rate = await DailyRate.findOneAndUpdate({ room: roomId, ratePlan: ratePlanId, date: day(date) }, { $set: { amount, closed: Boolean(closed) } }, { upsert: true, new: true, runValidators: true });
  sendSuccess(res, 200, rate, 'Daily rate updated');
}

export async function adminSetAllotment(req: Request, res: Response) {
  const { roomId, date, total, closed } = req.body;
  const targetDate = day(date);
  const existing = await Allotment.findOne({ room: roomId, date: targetDate }).lean();
  if (existing && total < existing.booked + existing.held) throw ApiError.conflict('Allotment cannot be lower than already booked or held rooms');
  const allotment = existing
    ? await Allotment.findOneAndUpdate(
      { room: roomId, date: targetDate, $expr: { $lte: [{ $add: ['$booked', '$held'] }, total] } },
      { $set: { total, closed: Boolean(closed) } },
      { returnDocument: 'after', runValidators: true },
    )
    : await Allotment.create({ room: roomId, date: targetDate, total, held: 0, booked: 0, closed: Boolean(closed) });
  if (!allotment) throw ApiError.conflict('Allotment changed while saving; refresh and try again');
  sendSuccess(res, 200, allotment, 'Allotment updated');
}

export async function adminUpdateBooking(req: Request, res: Response) {
  const { status } = req.body as { status: 'pending' | 'confirmed' | 'cancelled' | 'completed' };
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (booking.status === 'cancelled' && status !== 'cancelled') throw ApiError.conflict('Cancelled bookings cannot be reactivated');
  if (booking.status !== 'cancelled' && status === 'cancelled') {
    const cancelled = await Booking.findOneAndUpdate({ _id: booking._id, status: { $ne: 'cancelled' } }, { $set: { status } }, { returnDocument: 'after' });
    if (!cancelled) throw ApiError.conflict('Booking has already changed state');
    await releaseInventory(cancelled);
    await releasePromoUsage(cancelled);
    sendSuccess(res, 200, cancelled, 'Booking status updated');
    return;
  }
  booking.status = status; await booking.save(); sendSuccess(res, 200, booking, 'Booking status updated');
}

export async function adminUpdateEnquiry(req: Request, res: Response) {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  const input = req.body as { status?: string; category?: string; assignedTo?: string | null; assignedDepartment?: string; alertGM?: boolean; replyDraft?: string };
  if (input.status) enquiry.status = input.status as typeof enquiry.status;
  if (input.category) {
    enquiry.category = input.category as typeof enquiry.category;
    enquiry.ai = { ...aiSnapshot(enquiry.ai), manualOverride: true } as typeof enquiry.ai;
    if (input.category !== 'unsorted' && !input.assignedDepartment) enquiry.assignedDepartment = CATEGORY_TEAM[input.category];
    if (input.category === 'unsorted') enquiry.status = 'unsorted';
    else if (enquiry.status === 'unsorted') enquiry.status = 'routed';
    if (input.category === 'complaint') enquiry.alertGM = true;
    const department = input.assignedDepartment ?? CATEGORY_TEAM[input.category];
    enquiry.routing = { department, confidence: enquiry.routing?.confidence ?? 0, reason: `Manually categorized as ${input.category}` };
  }
  if (input.assignedDepartment !== undefined) {
    enquiry.assignedDepartment = input.assignedDepartment;
    enquiry.routing = { department: input.assignedDepartment, confidence: enquiry.routing?.confidence ?? 0, reason: 'Manually reassigned by admin' };
  }
  if (input.alertGM !== undefined) enquiry.alertGM = input.alertGM;
  if (input.assignedTo !== undefined) {
    if (input.assignedTo === null) enquiry.assignedTo = undefined;
    else {
      const staff = await User.findOne({ _id: input.assignedTo, role: 'reservations_staff', isActive: true }).select('_id staffDepartment');
      if (!staff) throw ApiError.validation('Assignment target must be an active staff account');
      enquiry.assignedTo = staff._id;
      if (staff.staffDepartment) enquiry.assignedDepartment = staff.staffDepartment;
    }
  }
  if (input.assignedTo === undefined && (input.category !== undefined || input.assignedDepartment !== undefined)) {
    const department = input.assignedDepartment ?? CATEGORY_TEAM[enquiry.category];
    const owner = department ? await User.findOne({ role: 'reservations_staff', staffDepartment: department, isActive: true }).sort({ createdAt: 1 }).select('_id').lean() : null;
    enquiry.assignedTo = owner?._id;
  }
  if (input.replyDraft !== undefined) {
    enquiry.ai = { ...aiSnapshot(enquiry.ai), replyDraft: input.replyDraft, replyDraftedAt: new Date() } as typeof enquiry.ai;
  }
  if (enquiry.category === 'complaint') enquiry.alertGM = true;
  await enquiry.save();
  await enquiry.populate('assignedTo', 'name email role');
  sendSuccess(res, 200, enquiry, 'Enquiry updated');
}

export async function adminCreatePayment(req: Request, res: Response) {
  const payment = await Payment.create(req.body); sendSuccess(res, 201, payment, 'Payment record created');
}

export async function adminCreateRatePlan(req: Request, res: Response) {
  const plan = await RatePlan.create(req.body); sendSuccess(res, 201, plan, 'Rate plan created');
}

export async function adminUpdatePayment(req: Request, res: Response) {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw ApiError.notFound('Payment not found');
  const { status, providerReference, method } = req.body as { status: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded'; providerReference?: string; method?: string };
  payment.status = status;
  if (providerReference !== undefined) payment.providerReference = providerReference;
  if (method !== undefined) payment.method = method;
  if (status === 'paid') payment.paidAt = new Date();
  await payment.save();
  await Booking.updateOne({ _id: payment.booking, status: { $ne: 'cancelled' } }, { $set: { paymentStatus: status, ...(status === 'paid' ? { status: 'confirmed' } : {}) } });
  sendSuccess(res, 200, payment, 'Payment status updated');
}
