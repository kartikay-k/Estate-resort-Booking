import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowRight, MapPin } from 'lucide-react'
import { BookingWidget } from './BookingWidget'
import { Button, Container } from '../ui'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  },
}

const HIGHLIGHTS = ['64 rooms + 12 villas', 'Wedding & offsite lawns', 'Chikkamagaluru']

/**
 * Cinematic coffee-estate hero: full-bleed golden-hour photograph with a
 * slow 16-second settle, staggered editorial copy and the booking widget
 * seated at the base of the composition.
 */
export function Hero() {
  const reduceMotion = useReducedMotion()

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-brand-950">
      {/* Estate photograph — slow cinematic settle */}
      <motion.img
        src="/images/hero-estate.webp"
        alt="A timber veranda at EstateStay overlooking misty coffee-estate hills at golden hour"
        className="absolute inset-0 size-full object-cover object-center"
        initial={reduceMotion ? false : { scale: 1.12 }}
        animate={reduceMotion ? undefined : { scale: 1 }}
        transition={{ duration: 16, ease: 'easeOut' }}
        fetchPriority="high"
        decoding="async"
      />

      {/* Contrast gradients for legibility */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-brand-950/80 via-brand-950/30 to-brand-950/95"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-brand-950/70 via-brand-950/10 to-transparent"
        aria-hidden="true"
      />

      <Container className="relative z-10 flex flex-1 flex-col justify-center pt-28 pb-8 sm:pt-32">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-3xl"
        >
          <motion.p
            variants={item}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.66rem] font-semibold tracking-[0.28em] text-gold-300 uppercase"
          >
            <MapPin className="size-4" aria-hidden="true" />
            A coffee-estate resort · Chikkamagaluru, Karnataka
          </motion.p>

          <motion.h1
            variants={item}
            className="mt-5 font-display text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-balance text-sand-50 sm:text-5xl lg:text-[4.2rem]"
          >
            Wake to the hills.
            <span className="block text-gold-300 italic">
              Stay for the stillness.
            </span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-xl text-sm leading-relaxed text-pretty text-sand-200/90 sm:text-base lg:text-lg"
          >
            Seventy-six keys, coffee-estate calm and open lawns for weddings and
            offsites in the hills of Chikkamagaluru.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4"
          >
            <Button
              variant="accent"
              size="lg"
              trailing={<ArrowRight className="size-4" />}
              onClick={() => scrollTo('booking')}
            >
              Reserve your stay
            </Button>
            <Button
              variant="outlineLight"
              size="lg"
              onClick={() => scrollTo('experiences')}
            >
              Explore the estate
            </Button>
          </motion.div>

          <motion.ul
            variants={item}
            className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.65rem] tracking-[0.14em] text-sand-300 uppercase sm:text-xs"
          >
            {HIGHLIGHTS.map((highlight, index) => (
              <li key={highlight} className="flex items-center gap-5">
                {index > 0 && (
                  <span
                    className="size-1 rounded-full bg-gold-400/70"
                    aria-hidden="true"
                  />
                )}
                {highlight}
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </Container>

      {/* Booking widget — seated at the base of the hero */}
      <div id="booking" className="relative z-10 scroll-mt-24">
        <Container className="pb-8 sm:pb-10">
          <BookingWidget />
        </Container>
      </div>
    </section>
  )
}
