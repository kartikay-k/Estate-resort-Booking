import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

/**
 * Button — EstateStay signature style.
 * Pill shape, evergreen primary, gilded accent, WCAG-friendly focus ring.
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full font-medium tracking-wide whitespace-nowrap transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-700 text-sand-50 shadow-sm shadow-brand-950/20 hover:bg-brand-800 active:bg-brand-950',
        accent:
          'bg-gold-400 text-brand-950 shadow-sm shadow-gold-500/25 hover:bg-gold-300 active:bg-gold-500',
        outline:
          'border border-brand-800/25 bg-transparent text-brand-800 hover:border-brand-800 hover:bg-brand-50 active:bg-brand-100',
        ghost: 'bg-transparent text-brand-800 hover:bg-brand-100/70 active:bg-brand-200/60',
        outlineLight:
          'border border-white/30 bg-transparent text-sand-50 hover:bg-white/10 active:bg-white/15',
        danger:
          'bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800',
      },
      size: {
        sm: 'h-9 px-4 text-xs',
        md: 'h-11 px-6 text-sm',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /** Shows a spinner and blocks clicks while pending. */
  loading?: boolean
  leading?: ReactNode
  trailing?: ReactNode
}

export function Button({
  className,
  variant,
  size,
  loading = false,
  leading,
  trailing,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      ref={rest.ref}
      type={type}
      disabled={disabled ?? loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : leading}
      {children}
      {!loading && trailing}
    </button>
  )
}
