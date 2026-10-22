import type {HTMLAttributes} from 'react';
import clsx from 'clsx';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONE_CLASS: Record<BadgeTone, string> = {
    neutral: 'bg-surface-primary text-secondary',
    accent: 'bg-tint-accent-bg text-tint-accent-fg',
    success: 'bg-tint-success-bg text-tint-success-fg',
    warning: 'bg-tint-warning-bg text-tint-warning-fg',
    danger: 'bg-tint-danger-bg text-tint-danger-fg',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: BadgeTone;
}

/** Small rounded pill for counts and short statuses. */
export function Badge({tone = 'neutral', className, ...props}: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1.5',
                'text-[11px] font-medium leading-none tabular-nums',
                TONE_CLASS[tone],
                className,
            )}
            {...props}
        />
    );
}
