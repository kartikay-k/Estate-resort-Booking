import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

interface LogoProps extends ComponentProps<'span'> {
  /** `light` for dark/hero surfaces, `dark` for cream surfaces. */
  tone?: 'dark' | 'light'
}

/**
 * Logo — monogram tile + wordmark.
 * Rendered as a plain span; the parent decides linking.
 */
export function Logo({ className, tone = 'dark', ...rest }: LogoProps) {
  return (
    <span
      className={cn(
        'group inline-flex items-center gap-2.5 select-none',
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          'flex size-9 items-center justify-center rounded-xl font-display text-lg font-semibold transition-colors duration-300',
          tone === 'light'
            ? 'bg-white/10 text-gold-300 ring-1 ring-white/25 backdrop-blur-sm group-hover:bg-white/15'
            : 'bg-brand-800 text-gold-300 group-hover:bg-brand-700',
        )}
      >
        E
      </span>
      <span
        className={cn(
          'font-display text-xl font-semibold tracking-tight transition-colors duration-300',
          tone === 'light' ? 'text-sand-50' : 'text-brand-900',
        )}
      >
        Estate<span className="text-gold-500">Stay</span>
      </span>
    </span>
  )
}
