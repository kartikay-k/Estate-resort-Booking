import { cn } from '../../lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700',
        className,
      )}
    />
  )
}
