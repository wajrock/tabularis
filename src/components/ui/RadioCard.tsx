import type {ElementType, ReactNode} from 'react';
import clsx from 'clsx';

interface RadioCardProps {
    name: string;
    checked: boolean;
    onChange: () => void;
    title: ReactNode;
    description?: ReactNode;
    icon?: ElementType;
}

/** Selectable option card; the selected one is tinted with an accent outline. */
export function RadioCard({
    name,
    checked,
    onChange,
    title,
    description,
    icon: Icon,
}: RadioCardProps) {
    return (
        <label
            className={clsx(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                checked
                    ? 'border-transparent bg-accent-primary/5 outline outline-[1.5px] -outline-offset-1 outline-accent-primary'
                    : 'border-default hover:bg-surface-hover',
            )}
        >
            <input
                type="radio"
                name={name}
                checked={checked}
                onChange={onChange}
                className="mt-0.5 h-4 w-4 shrink-0 accent-accent-primary"
            />
            {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-secondary" />}
            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium text-primary">{title}</span>
                {description && <span className="text-xs text-muted">{description}</span>}
            </span>
        </label>
    );
}
