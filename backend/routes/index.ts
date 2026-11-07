import { Router } from 'express';
import { z } from 'zod';
import { availability, cancelBooking, createBooking, createEnquiry, getBooking, getRates, getRoom, listBookings, listRooms, login, me, register, adminCreatePromo, adminCreateRoom, adminList, adminSetAllotment, adminSetRate, adminUpdateBooking, adminUpdateEnquiry, adminUpdateRoom, adminCreateRatePlan, adminUpdatePayment, testPayment, adminAnalytics, adminBookings, adminExportBookingsCsv, adminGetAllotments, adminGetRates, adminSetBlackout, adminUpdatePromo, adminEnquiries, adminClassifyEnquiry, adminDraftEnquiryReply, simulateEnquiry, lookupBooking, applyBookingPromo } from '../controllers/estate.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { getHealth } from '../controllers/health.controller.js';
import { availabilitySchema, bookingLookupSchema, bookingPromoSchema, bookingSchema, enquirySchema, simulatedEnquirySchema, loginSchema, promoSchema, registerSchema, roomSchema } from '../utils/schemas.js';

export const apiRouter = Router();
const admin = [authenticate, requireAdmin];

apiRouter.get('/health', getHealth);

// Authentication
apiRouter.post('/auth/register', validate(registerSchema), register);
apiRouter.post('/auth/login', validate(loginSchema), login);
apiRouter.get('/auth/me', authenticate, me);

// Public catalogue and pricing
apiRouter.get('/rooms', listRooms);
apiRouter.get('/rooms/:id', getRoom);
apiRouter.get('/availability', validate(availabilitySchema), availability);
apiRouter.get('/rates', getRates);

// Guest bookings
apiRouter.post('/bookings', authenticate, validate(bookingSchema), createBooking);
apiRouter.post('/bookings/lookup', validate(bookingLookupSchema), lookupBooking);
apiRouter.post('/bookings/:id/promo', authenticate, validate(bookingPromoSchema), applyBookingPromo);
apiRouter.post('/bookings/:id/test-payment', authenticate, validate(z.object({ body: z.object({ outcome: z.enum(['success', 'failure', 'pending']) }), query: z.any(), params: z.any() })), testPayment);
apiRouter.get('/bookings', authenticate, listBookings);
apiRouter.get('/bookings/:id', authenticate, getBooking);
apiRouter.post('/bookings/:id/cancel', authenticate, cancelBooking);

// Guest enquiry intake; classification/routing is represented explicitly on the record.
apiRouter.post('/enquiries', validate(enquirySchema), createEnquiry);

// Admin API
apiRouter.get('/admin/analytics', ...admin, adminAnalytics);
apiRouter.get('/admin/bookings/export.csv', ...admin, adminExportBookingsCsv);
apiRouter.get('/admin/bookings', ...admin, adminBookings);
apiRouter.get('/admin/enquiries', ...admin, adminEnquiries);
apiRouter.post('/admin/enquiries/simulate', ...admin, validate(simulatedEnquirySchema), simulateEnquiry);
apiRouter.post('/admin/enquiries/:id/classify', ...admin, adminClassifyEnquiry);
apiRouter.post('/admin/enquiries/:id/draft-reply', ...admin, adminDraftEnquiryReply);
apiRouter.patch('/admin/enquiries/:id', ...admin, validate(z.object({ body: z.object({ status: z.enum(['unsorted', 'new', 'routed', 'in_progress', 'resolved', 'spam']).optional(), category: z.enum(['booking', 'wedding', 'corporate', 'experience', 'complaint', 'general', 'unsorted']).optional(), assignedTo: z.string().length(24).nullable().optional(), assignedDepartment: z.string().max(100).optional(), alertGM: z.boolean().optional(), replyDraft: z.string().max(5000).optional() }).refine((value) => Object.keys(value).length > 0), query: z.any(), params: z.any() })), adminUpdateEnquiry);
apiRouter.get('/admin/allotments', ...admin, adminGetAllotments);
apiRouter.get('/admin/rates', ...admin, adminGetRates);
apiRouter.get('/admin/:kind', ...admin, adminList);
apiRouter.post('/admin/rooms', ...admin, validate(roomSchema), adminCreateRoom);
apiRouter.patch('/admin/rooms/:id', ...admin, validate(z.object({ body: z.record(z.string(), z.unknown()), query: z.any(), params: z.any() })), adminUpdateRoom);
apiRouter.post('/admin/rates', ...admin, validate(z.object({ body: z.object({ roomId: z.string().length(24), ratePlanId: z.string().length(24), date: z.string().date(), amount: z.number().nonnegative(), closed: z.boolean().optional() }), query: z.any(), params: z.any() })), adminSetRate);
apiRouter.post('/admin/allotments', ...admin, validate(z.object({ body: z.object({ roomId: z.string().length(24), date: z.string().date(), total: z.number().int().nonnegative(), closed: z.boolean().optional() }), query: z.any(), params: z.any() })), adminSetAllotment);
apiRouter.post('/admin/promocodes', ...admin, validate(promoSchema), adminCreatePromo);
apiRouter.patch('/admin/promocodes/:id', ...admin, validate(z.object({ body: z.object({ description: z.string().max(500).optional(), value: z.number().nonnegative().optional(), minSpend: z.number().nonnegative().optional(), maxDiscount: z.number().positive().optional(), startsAt: z.string().datetime().optional(), endsAt: z.string().datetime().optional(), usageLimit: z.number().int().positive().optional(), active: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0), query: z.any(), params: z.any() })), adminUpdatePromo);
apiRouter.post('/admin/rateplans', ...admin, validate(z.object({ body: z.object({ code: z.string().trim().min(2).max(32), name: z.string().trim().min(2).max(120), description: z.string().max(1000).optional(), inclusions: z.array(z.string().max(120)).optional(), cancellationPolicy: z.string().max(1000).optional(), active: z.boolean().optional() }), query: z.any(), params: z.any() })), adminCreateRatePlan);
apiRouter.post('/admin/blackouts', ...admin, validate(z.object({ body: z.object({ from: z.string().date(), to: z.string().date(), roomIds: z.array(z.string().length(24)).optional(), closed: z.boolean() }), query: z.any(), params: z.any() })), adminSetBlackout);
apiRouter.patch('/admin/payments/:id', ...admin, validate(z.object({ body: z.object({ status: z.enum(['pending', 'authorized', 'paid', 'failed', 'refunded']), providerReference: z.string().max(120).optional(), method: z.string().max(60).optional() }), query: z.any(), params: z.any() })), adminUpdatePayment);
apiRouter.patch('/admin/bookings/:id', ...admin, validate(z.object({ body: z.object({ status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']) }), query: z.any(), params: z.any() })), adminUpdateBooking);
