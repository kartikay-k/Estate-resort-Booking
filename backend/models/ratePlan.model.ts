import { Schema, model } from 'mongoose';

const ratePlanSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  inclusions: [{ type: String, trim: true }],
  cancellationPolicy: { type: String, default: 'Free cancellation up to 7 days before arrival.' },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export const RatePlan = model('RatePlan', ratePlanSchema);
