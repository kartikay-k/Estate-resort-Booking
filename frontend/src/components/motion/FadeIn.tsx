import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface FadeInProps {
  children: ReactNode
  /** Seconds before the fade starts (for stagger effects). */
  delay?: number
  duration?: number
  /** Slide distance in px. Set 0 for a pure fade. */
  y?: number
  className?: string
  style?: CSSProperties
}

/**
 * Framer Motion scroll-reveal wrapper.
 * Animates once when ~25% of the element enters the viewport;
 * respects the user's "reduce motion" OS setting.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.6,
  y = 18,
  className,
  style,
}: FadeInProps) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
