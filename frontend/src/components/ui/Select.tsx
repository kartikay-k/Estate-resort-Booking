import { useId } from 'react'
import type { ComponentProps } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface SelectProps extends ComponentProps<'select'> {
  label?: string
  hint?: string
  error?: string
}

export function Select({
  label,
  hint,
  error,
  className,
  id,
  required,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const selectId = id ?? autoId
  const hasError = Boolean(error)

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-sand-800"
        >
          {label}
          {required && <span className="text-gold-600"> *</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          required={required}
          aria-invalid={hasError || undefined}
          className={cn(
            'h-11 w-full appearance-none rounded-xl border bg-white pl-3.5 pr-10 text-sm text-sand-900 transition-colors duration-200',
            'focus:outline-none focus:ring-2 disabled:opacity-50',
            hasError
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
              : 'border-sand-200 hover:border-sand-300 focus:border-brand-600 focus:ring-brand-600/15',
            className,
          )}
          {...rest}
        />
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-sand-500"
        />
      </div>

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-sand-500">{hint}</p>
      ) : null}
    </div>
  )
}
