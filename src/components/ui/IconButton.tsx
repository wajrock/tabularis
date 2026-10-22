import {forwardRef, type ButtonHTMLAttributes, type ReactNode} from 'react';
import clsx from 'clsx';
import {FOCUS_RING} from './focusRing';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    /** Accessible name, also shown as the native tooltip. */
    label: string;
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
}

/** Borderless square button holding a single icon. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    ({label, size = 'sm', className, type = 'button', children, ...props}, ref) => (
        <button
            ref={ref}
            type={type}
            aria-label={label}
            title={label}
            className={clsx(
                'inline-flex shrink-0 items-center justify-center text-secondary transition-colors',
                'hover:bg-surface-hover hover:text-primary disabled:pointer-events-none disabled:opacity-50',
                FOCUS_RING,
                {sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-9 w-9'}[size],
                'rounded-md',
                className,
            )}
            {...props}
        >
            {children}
        </button>
    ),
);

IconButton.displayName = 'IconButton';
