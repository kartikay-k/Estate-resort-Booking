import { Schema, model } from 'mongoose';

const dailyRateSchema = new Schema({
  room: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  ratePlan: { type: Schema.Types.ObjectId, ref: 'RatePlan', required: true, index: true },
  date: { type: Date, required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR', uppercase: true, minlength: 3, maxlength: 3 },
  closed: { type: Boolean, default: false },
}, { timestamps: true });
dailyRateSchema.index({ room: 1, ratePlan: 1, date: 1 }, { unique: true });
export const DailyRate = model('DailyRate', dailyRateSchema);
