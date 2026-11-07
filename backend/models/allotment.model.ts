import { Schema, model } from 'mongoose';

const allotmentSchema = new Schema({
  room: { type: Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  date: { type: Date, required: true },
  total: { type: Number, required: true, min: 0 },
  held: { type: Number, default: 0, min: 0 },
  booked: { type: Number, default: 0, min: 0 },
  closed: { type: Boolean, default: false },
}, { timestamps: true });
allotmentSchema.index({ room: 1, date: 1 }, { unique: true });
export const Allotment = model('Allotment', allotmentSchema);
