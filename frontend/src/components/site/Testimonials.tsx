import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react'
import { FadeIn } from '../motion/FadeIn'
import { Button, Container, SectionHeading } from '../ui'
import { RATING_SUMMARY, TESTIMONIALS } from '../../data/content'
import { cn } from '../../lib/utils'

/** Guest stories — auto-advancing quote carousel with manual controls. */
export function Testimonials() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduceMotion = useReducedMotion()
  const active = TESTIMONIALS[index]

  useEffect(() => {
    if (paused || reduceMotion) return
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % TESTIMONIALS.length),
      8000,
    )
    return () => window.clearInterval(timer)
  }, [paused, reduceMotion])

  const step = (direction: 1 | -1) =>
    setIndex(
      (current) =>
        (current + direction + TESTIMONIALS.length) % TESTIMONIALS.length,
    )

  return (
    <section id="testimonials" className="scroll-mt-24 bg-sand-50 py-24 lg:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.3fr] lg:items-center lg:gap-16">
          {/* Intro */}
          <div>
            <FadeIn>
              <SectionHeading
                eyebrow="Guest stories"
                title="Loved by those who have stayed"
                description="A few words from the guestbook — weddings, anniversaries and quiet weeks that became traditions."
              />
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      className="size-4 fill-gold-500 text-gold-500"
                    />
                  ))}
                </div>
                <p className="text-sm text-sand-600">
                  <span className="font-semibold text-brand-900">
                    {RATING_SUMMARY.score}
                  </span>{' '}
                  {RATING_SUMMARY.label}
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1} className="mt-8 hidden gap-2 lg:flex">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous story"
                onClick={() => step(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next story"
                onClick={() => step(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </FadeIn>
          </div>

          {/* Quote panel */}
          <FadeIn delay={0.08}>
            <div
              className="relative rounded-[32px] bg-white p-7 shadow-[0_20px_60px_-30px_rgba(43,40,32,0.35)] ring-1 ring-sand-200/80 sm:p-10 lg:p-12"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocusCapture={() => setPaused(true)}
              onBlurCapture={() => setPaused(false)}
            >
              <Quote
                className="size-8 text-gold-300"
                aria-hidden="true"
                strokeWidth={1.5}
              />

              <div className="min-h-[15rem] sm:min-h-[13rem]" aria-live="polite">
                <AnimatePresence mode="wait">
                  <motion.figure
                    key={active.id}
                    initial={{ opacity: 0, x: reduceMotion ? 0 : 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: reduceMotion ? 0 : -24 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  >
                    <blockquote className="mt-5 font-display text-xl leading-snug tracking-tight text-balance text-brand-900 sm:text-2xl lg:text-[1.7rem]">
                      “{active.quote}”
                    </blockquote>

                    <figcaption className="mt-7 flex flex-wrap items-center gap-4 border-t border-sand-100 pt-6">
                      <img
                        src={active.avatar}
                        alt={active.name}
                        loading="lazy"
                        decoding="async"
                        className="size-12 rounded-full object-cover ring-2 ring-sand-200"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-900">{active.name}</p>
                        <p className="mt-0.5 text-xs text-sand-500">
                          {active.location} · {active.stay}
                        </p>
                      </div>
                      <div className="ml-auto flex gap-0.5" aria-label={`${active.rating} out of 5 stars`}>
                        {Array.from({ length: active.rating }).map((_, starIndex) => (
                          <Star
                            key={starIndex}
                            className="size-3.5 fill-gold-500 text-gold-500"
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    </figcaption>
                  </motion.figure>
                </AnimatePresence>
              </div>

              {/* Progress + mobile controls */}
              <div className="mt-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {TESTIMONIALS.map((testimonial, dotIndex) => (
                    <button
                      key={testimonial.id}
                      type="button"
                      onClick={() => setIndex(dotIndex)}
                      aria-label={`Story from ${testimonial.name}`}
                      aria-current={dotIndex === index}
                      className={cn(
                        'h-1.5 rounded-full transition-all duration-300',
                        dotIndex === index
                          ? 'w-8 bg-gold-500'
                          : 'w-3 bg-sand-300 hover:bg-sand-400',
                      )}
                    />
                  ))}
                </div>

                <div className="flex gap-2 lg:hidden">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Previous story"
                    onClick={() => step(-1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Next story"
                    onClick={() => step(1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  )
}
