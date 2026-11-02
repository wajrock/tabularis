import {forwardRef, type ButtonHTMLAttributes, type ReactNode} from 'react';
import clsx from 'clsx';
import {FOCUS_RING} from './focusRing';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'tinted' | 'danger';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    primary: 'bg-accent-primary text-inverse hover:bg-accent-primary/90',
    outline: 'border border-strong text-primary hover:bg-surface-hover',
    ghost: 'text-secondary hover:bg-surface-hover hover:text-primary',
    tinted: 'bg-tint-accent-bg text-tint-accent-fg hover:bg-tint-accent-bg/80',
    /** Destructive confirmation (delete, drop, disconnect all). */
    danger: 'bg-tint-danger-solid text-inverse hover:bg-tint-danger-solid/90',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    /** Leading icon (16 px). */
    icon?: ReactNode;
    /** Keyboard shortcut shown at the end, e.g. "⌘⇧N". */
    shortcut?: string;
    fullWidth?: boolean;
    /** `md` is 36 px high; `sm` is 28 px, for secondary actions inside a panel. */
    size?: 'sm' | 'md';
}

/** Text button, 36 px high (28 px with `size="sm"`). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            icon,
            shortcut,
            fullWidth = false,
            size = 'md',
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
                'inline-flex shrink-0 items-center rounded-md font-medium transition-colors',
                size === 'sm' ? 'h-7 gap-1.5 text-xs' : 'h-9 gap-2 text-sm',
                FOCUS_RING,
                'disabled:pointer-events-none disabled:opacity-50',
                VARIANT_CLASS[variant],
                fullWidth ? 'w-full px-3' : size === 'sm' ? 'px-2.5' : 'px-3.5',
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
