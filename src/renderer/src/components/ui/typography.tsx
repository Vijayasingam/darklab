import * as React from 'react'
import { cn } from '../../lib/utils'

type Props<T extends keyof React.JSX.IntrinsicElements> = React.ComponentPropsWithoutRef<T>

export function TypographyH1({ className, ...props }: Props<'h1'>) {
  return (
    <h1
      className={cn('scroll-m-20 text-4xl font-extrabold tracking-tight text-balance', className)}
      {...props}
    />
  )
}

export function TypographyH2({ className, ...props }: Props<'h2'>) {
  return (
    <h2
      className={cn('scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0', className)}
      {...props}
    />
  )
}

export function TypographyH3({ className, ...props }: Props<'h3'>) {
  return <h3 className={cn('scroll-m-20 text-2xl font-semibold tracking-tight', className)} {...props} />
}

export function TypographyH4({ className, ...props }: Props<'h4'>) {
  return <h4 className={cn('scroll-m-20 text-xl font-semibold tracking-tight', className)} {...props} />
}

export function TypographyP({ className, ...props }: Props<'p'>) {
  return <p className={cn('leading-7 [&:not(:first-child)]:mt-6', className)} {...props} />
}

export function TypographyBlockquote({ className, ...props }: Props<'blockquote'>) {
  return <blockquote className={cn('mt-6 border-l-2 pl-6 italic', className)} {...props} />
}

export function TypographyList({ className, ...props }: Props<'ul'>) {
  return <ul className={cn('my-6 ml-6 list-disc [&>li]:mt-2', className)} {...props} />
}

export function TypographyOrderedList({ className, ...props }: Props<'ol'>) {
  return <ol className={cn('my-6 ml-6 list-decimal [&>li]:mt-2', className)} {...props} />
}

export function TypographyListItem({ className, ...props }: Props<'li'>) {
  return <li className={cn(className)} {...props} />
}

export function TypographyInlineCode({ className, ...props }: Props<'code'>) {
  return (
    <code
      className={cn('relative bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold', className)}
      {...props}
    />
  )
}

export function TypographyLead({ className, ...props }: Props<'p'>) {
  return <p className={cn('text-xl text-muted-foreground', className)} {...props} />
}

export function TypographyLarge({ className, ...props }: Props<'div'>) {
  return <div className={cn('text-lg font-semibold', className)} {...props} />
}

export function TypographySmall({ className, ...props }: Props<'small'>) {
  return <small className={cn('text-sm leading-none font-medium', className)} {...props} />
}

export function TypographyMuted({ className, ...props }: Props<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function TypographySpan({ className, ...props }: Props<'span'>) {
  return <span className={cn(className)} {...props} />
}

export function TypographyTable({ className, ...props }: Props<'div'>) {
  return <div className={cn('my-6 w-full overflow-y-auto', className)} {...props} />
}

export function TypographyTableElement({ className, ...props }: Props<'table'>) {
  return <table className={cn('w-full', className)} {...props} />
}

export function TypographyTableHeader({ className, ...props }: Props<'thead'>) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />
}

export function TypographyTableBody({ className, ...props }: Props<'tbody'>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TypographyTableRow({ className, ...props }: Props<'tr'>) {
  return <tr className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />
}

export function TypographyTableHead({ className, ...props }: Props<'th'>) {
  return (
    <th
      className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', className)}
      {...props}
    />
  )
}

export function TypographyTableCell({ className, ...props }: Props<'td'>) {
  return <td className={cn('p-4 align-middle', className)} {...props} />
}
