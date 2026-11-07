import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, Phone } from 'lucide-react'
import { FadeIn } from '../motion/FadeIn'
import { Button, Container, SectionHeading } from '../ui'
import { EVENT_PACKAGES, SITE } from '../../data/content'

type EventId = 'weddings' | 'corporate'

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

/** Weddings & corporate events — animated tabbed split section. */
export function Events() {
  const [activeId, setActiveId] = useState<EventId>('weddings')
  const active = EVENT_PACKAGES.find((pkg) => pkg.id === activeId) ?? EVENT_PACKAGES[0]

  return (
    <section id="events" className="scroll-mt-24 bg-sand-100 py-24 lg:py-32">
      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          {/* Image panel */}
          <FadeIn className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] bg-brand-900 shadow-[0_30px_80px_-30px_rgba(13,32,24,0.45)]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={active.id}
                  src={active.image}
                  alt={active.imageAlt}
                  loading="lazy"
                  decoding="async"
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 size-full object-cover"
                />
              </AnimatePresence>
              <div
                className="absolute inset-0 bg-gradient-to-t from-brand-950/60 via-transparent to-transparent"
                aria-hidden="true"
              />

              <div className="absolute inset-x-5 bottom-5">
                <div className="inline-block rounded-2xl bg-brand-950/70 px-5 py-4 text-sand-50 ring-1 ring-white/15 backdrop-blur-md">
                  <p className="font-display text-3xl font-semibold text-gold-300">
                    {active.stat.value}
                  </p>
                  <p className="mt-0.5 max-w-44 text-xs leading-snug text-sand-300">
                    {active.stat.label}
                  </p>
                </div>
              </div>
            </div>

            {/* Overlapping detail card */}
            <div className="absolute -right-3 -bottom-6 hidden w-48 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-sand-200 sm:block lg:-right-6">
              <p className="text-[0.58rem] font-semibold tracking-[0.2em] text-gold-600 uppercase">
                Exclusive use
              </p>
              <p className="mt-1.5 font-display text-lg leading-snug font-semibold text-brand-900">
                The whole estate, for your people.
              </p>
            </div>
          </FadeIn>

          {/* Copy + tabs */}
          <div className="order-1 lg:order-2">
            <FadeIn>
              <SectionHeading
                eyebrow="Celebrations & gatherings"
                title="A setting worthy of the occasion"
                description="Weddings under the silver oaks, leadership retreats above the clouds. One estate, one team — entirely yours."
              />
            </FadeIn>

            <FadeIn delay={0.1}>
              <div
                role="tablist"
                aria-label="Event types"
                className="mt-8 inline-flex rounded-full bg-white p-1.5 ring-1 ring-sand-200"
              >
                {EVENT_PACKAGES.map((pkg) => {
                  const selected = activeId === pkg.id
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveId(pkg.id)}
                      className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors duration-300 ${
                        selected
                          ? 'text-sand-50'
                          : 'text-sand-600 hover:text-brand-800'
                      }`}
                    >
                      {selected && (
                        <motion.span
                          layoutId="event-tab"
                          className="absolute inset-0 rounded-full bg-brand-800"
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10">{pkg.label}</span>
                    </button>
                  )
                })}
              </div>
            </FadeIn>

            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="mt-7"
              >
                <h3 className="font-display text-2xl font-semibold tracking-tight text-brand-900">
                  {active.title}
                </h3>
                <p className="mt-3 max-w-lg leading-relaxed text-sand-600">
                  {active.description}
                </p>

                <ul className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {active.features.map((feature) => (
                    <li key={feature.title} className="flex gap-3">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                        <Check className="size-3" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-brand-900">
                          {feature.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-sand-500">
                          {feature.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>

            <FadeIn delay={0.15} className="mt-9 flex flex-wrap gap-3">
              <Button
                trailing={<ArrowRight className="size-4" />}
                onClick={() => scrollTo('contact')}
              >
                Plan your event
              </Button>
              <Button
                variant="ghost"
                leading={<Phone className="size-4" />}
                onClick={() => {
                  window.location.href = `tel:${SITE.phone.replace(/\s/g, '')}`
                }}
              >
                Speak to our team
              </Button>
            </FadeIn>
          </div>
        </div>
      </Container>
    </section>
  )
}
