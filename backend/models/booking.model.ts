import { Schema, model } from 'mongoose';

const bookingSchema = new Schema({
  reference: { type: String, required: true, unique: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  room: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
  ratePlan: { type: Schema.Types.ObjectId, ref: 'RatePlan', required: true },
  checkIn: { type: Date, required: true, index: true },
  checkOut: { type: Date, required: true, index: true },
  nights: { type: Number, required: true, min: 1 },
  guests: { adults: { type: Number, required: true, min: 1 }, children: { type: Number, default: 0, min: 0 } },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending', index: true },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  taxBreakdown: [{ date: { type: Date, required: true }, tariff: { type: Number, required: true }, rate: { type: Number, required: true }, amount: { type: Number, required: true } }],
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  promoCode: { type: String },
  specialRequests: { type: String, maxlength: 1000 },
  guestSnapshot: { name: String, email: String, phone: String },
}, { timestamps: true });
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1, status: 1 });
export const Booking = model('Booking', bookingSchema);
