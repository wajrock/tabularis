import type {ElementType, ReactNode} from 'react';
import {NavLink} from 'react-router-dom';
import clsx from 'clsx';
import {FOCUS_RING_INSET} from '@/components/ui/focusRing';

interface NavItemProps {
    to: string;
    icon: ElementType;
    label: string;
    variant: 'expanded' | 'rail';
    /** Trailing badge (expanded) or corner badge (rail). */
    badge?: ReactNode;
    /** Accessible description, e.g. what the badge counts. */
    description?: string;
    /** Extra trailing control in the expanded row (e.g. a chevron), shown on hover or focus. */
    trailing?: ReactNode;
    /** Keep the trailing control visible instead of the badge. */
    showTrailing?: boolean;
}

const itemClass = (isActive: boolean) =>
    isActive
        ? 'bg-surface-secondary text-primary'
        : 'text-secondary hover:bg-surface-hover hover:text-primary';

export function NavItem({
    to,
    icon: Icon,
    label,
    variant,
    badge,
    description,
    trailing,
    showTrailing = false,
}: NavItemProps) {
    const ariaLabel = description ? `${label}: ${description}` : label;

    if (variant === 'rail') {
        return (
            <NavLink
                to={to}
                aria-label={ariaLabel}
                title={ariaLabel}
                className={({isActive}) =>
                    clsx(
                        'relative mx-auto flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                        itemClass(isActive),
                        FOCUS_RING_INSET,
                    )
                }
            >
                <Icon size={18} />
                {badge && <span className="absolute -right-1 -top-1">{badge}</span>}
            </NavLink>
        );
    }

    return (
        <div className="group relative flex items-center">
            <NavLink
                to={to}
                aria-label={ariaLabel}
                className={({isActive}) =>
                    clsx(
                        'flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                        itemClass(isActive),
                        FOCUS_RING_INSET,
                    )
                }
            >
                <Icon size={16} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {badge && (
                    <span
                        className={clsx(
                            trailing &&
                                (showTrailing
                                    ? 'invisible'
                                    : 'group-focus-within:invisible group-hover:invisible'),
                        )}
                    >
                        {badge}
                    </span>
                )}
            </NavLink>
            {trailing && (
                <span
                    className={clsx(
                        'absolute right-1',
                        !showTrailing &&
                            'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
                    )}
                >
                    {trailing}
                </span>
            )}
        </div>
    );
}
