import clsx from 'clsx';

/**
 * Background (and, for cards, outline) of a connection card or row for its
 * selection and live state. Selected rows are tinted only: they share borders.
 */
export const connectionItemStateClass = ({
    variant,
    selected,
    isActive,
    isDriverEnabled,
}: {
    variant: 'card' | 'row';
    selected: boolean;
    isActive: boolean;
    isDriverEnabled: boolean;
}) =>
    clsx(
        selected
            ? variant === 'card'
                ? 'bg-accent-primary/5 outline outline-[1.5px] -outline-offset-1 outline-accent-primary'
                : 'bg-tint-accent-bg/60 hover:bg-tint-accent-bg'
            : isActive
              ? 'bg-accent-primary/5'
              : clsx('bg-base', variant === 'row' && 'hover:bg-surface-hover'),
        !isDriverEnabled && 'cursor-not-allowed opacity-60',
    );
