import { Schema, model } from 'mongoose';

interface UserFields { name: string; email: string; passwordHash: string; phone?: string; role: 'guest' | 'reservations_staff'; staffDepartment?: string; isActive: boolean; privacyConsentAt?: Date }
const userSchema = new Schema<UserFields>({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  phone: { type: String, trim: true, maxlength: 30 },
  role: { type: String, enum: ['guest', 'reservations_staff'], default: 'guest', index: true },
  staffDepartment: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  privacyConsentAt: Date,
}, { timestamps: true, toJSON: { transform: (_doc, ret) => { delete (ret as Record<string, unknown>).passwordHash; return ret; } } });

export const User = model('User', userSchema);
