import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  provider: { type: String, enum: ['manual', 'razorpay', 'stripe'], default: 'manual' },
  providerReference: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  status: { type: String, enum: ['pending', 'authorized', 'paid', 'failed', 'refunded'], default: 'pending', index: true },
  method: { type: String, trim: true },
  paidAt: Date,
  metadata: { type: Schema.Types.Mixed },
}, { timestamps: true });
export const Payment = model('Payment', paymentSchema);
