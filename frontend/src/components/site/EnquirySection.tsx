import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { estateApi } from '../../services/estateApi'
import { Button, Container, Input, SectionHeading, Select, Textarea } from '../ui'

export function EnquirySection() {
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState('general')
  const [error, setError] = useState<string | null>(null)
  const [routed, setRouted] = useState<{ reference: string; department: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    setBusy(true); setError(null); setRouted(null)
    try {
      const result = await estateApi.submitEnquiry({
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? '') || undefined,
        category,
        subject: String(form.get('subject') ?? ''),
        message: String(form.get('message') ?? ''),
        arrivalDate: String(form.get('arrivalDate') ?? '') || undefined,
        departureDate: String(form.get('departureDate') ?? '') || undefined,
        guestCount: String(form.get('guestCount') ?? '') ? Number(form.get('guestCount')) : undefined,
        nightsRequested: String(form.get('nightsRequested') ?? '') ? Number(form.get('nightsRequested')) : undefined,
        budgetAmount: String(form.get('budgetAmount') ?? '') ? Number(form.get('budgetAmount')) : undefined,
        privacyAccepted: form.get('privacyAccepted') === 'on',
      })
      setRouted({ reference: result.reference, department: result.routing.department })
      formElement.reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not send your enquiry. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section id="contact" className="scroll-mt-24 bg-sand-100 py-24 lg:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading eyebrow="A note to the estate" title="Tell us what you’re imagining." description="A quiet weekend, a family gathering, a wedding beneath the oaks — our team will help shape it. Every note reaches the right people." />
            <div className="mt-9 space-y-5 border-t border-sand-300/70 pt-6">
              <p className="text-xs font-semibold tracking-[0.2em] text-gold-600 uppercase">Enquiries are routed to</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[['Reservations', 'Stays & availability'], ['Events', 'Weddings & gatherings'], ['Corporate Sales', 'Offsites & meetings'], ['Guest Experience', 'Coffee, trails & wellness']].map(([title, sub]) => <div key={title} className="rounded-2xl border border-sand-200 bg-white/70 px-4 py-3"><p className="text-sm font-semibold text-brand-900">{title}</p><p className="mt-1 text-xs text-sand-500">{sub}</p></div>)}
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_-35px_rgba(43,40,32,0.4)] ring-1 ring-sand-200 sm:p-9">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input name="name" label="Your name" autoComplete="name" required />
              <Input name="email" type="email" label="Email address" autoComplete="email" required />
              <Input name="phone" type="tel" label="Phone (optional)" autoComplete="tel" />
              <Select name="category" label="I'm writing about" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="general">Something else</option>
                <option value="booking">A stay or reservation</option>
                <option value="wedding">A wedding</option>
                <option value="corporate">A corporate retreat</option>
                <option value="experience">An estate experience</option>
              </Select>
              {(category === 'wedding' || category === 'corporate') && <>
                <Input name="arrivalDate" label="Preferred arrival (optional)" type="date" />
                <Input name="departureDate" label="Preferred departure (optional)" type="date" />
                <Input name="guestCount" label="Expected guests" type="number" min="1" max="10000" placeholder="e.g. 120" />
                <Input name="nightsRequested" label="Number of nights (optional)" type="number" min="1" max="100" placeholder="e.g. 2" />
                <Input name="budgetAmount" label="Estimated budget (INR, optional)" type="number" min="0" step="1000" placeholder="e.g. 500000" />
              </>}
              <div className="sm:col-span-2"><Input name="subject" label="Subject" placeholder="A few words about your plans" required /></div>
              <div className="sm:col-span-2"><Textarea name="message" label="Your note" placeholder="Tell us a little more…" rows={4} required /></div>
            </div>
            <label className="mt-5 flex items-start gap-2.5 text-xs leading-relaxed text-sand-600"><input name="privacyAccepted" type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-brand-700" /><span>I agree to EstateStay using these details to respond to my enquiry. See the <a href="/privacy" className="font-medium text-brand-800 underline underline-offset-2">privacy notice</a> for how to request access, correction, or deletion.</span></label>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <AnimatePresence>
              {routed && <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" className="mt-4 flex gap-2 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-700" />Your enquiry <strong>{routed.reference}</strong> has been routed to {routed.department}.</motion.p>}
            </AnimatePresence>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="submit" loading={busy} trailing={<ArrowRight className="size-4" />}>Send your enquiry</Button>
              <p className="text-xs text-sand-500">A member of our team will be in touch.</p>
            </div>
          </form>
        </div>
      </Container>
    </section>
  )
}
