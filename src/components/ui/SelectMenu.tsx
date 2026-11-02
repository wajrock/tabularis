import type {ReactNode} from 'react';
import clsx from 'clsx';
import {Check, ChevronDown} from 'lucide-react';
import {DropdownMenu} from './DropdownMenu';
import {INPUT_CLASS} from './Input';

export interface SelectMenuOption<T extends string> {
    value: T;
    label: string;
    /** Shown before the label, in the field and in the menu (e.g. a status dot). */
    leading?: ReactNode;
}

interface SelectMenuProps<T extends string> {
    options: SelectMenuOption<T>[];
    value: T;
    onChange: (value: T) => void;
    ariaLabel?: string;
    id?: string;
    ariaDescribedBy?: string;
    /** Shown when no option matches `value`. */
    placeholder?: string;
}

/**
 * Form select: a field styled like `Input` opening a menu under it, the
 * selected option checked. For short fixed lists; no search.
 */
export function SelectMenu<T extends string>({
    options,
    value,
    onChange,
    ariaLabel,
    id,
    ariaDescribedBy,
    placeholder,
}: SelectMenuProps<T>) {
    const selected = options.find((option) => option.value === value);

    return (
        <DropdownMenu
            align="start"
            items={options.map((option) => ({
                label: option.label,
                leading: option.leading,
                onSelect: () => onChange(option.value),
                trailing:
                    option.value === value ? (
                        <Check size={14} className="text-accent" />
                    ) : undefined,
            }))}
            trigger={(props) => (
                <button
                    {...props}
                    id={id}
                    type="button"
                    // Nothing to pick: the placeholder explains why, no empty menu opens.
                    disabled={options.length === 0}
                    aria-label={ariaLabel}
                    aria-describedby={ariaDescribedBy}
                    className={clsx(
                        INPUT_CLASS,
                        'flex items-center gap-2 text-left disabled:cursor-not-allowed',
                    )}
                >
                    {selected?.leading}
                    <span className={clsx('flex-1 truncate', !selected && 'text-muted')}>
                        {selected?.label ?? placeholder}
                    </span>
                    <ChevronDown size={14} className="shrink-0 text-secondary" />
                </button>
            )}
        />
    );
}
