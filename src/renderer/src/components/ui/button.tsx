import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent-500/50 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border border-accent-500/70 bg-gradient-to-b from-[#f7b733] to-[#f59e0b] text-[#1a1203] shadow-[0_10px_24px_rgba(245,158,11,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] hover:from-[#f9c44b] hover:to-[#f7a91b]',
        secondary:
          'border border-white/18 bg-white/4 text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/28 hover:bg-white/8',
        ghost: 'text-neutral-300 hover:bg-white/5 hover:text-neutral-100',
        outline: 'border border-white/10 bg-transparent text-neutral-300 hover:bg-white/5',
        destructive:
          'border border-status-failed/30 bg-transparent text-status-failed hover:bg-status-failed/10',
        link: 'h-auto p-0 text-neutral-400 underline-offset-4 hover:underline hover:text-neutral-200'
      },
      size: {
        default: 'h-9 px-3 py-1.5',
        sm: 'h-8 rounded-md px-2.5 text-xs',
        lg: 'h-10 px-4 py-2',
        icon: 'h-8 w-8 p-0'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
