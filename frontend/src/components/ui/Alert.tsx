import type { ComponentProps, ReactNode } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/utils'

const alertStyles = {
  info: { icon: Info, tone: 'border-brand-200/70 bg-brand-50 text-brand-900' },
  success: {
    icon: CheckCircle2,
    tone: 'border-emerald-200/80 bg-emerald-50 text-emerald-900',
  },
  warning: {
    icon: AlertTriangle,
    tone: 'border-gold-300 bg-gold-50 text-gold-900',
  },
  danger: { icon: XCircle, tone: 'border-red-200 bg-red-50 text-red-900' },
} satisfies Record<string, { icon: LucideIcon; tone: string }>

export type AlertVariant = keyof typeof alertStyles

interface AlertProps extends Omit<ComponentProps<'div'>, 'title'> {
  variant?: AlertVariant
  title: string
  children?: ReactNode
}

export function Alert({
  variant = 'info',
  title,
  children,
  className,
  ...rest
}: AlertProps) {
  const { icon: Icon, tone } = alertStyles[variant]
  return (
    <div
      role="alert"
      className={cn('flex items-start gap-3 rounded-2xl border p-4 text-sm', tone, className)}
      {...rest}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 leading-relaxed opacity-80">{children}</div>}
      </div>
    </div>
  )
}
