import { useId } from 'react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

export interface TextareaProps extends ComponentProps<'textarea'> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({
  label,
  hint,
  error,
  className,
  id,
  required,
  ...rest
}: TextareaProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hasError = Boolean(error)

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 block text-sm font-medium text-sand-800"
        >
          {label}
          {required && <span className="text-gold-600"> *</span>}
        </label>
      )}

      <textarea
        id={inputId}
        required={required}
        aria-invalid={hasError || undefined}
        className={cn(
          'min-h-28 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-sand-900 placeholder:text-sand-400 transition-colors duration-200',
          'focus:outline-none focus:ring-2 disabled:opacity-50',
          hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15'
            : 'border-sand-200 hover:border-sand-300 focus:border-brand-600 focus:ring-brand-600/15',
          className,
        )}
        {...rest}
      />

      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-sand-500">{hint}</p>
      ) : null}
    </div>
  )
}
