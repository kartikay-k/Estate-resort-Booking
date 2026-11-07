import { useId } from 'react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends ComponentProps<'input'> {
  label?: string
  hint?: string
  error?: string
  leading?: ReactNode
  trailing?: ReactNode
}

/**
 * Input — label, error and hint are rendered consistently;
 * wraps the native input in a focus-aware container.
 */
export function Input({
  label,
  hint,
  error,
  leading,
  trailing,
  className,
  id,
  required,
  ...rest
}: InputProps) {
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

      <div
        className={cn(
          'flex items-center gap-2.5 rounded-xl border bg-white px-3.5 transition-colors duration-200',
          'focus-within:ring-2',
          hasError
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/15'
            : 'border-sand-200 hover:border-sand-300 focus-within:border-brand-600 focus-within:ring-brand-600/15',
        )}
      >
        {leading && (
          <span className="text-sand-400" aria-hidden="true">
            {leading}
          </span>
        )}

        <input
          ref={rest.ref}
          id={inputId}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          className={cn(
            'h-11 w-full bg-transparent text-sm text-sand-900 placeholder:text-sand-400 focus:outline-none disabled:opacity-50',
            className,
          )}
          {...rest}
        />

        {trailing && (
          <span className="text-sand-400" aria-hidden="true">
            {trailing}
          </span>
        )}
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-sand-500">{hint}</p>
      ) : null}
    </div>
  )
}
