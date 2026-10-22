import {forwardRef, type ButtonHTMLAttributes, type ReactNode} from 'react';
import clsx from 'clsx';
import {FOCUS_RING} from './focusRing';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'tinted';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    primary: 'bg-accent-primary text-inverse hover:bg-accent-primary/90',
    outline: 'border border-strong text-primary hover:bg-surface-hover',
    ghost: 'text-secondary hover:bg-surface-hover hover:text-primary',
    tinted: 'bg-tint-accent-bg text-tint-accent-fg hover:bg-tint-accent-bg/80',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    /** Leading icon (16 px). */
    icon?: ReactNode;
    /** Keyboard shortcut shown at the end, e.g. "⌘⇧N". */
    shortcut?: string;
    fullWidth?: boolean;
}

/** 36 px high text button. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            icon,
            shortcut,
            fullWidth = false,
            type = 'button',
            className,
            children,
            ...props
        },
        ref,
    ) => (
        <button
            ref={ref}
            type={type}
            className={clsx(
                'inline-flex h-9 shrink-0 items-center gap-2 rounded-md text-sm font-medium transition-colors',
                FOCUS_RING,
                'disabled:pointer-events-none disabled:opacity-50',
                VARIANT_CLASS[variant],
                fullWidth ? 'w-full px-3' : 'px-3.5',
                className,
            )}
            {...props}
        >
            {icon}
            <span className={clsx('truncate', fullWidth && 'flex-1 text-left')}>{children}</span>
            {shortcut && (
                // kbd defaults to monospace; the shortcut uses the UI font.
                <kbd className="text-xs opacity-75" style={{fontFamily: 'inherit'}}>
                    {shortcut}
                </kbd>
            )}
        </button>
    ),
);

Button.displayName = 'Button';
