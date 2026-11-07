import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { User } from '../models/user.model.js';

async function migrate() {
  if (!(await connectDatabase())) throw new Error('MongoDB connection required');
  // Collapse legacy admin/staff labels into the single Reservations Staff role.
  const result = await User.collection.updateMany({ role: { $in: ['admin', 'staff'] } }, { $set: { role: 'reservations_staff' } });
  console.log(`[migration] normalized ${result.modifiedCount} users to reservations_staff`);
}

migrate().catch((error) => { console.error('[migration] failed:', error); process.exitCode = 1; }).finally(() => disconnectDatabase());
