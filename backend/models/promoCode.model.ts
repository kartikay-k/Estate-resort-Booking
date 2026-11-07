import { Schema, model } from 'mongoose';

const promoCodeSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  kind: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  minSpend: { type: Number, default: 0, min: 0 },
  maxDiscount: { type: Number, min: 0 },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  usageLimit: { type: Number, min: 1 },
  usedCount: { type: Number, default: 0, min: 0 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });
export const PromoCode = model('PromoCode', promoCodeSchema);
