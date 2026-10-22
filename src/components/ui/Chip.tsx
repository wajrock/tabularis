import type {HTMLAttributes, ReactNode} from 'react';
import clsx from 'clsx';
import {NEUTRAL_CHIP_CLASS, TONE_DOT_CLASS, toneStyle, type Tone} from '@/utils/tones';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: Tone;
    /** `rounded` for attributes, `pill` for live states (active, open, update). */
    shape?: 'rounded' | 'pill';
    /** `md` is the standard chip; `sm` fits inline counters such as filter tabs. */
    size?: 'sm' | 'md';
    /** Leading status dot; `pulse` for live activity. */
    dot?: 'static' | 'pulse';
    icon?: ReactNode;
    uppercase?: boolean;
    /**
     * `ghost` drops the border and lowers contrast: for taxonomy tokens (kind, tags), never for state.
     * `flat` is the redesign chip: 20 px, borderless, tinted from the theme's tint tokens.
     */
    variant?: 'solid' | 'ghost' | 'flat';
    children?: ReactNode;
}

/**
 * The single chip primitive for connection cards, plugin cards and the settings
 * navigation. Every tag, status and badge in those views goes through here so
 * geometry, typography and colour semantics stay identical across screens.
 */
/** Tint classes of the `flat` variant; tones without a tint token fall back to `toneStyle`. */
const FLAT_TONE_CLASS: Partial<Record<Tone, string>> = {
    neutral: 'bg-surface-primary text-secondary',
    primary: 'bg-tint-accent-bg text-tint-accent-fg',
    update: 'bg-tint-accent-bg text-tint-accent-fg',
    success: 'bg-tint-success-bg text-tint-success-fg',
    warning: 'bg-tint-warning-bg text-tint-warning-fg',
    danger: 'bg-tint-danger-bg text-tint-danger-fg',
};

export function Chip({
    tone = 'neutral',
    shape = 'rounded',
    size = 'md',
    dot,
    icon,
    uppercase = false,
    variant = 'solid',
    className,
    style,
    children,
    ...props
}: ChipProps) {
    if (variant === 'flat') {
        const flatClass = FLAT_TONE_CLASS[tone];
        return (
            <span
                {...props}
                className={clsx(
                    'inline-flex h-5 items-center gap-1 whitespace-nowrap px-[7px] text-[11px] font-medium',
                    shape === 'pill' ? 'rounded-full' : 'rounded-md',
                    uppercase && 'uppercase tracking-wide',
                    flatClass,
                    className,
                )}
                style={{...(flatClass ? undefined : toneStyle(tone)), ...style}}
            >
                {icon}
                {children}
            </span>
        );
    }

    return (
        <span
            {...props}
            className={clsx(
                'inline-flex items-center gap-1 whitespace-nowrap border',
                variant === 'ghost' ? 'border-transparent font-medium' : 'font-semibold',
                size === 'sm' ? 'px-1.5 py-px text-[9px]' : 'px-1.5 py-0.5 text-[10px]',
                shape === 'pill' ? 'rounded-full' : 'rounded-md',
                uppercase && 'uppercase tracking-wide',
                tone === 'neutral' &&
                    (variant === 'ghost'
                        ? 'bg-surface-secondary/50 text-muted'
                        : NEUTRAL_CHIP_CLASS),
                className,
            )}
            style={{
                ...toneStyle(tone),
                ...(variant === 'ghost' ? {borderColor: 'transparent'} : {}),
                ...style,
            }}
        >
            {dot && (
                <span
                    aria-hidden="true"
                    className={clsx(
                        'h-1.5 w-1.5 shrink-0 rounded-full',
                        TONE_DOT_CLASS[tone],
                        dot === 'pulse' && 'animate-pulse',
                    )}
                />
            )}
            {icon}
            {children}
        </span>
    );
}
