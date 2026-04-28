import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root className={cn('w-full', className)} {...props} />
}

const tabsListVariants = cva('inline-flex items-center text-neutral-500', {
  variants: {
    variant: {
      default: 'h-9 justify-center rounded-lg bg-white/5 p-1',
      compact: 'h-auto justify-center rounded-md bg-white/5 p-0.5',
      bar: 'h-9 w-full justify-start rounded-none bg-transparent p-0'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
})

const tabsTriggerVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-base-950 transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-500/50',
  {
    variants: {
      variant: {
        default:
          'rounded-md px-3 py-1 data-[state=active]:bg-white/10 data-[state=active]:text-neutral-100 data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-neutral-300',
        compact:
          'rounded px-3 py-1.5 data-[state=active]:bg-white/10 data-[state=active]:text-neutral-100 data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:text-neutral-300',
        bar:
          'h-9 rounded-none border-r border-white/5 px-3 py-1.5 data-[state=active]:bg-base-800 data-[state=active]:text-neutral-100 data-[state=inactive]:text-neutral-500 data-[state=inactive]:hover:bg-white/5 data-[state=inactive]:hover:text-neutral-300'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

interface TabsListProps
  extends React.ComponentProps<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {}

function TabsList({ className, variant, ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

interface TabsTriggerProps
  extends React.ComponentProps<typeof TabsPrimitive.Trigger>,
    VariantProps<typeof tabsTriggerVariants> {}

function TabsTrigger({ className, variant, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      className={cn(tabsTriggerVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-2 outline-none', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
