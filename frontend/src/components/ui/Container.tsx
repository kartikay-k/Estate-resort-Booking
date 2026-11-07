import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

/** Centered, responsive content column used by every page. */
export function Container({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8',
        className,
      )}
      {...rest}
    />
  )
}
