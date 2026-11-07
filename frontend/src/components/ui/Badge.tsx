import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium tracking-wide',
  {
    variants: {
      variant: {
        brand: 'bg-brand-100 text-brand-800 ring-1 ring-brand-200/80',
        gold: 'bg-gold-100 text-gold-800 ring-1 ring-gold-200',
        neutral: 'bg-sand-100 text-sand-700 ring-1 ring-sand-200',
        success: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
        danger: 'bg-red-100 text-red-700 ring-1 ring-red-200',
        outline: 'bg-transparent text-brand-800 ring-1 ring-brand-800/25',
        light: 'bg-white/10 text-sand-50 ring-1 ring-white/25 backdrop-blur-sm',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export type BadgeProps = ComponentProps<'span'> &
  VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...rest }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...rest} />
}
