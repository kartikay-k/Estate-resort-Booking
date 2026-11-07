import { connectDatabase, disconnectDatabase } from '../config/db.js';
import { seedSampleEnquiries } from '../seed/sampleEnquiries.js';

try {
  if (!(await connectDatabase())) throw new Error('MongoDB connection required to seed sample enquiries');
  await seedSampleEnquiries();
  console.log('[seed] refreshed ENQ-4410, ENQ-4411 and ENQ-4412 demo fixtures without changing other collections.');
} catch (error) {
  console.error('[seed] sample enquiry refresh failed:', error);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
