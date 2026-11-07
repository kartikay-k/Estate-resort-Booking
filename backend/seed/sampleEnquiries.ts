import { Enquiry } from '../models/enquiry.model.js';
import { User } from '../models/user.model.js';
import { fallbackTriage } from '../services/enquiryAi.service.js';

const sampleEnquiries = [
  { reference: 'ENQ-4410', source: 'whatsapp', name: 'Asha Kapoor', email: 'asha.kapoor@example.test', phone: '+91 98765 44100', subject: 'Wedding venue enquiry · February 2027', message: "Venue for my sister's wedding in Feb 2027, about 250 guests, 2 nights." },
  { reference: 'ENQ-4411', source: 'email', name: 'Rohan Shah', email: 'rohan.shah@example.test', phone: '+91 98765 44111', subject: 'Villa availability 14–16 November', message: 'Is a villa free 14-16 Nov for 2 adults and a child?' },
  { reference: 'ENQ-4412', source: 'website', name: 'Meera Iyer', email: 'meera.iyer@example.test', phone: undefined, subject: 'January offsite for our team', message: 'Team of 45 wants a January offsite with a conference hall.' },
] as const;

export async function seedSampleEnquiries() {
  const departments: Record<string, string> = { wedding: 'Events', corporate: 'Corporate Sales', complaint: 'General Manager', booking: 'Reservations', experience: 'Guest Experience', general: 'Guest Services' };
  for (const sample of sampleEnquiries) {
    const classified = fallbackTriage(sample);
    const category = classified.confidence < 0.6 ? 'unsorted' : classified.category;
    const assignedDepartment = departments[category];
    const owner = assignedDepartment ? await User.findOne({ role: 'reservations_staff', staffDepartment: assignedDepartment, isActive: true }).select('_id').lean() : null;
    await Enquiry.updateOne({ reference: sample.reference }, { $set: {
      reference: sample.reference, source: sample.source, name: sample.name, email: sample.email, phone: sample.phone,
      subject: sample.subject, message: sample.message, category, status: category === 'unsorted' ? 'unsorted' : 'routed',
      priority: classified.priority, alertGM: category === 'complaint' || classified.priority === 'urgent',
      arrivalDate: classified.arrivalDate ? new Date(`${classified.arrivalDate}T00:00:00.000Z`) : null,
      departureDate: classified.departureDate ? new Date(`${classified.departureDate}T00:00:00.000Z`) : null,
      requestedPeriod: classified.stayPeriod, guestCount: classified.guestCount,
      nightsRequested: classified.nightsRequested, budgetAmount: classified.budgetAmount,
      budgetCurrency: classified.budgetCurrency, assignedDepartment, assignedTo: owner?._id,
      routing: { department: assignedDepartment, confidence: classified.confidence, reason: classified.reason },
      ai: { provider: 'seed-fixture', model: 'expected-classification-v2', summary: classified.summary, reason: classified.reason, confidence: classified.confidence, manualOverride: false, classifiedAt: new Date(), replyDraft: classified.replyDraft },
    } }, { upsert: true, runValidators: true });
  }
}
