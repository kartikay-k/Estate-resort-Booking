import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Allotment } from '../models/allotment.model.js';
import { DailyRate } from '../models/dailyRate.model.js';
import { PromoCode } from '../models/promoCode.model.js';
import { RatePlan } from '../models/ratePlan.model.js';
import { Room } from '../models/room.model.js';
import { User } from '../models/user.model.js';
import { seedSampleEnquiries } from './sampleEnquiries.js';

const DAY = 86_400_000;
const baseDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

async function seed() {
  if (!(await connectDatabase())) throw new Error('MongoDB connection required for seed');

  console.log('[seed] clearing estate catalogue, rate and inventory collections…');
  await Promise.all([Room.deleteMany({}), RatePlan.deleteMany({}), DailyRate.deleteMany({}), Allotment.deleteMany({}), PromoCode.deleteMany({})]);

  const roomDocs = Array.from({ length: 64 }, (_, i) => {
    const floor = Math.floor(i / 16) + 1;
    const category = i < 32 ? 'Garden Room' : 'Plantation Room';
    const baseRate = i < 32 ? 8500 : 10500;
    return { code: `R-${String(i + 1).padStart(3, '0')}`, name: `${category} ${String(i + 1).padStart(2, '0')}`, kind: 'room' as const, category, description: `${category} with a private veranda, estate coffee service and garden views. Located on level ${floor}.`, capacity: { adults: 2, children: 1 }, bedrooms: 1, areaSqm: i < 32 ? 42 : 54, amenities: ['Private veranda', 'Estate coffee bar', 'Rain shower', 'Wi-Fi'], images: ['/images/villa-planters.webp'], baseRate, active: true };
  });
  const villaKinds = [
    { name: 'Cedar Ridge Villa', category: 'Cedar Ridge Villa', rate: 72000, adults: 4, beds: 2, area: 180, image: '/images/villa-cedar-ridge.webp' },
    { name: 'The Glasshouse', category: 'Glasshouse Villa', rate: 58000, adults: 2, beds: 1, area: 120, image: '/images/villa-glasshouse.webp' },
    { name: 'Planter’s Residence', category: 'Planter’s Residence', rate: 96000, adults: 6, beds: 3, area: 240, image: '/images/villa-planters.webp' },
  ];
  const villas = Array.from({ length: 12 }, (_, i) => {
    const v = villaKinds[i % villaKinds.length];
    return { code: `V-${String(i + 1).padStart(2, '0')}`, name: `${v.name} ${String(Math.floor(i / 3) + 1).padStart(2, '0')}`, kind: 'villa' as const, category: v.category, description: `Private ${v.name.toLowerCase()} at EstateStay, with a dedicated veranda and views across the coffee estate.`, capacity: { adults: v.adults, children: 2 }, bedrooms: v.beds, areaSqm: v.area, amenities: ['Private veranda', 'Estate coffee bar', 'Butler service', 'Wi-Fi'], images: [v.image], baseRate: v.rate, active: true };
  });
  const rooms = await Room.insertMany([...roomDocs, ...villas]);

  const plans = await RatePlan.insertMany([
    { code: 'FLEX', name: 'Flexible Rate', description: 'Breakfast included with flexible cancellation.', inclusions: ['Daily breakfast', 'Estate walk'], cancellationPolicy: 'Free cancellation up to 7 days before arrival.' },
    { code: 'PREPAID', name: 'Estate Advance', description: 'Save 10% when you pay in advance.', inclusions: ['Daily breakfast', 'Estate walk', '10% advance-purchase saving'], cancellationPolicy: 'Non-refundable; date changes subject to availability.' },
  ]);

  const start = baseDay(new Date());
  const allotmentOps: Parameters<typeof Allotment.bulkWrite>[0] = [];
  const rateOps: Parameters<typeof DailyRate.bulkWrite>[0] = [];
  for (const room of rooms) {
    for (let offset = 0; offset < 365; offset++) {
      const date = new Date(start.getTime() + offset * DAY);
      allotmentOps.push({ insertOne: { document: { room: room._id, date, total: 1, held: 0, booked: 0, closed: false } } });
      for (const plan of plans) {
        const seasonal = offset >= 150 && offset <= 220 ? 1.15 : 1;
        const advanceFactor = plan.code === 'PREPAID' ? 0.9 : 1;
        rateOps.push({ insertOne: { document: { room: room._id, ratePlan: plan._id, date, amount: Math.round(room.baseRate * seasonal * advanceFactor), currency: 'INR', closed: false } } });
      }
    }
  }
  console.log(`[seed] writing inventory (${allotmentOps.length}) and daily rates (${rateOps.length})…`);
  for (let i = 0; i < allotmentOps.length; i += 5000) await Allotment.bulkWrite(allotmentOps.slice(i, i + 5000), { ordered: false });
  for (let i = 0; i < rateOps.length; i += 5000) await DailyRate.bulkWrite(rateOps.slice(i, i + 5000), { ordered: false });

  await PromoCode.create({ code: 'ESTATE10', description: '10% off your first estate stay', kind: 'percent', value: 10, maxDiscount: 25000, startsAt: new Date(), endsAt: new Date(Date.now() + 365 * DAY), usageLimit: 500, usedCount: 0, active: true });

  const adminEmail = process.env.SEED_RESERVATIONS_STAFF_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? 'admin@estatestay.local';
  const adminPassword = process.env.SEED_RESERVATIONS_STAFF_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'EstateStay-Admin-2026!';
  await User.updateOne({ email: adminEmail }, { $set: { name: 'EstateStay Reservations Staff', email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 12), role: 'reservations_staff', staffDepartment: 'Reservations', isActive: true } }, { upsert: true });
  const staffRoster = [
    { name: 'Maya Rao', email: 'maya.rao@estatestay.local', department: 'Reservations' },
    { name: 'Arjun Menon', email: 'arjun.menon@estatestay.local', department: 'Events' },
    { name: 'Leela Thomas', email: 'leela.thomas@estatestay.local', department: 'Corporate Sales' },
    { name: 'Devika Nair', email: 'devika.nair@estatestay.local', department: 'Guest Experience' },
    { name: 'Estate General Manager', email: 'gm@estatestay.local', department: 'General Manager' },
  ];
  for (const staff of staffRoster) await User.updateOne({ email: staff.email }, { $set: { name: staff.name, email: staff.email, passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12), role: 'reservations_staff', staffDepartment: staff.department, isActive: true } }, { upsert: true });

  await seedSampleEnquiries();
  console.log(`[seed] complete: ${rooms.length - 12} rooms, 12 villas, ${plans.length} rate plans, 365-day rates/inventory, 140-person operation represented by ${staffRoster.length} departmental demo accounts, 3 sample enquiries.`);
  console.log(`[seed] admin: ${adminEmail} / ${adminPassword} (change immediately outside local development)`);
}

seed().catch((error) => { console.error('[seed] failed:', error); process.exitCode = 1; }).finally(() => disconnectDatabase());
