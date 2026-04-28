import * as React from 'react'
import { cn } from '../../lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('rounded-xl border border-white/10 bg-white/5', className)} {...props} />
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('flex items-center justify-between gap-2 p-4', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
	return <h3 className={cn('text-sm font-semibold text-neutral-200', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
	return <p className={cn('text-sm text-neutral-500', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('p-4 pt-0', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return <div className={cn('flex items-center p-4 pt-0', className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
