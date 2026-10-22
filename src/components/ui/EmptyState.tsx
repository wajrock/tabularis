import type {ElementType, ReactNode} from 'react';

interface EmptyStateProps {
    /** Shown in a neutral 40 px tile. Ignored when `illustration` is set. */
    icon?: ElementType;
    illustration?: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    /** Buttons, centered under the text. */
    actions?: ReactNode;
    /** Secondary line under the actions. */
    footer?: ReactNode;
}

/** Centered placeholder for an empty list or a search without results. */
export function EmptyState({
    icon: Icon,
    illustration,
    title,
    description,
    actions,
    footer,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center gap-5 p-14 text-center">
            <div aria-hidden="true">
                {illustration ??
                    (Icon && (
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-primary text-secondary">
                            <Icon size={22} />
                        </span>
                    ))}
            </div>

            <div className="flex max-w-[340px] flex-col gap-1">
                <h2 className="text-[16px] font-semibold leading-6 text-primary">{title}</h2>
                {description && <p className="text-sm text-muted">{description}</p>}
            </div>

            {actions && (
                <div className="flex flex-wrap items-center justify-center gap-3">{actions}</div>
            )}

            {footer}
        </div>
    );
}
