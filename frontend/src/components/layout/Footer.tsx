import { useState } from 'react'
import type { ComponentProps, FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react'
import { Button, Container, Logo } from '../ui'
import { SITE } from '../../data/content'

/* Brand marks — inline SVGs (lucide no longer ships brand icons). */
function InstagramIcon(props: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function FacebookIcon(props: ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M15.5 3H13a4.5 4.5 0 0 0-4.5 4.5V10H5.5v3.5H8.5V21h3.8v-7.5h3l.6-3.5h-3.6V7.9c0-.8.6-1.4 1.4-1.4h1.8V3Z" />
    </svg>
  )
}

function LinkedinIcon(props: ComponentProps<'svg'>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 10.5V17M8 7.6v.01M12 17v-3.6a2.4 2.4 0 0 1 4.8 0V17" />
    </svg>
  )
}

const COLUMNS = [
  {
    heading: 'Stay',
    links: ['Villas & suites', 'The Glasshouse', 'Cedar Ridge', 'Offers & packages'],
  },
  {
    heading: 'The Estate',
    links: ['Our story', 'Coffee & harvest', 'Experiences', 'Sustainability'],
  },
  {
    heading: 'Plan',
    links: ['Weddings', 'Corporate retreats', 'Getting here', 'FAQs'],
  },
] as const

const SOCIALS = [
  { label: 'Instagram', icon: InstagramIcon },
  { label: 'Facebook', icon: FacebookIcon },
  { label: 'LinkedIn', icon: LinkedinIcon },
] as const

/** Premium footer — newsletter, contact, sitemap and a giant estate wordmark. */
export function Footer() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const year = new Date().getFullYear()

  function handleSubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
    setEmail('')
  }

  return (
    <footer
      className="scroll-mt-24 overflow-hidden bg-brand-950 text-sand-300"
    >
      <Container className="pt-20 pb-12">
        {/* Newsletter */}
        <div className="grid gap-10 border-b border-white/10 pb-14 lg:grid-cols-2 lg:items-end lg:gap-16">
          <div>
            <p className="flex items-center gap-3 text-[0.62rem] font-semibold tracking-[0.28em] text-gold-300 uppercase">
              <span className="h-px w-8 bg-gold-300/60" aria-hidden="true" />
              Letters from the estate
            </p>
            <h2 className="mt-4 max-w-md font-display text-3xl font-semibold tracking-tight text-balance text-sand-50 sm:text-4xl">
              Harvest notes, quiet offers, the occasional recipe.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-sand-400">
              One letter a season. No noise, no urgency — just the estate, in
              words.
            </p>
          </div>

          <div>
            <form
              onSubmit={handleSubscribe}
              className="flex flex-col gap-3 sm:flex-row sm:items-center sm:rounded-full sm:bg-white/5 sm:p-1.5 sm:ring-1 sm:ring-white/15"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setSubscribed(false)
                }}
                placeholder="Your email address"
                className="h-12 w-full rounded-full bg-white/5 px-5 text-sm text-sand-50 ring-1 ring-white/15 transition placeholder:text-sand-500 focus:ring-2 focus:ring-gold-400/60 focus:outline-none sm:bg-transparent sm:ring-0"
              />
              <Button
                type="submit"
                variant="accent"
                className="h-12 shrink-0 px-6"
                trailing={<ArrowRight className="size-4" />}
              >
                Subscribe
              </Button>
            </form>

            <AnimatePresence>
              {subscribed && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 flex items-center gap-2 px-2 text-xs text-gold-300"
                >
                  <Check className="size-3.5" aria-hidden="true" />
                  Welcome to the estate. Your first letter arrives with the next
                  harvest.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sitemap + contact */}
        <div className="grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo tone="light" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-sand-400">
              {SITE.tagline}. Sixty-four rooms and twelve villas across one coffee estate, with a
              kitchen that follows the garden.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden="true" />
                <span className="text-sand-400">{SITE.address}</span>
              </li>
              <li>
                <a
                  href={`tel:${SITE.phone.replace(/\s/g, '')}`}
                  className="flex gap-3 text-sand-400 transition-colors hover:text-sand-50"
                >
                  <Phone className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden="true" />
                  {SITE.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SITE.email}`}
                  className="flex gap-3 text-sand-400 transition-colors hover:text-sand-50"
                >
                  <Mail className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden="true" />
                  {SITE.email}
                </a>
              </li>
            </ul>

            <p className="mt-5 text-[0.68rem] tracking-[0.14em] text-sand-500 uppercase">
              Check-in {SITE.checkIn} · Check-out {SITE.checkOut}
            </p>

            <div className="mt-6 flex gap-2">
              {SOCIALS.map(({ label, icon: Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={`EstateStay on ${label}`}
                  title="Social profiles arrive in Phase 2"
                  className="flex size-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/15 transition-colors duration-300 hover:bg-gold-400 hover:text-brand-950 hover:ring-gold-400"
                >
                  <Icon className="size-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="text-[0.62rem] font-semibold tracking-[0.22em] text-gold-300 uppercase">
                {column.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      title="Coming in Phase 2"
                      className="group inline-flex items-center gap-1.5 text-sm text-sand-400 transition-colors duration-200 hover:text-sand-50"
                    >
                      {link}
                      <ArrowUpRight
                        className="size-3 -translate-x-1 text-gold-400 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Legal bar */}
        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-xs text-sand-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} EstateStay. All rights reserved.</p>
          <p className="flex flex-wrap gap-5">
            <a href="/privacy" className="transition-colors hover:text-sand-300">Privacy</a>
            <a href="#" className="transition-colors hover:text-sand-300">Terms</a>
            <a href="#" className="transition-colors hover:text-sand-300">Cookies</a>
          </p>
        </div>
      </Container>

      {/* Signature wordmark */}
      <div
        className="pointer-events-none -mb-3 select-none overflow-hidden sm:-mb-6"
        aria-hidden="true"
      >
        <p className="translate-y-[16%] text-center font-display text-[19vw] leading-none font-semibold tracking-tight whitespace-nowrap text-white/[0.05]">
          EstateStay
        </p>
      </div>
    </footer>
  )
}
