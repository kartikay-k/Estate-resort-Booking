import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  /** `light` for dark sections. */
  tone?: 'default' | 'light'
  actions?: ReactNode
  className?: string
}

/** Consistent section intros: gold eyebrow, serif title, soft description. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  tone = 'default',
  actions,
  className,
}: SectionHeadingProps) {
  const light = tone === 'light'

  return (
    <div
      className={cn(
        'flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow && (
          <p
            className={cn(
              'mb-3 flex items-center gap-3 text-[0.7rem] font-semibold tracking-[0.28em] uppercase',
              align === 'center' && 'justify-center',
              light ? 'text-gold-300' : 'text-gold-600',
            )}
          >
            <span
              className={cn('h-px w-8', light ? 'bg-gold-300/60' : 'bg-gold-500/50')}
              aria-hidden="true"
            />
            {eyebrow}
          </p>
        )}
        <h2
          className={cn(
            'font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]',
            light ? 'text-sand-50' : 'text-brand-900',
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              'mt-4 text-base leading-relaxed text-pretty',
              light ? 'text-sand-300' : 'text-sand-600',
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  )
}
