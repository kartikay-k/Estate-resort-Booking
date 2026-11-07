import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { Allotment } from '../models/allotment.model.js';
import { DailyRate } from '../models/dailyRate.model.js';
import { RatePlan } from '../models/ratePlan.model.js';
import { Room } from '../models/room.model.js';

const DAY = 86_400_000;

try {
  if (!(await connectDatabase())) throw new Error('MongoDB connection required to align sample room tariffs');
  const anchor = await Allotment.findOne().sort({ date: 1 }).select('date').lean();
  if (!anchor) throw new Error('No seeded allotment dates found; no demo tariff data changed');
  const rooms = await Room.find({ code: /^R-\d{3}$/ }).select('_id code baseRate').lean();
  const plans = await RatePlan.find({ code: { $in: ['FLEX', 'PREPAID'] } }).select('_id code').lean();
  const planCodes = new Map(plans.map((plan) => [String(plan._id), plan.code]));
  let roomsChanged = 0; let ratesChanged = 0;
  for (const room of rooms) {
    const newBase = room.baseRate === 18_500 ? 8_500 : room.baseRate === 24_500 ? 10_500 : null;
    if (newBase === null) continue; // Preserve rooms with custom/admin-edited base tariffs.
    const rates = await DailyRate.find({ room: room._id }).select('_id date ratePlan amount').lean();
    for (const rate of rates) {
      const code = planCodes.get(String(rate.ratePlan));
      if (!code) continue;
      const offset = Math.round((new Date(rate.date).getTime() - new Date(anchor.date).getTime()) / DAY);
      const seasonal = offset >= 150 && offset <= 220 ? 1.15 : 1;
      const advance = code === 'PREPAID' ? 0.9 : 1;
      const oldSeedRate = Math.round(room.baseRate * seasonal * advance);
      if (rate.amount !== oldSeedRate) continue; // Preserve individually managed daily rates.
      const amount = Math.round(newBase * seasonal * advance);
      await DailyRate.updateOne({ _id: rate._id, amount: oldSeedRate }, { $set: { amount } });
      ratesChanged++;
    }
    const updated = await Room.updateOne({ _id: room._id, baseRate: room.baseRate }, { $set: { baseRate: newBase } });
    if (updated.modifiedCount) roomsChanged++;
  }
  console.log(`[migration] aligned ${roomsChanged} untouched seeded room base rates to an INR 9,500 average; updated ${ratesChanged} matching default daily rates. Custom room and daily rates were preserved.`);
} catch (error) {
  console.error('[migration] demo room tariff alignment failed:', error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
