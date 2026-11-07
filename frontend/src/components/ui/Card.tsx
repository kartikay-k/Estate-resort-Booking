import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

/**
 * Card — soft ivory surface with a hairline border and the
 * signature "lift" elevation. Compound components keep markup
 * consistent across future feature pages.
 */
export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-sand-200/80 bg-white shadow-sm shadow-sand-950/5',
        className,
      )}
      {...rest}
    />
  )
}

export function CardHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 px-6 pt-6', className)} {...rest} />
}

export function CardTitle({ className, ...rest }: ComponentProps<'h3'>) {
  return (
    <h3
      className={cn(
        'font-display text-xl font-semibold leading-tight tracking-tight text-brand-900',
        className,
      )}
      {...rest}
    />
  )
}

export function CardDescription({ className, ...rest }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-sand-600', className)} {...rest} />
}

export function CardContent({ className, ...rest }: ComponentProps<'div'>) {
  return <div className={cn('px-6 py-5', className)} {...rest} />
}

export function CardFooter({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-b-3xl border-t border-sand-100 bg-sand-50/60 px-6 py-4',
        className,
      )}
      {...rest}
    />
  )
}
