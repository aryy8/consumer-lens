import { ScanSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandProps {
  className?: string
  markClassName?: string
  wordClassName?: string
  subtitle?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Brand({ className, markClassName, wordClassName, subtitle, size = 'md' }: BrandProps) {
  const dims = size === 'lg' ? 'size-10' : size === 'sm' ? 'size-7' : 'size-8'
  const icon = size === 'lg' ? 'size-6' : size === 'sm' ? 'size-4' : 'size-5'
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg'

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md bg-transparent overflow-hidden',
          dims,
          markClassName,
        )}
      >
        <img src="/favicon.webp" alt="Logo" className="size-full object-cover" />
      </div>
      <div className="flex flex-col leading-none">
        <span className={cn('font-semibold tracking-tight', text, wordClassName)}>
          Consumer Lens
        </span>
        {subtitle && (
          <span className="mt-1 text-[11px] font-medium uppercase tracking-widest text-slate/70">
            Legal Metrology
          </span>
        )}
      </div>
    </div>
  )
}
