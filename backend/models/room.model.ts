import { Schema, model, type InferSchemaType } from 'mongoose';

const roomSchema = new Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  kind: { type: String, enum: ['room', 'villa'], required: true, index: true },
  category: { type: String, required: true, trim: true, index: true },
  description: { type: String, required: true },
  capacity: { adults: { type: Number, required: true, min: 1 }, children: { type: Number, default: 0, min: 0 } },
  bedrooms: { type: Number, required: true, min: 1 },
  areaSqm: { type: Number, required: true, min: 1 },
  amenities: [{ type: String, trim: true }],
  images: [{ type: String, trim: true }],
  baseRate: { type: Number, required: true, min: 0 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });
roomSchema.index({ kind: 1, category: 1, active: 1 });
export type RoomDocument = InferSchemaType<typeof roomSchema>;
export const Room = model('Room', roomSchema);
