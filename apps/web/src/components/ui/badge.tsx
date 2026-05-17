import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variants = {
	default: 'border-transparent bg-primary text-primary-foreground',
	secondary: 'border-transparent bg-secondary text-secondary-foreground',
	destructive: 'border-transparent bg-destructive text-white',
	outline: 'text-foreground',
	new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
	saved: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
	interested: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
	applied: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
	rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
	idle: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
	running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 animate-pulse',
	success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
	error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
	requires_manual: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
	variant?: keyof typeof variants;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
	return (
		<div
			className={cn(
				'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
				variants[variant],
				className,
			)}
			{...props}
		/>
	);
}

export { Badge, type BadgeProps };
