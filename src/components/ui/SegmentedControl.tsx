import type {ElementType} from 'react';
import clsx from 'clsx';
import {FOCUS_RING_INSET} from './focusRing';

export interface SegmentedOption<T extends string> {
    value: T;
    /** Visible text; omit for an icon-only segment (then set `ariaLabel`). */
    label?: string;
    icon?: ElementType;
    ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
    options: SegmentedOption<T>[];
    value: T;
    /** Called on every click, also on the selected segment. */
    onChange: (value: T) => void;
    ariaLabel: string;
    className?: string;
}

/** Row of mutually exclusive buttons on a gray rail; the selected one is raised. */
export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    ariaLabel,
    className,
}: SegmentedControlProps<T>) {
    return (
        <div
            role="radiogroup"
            aria-label={ariaLabel}
            className={clsx(
                'inline-flex h-9 w-fit gap-1 rounded-md bg-surface-primary p-[3px]',
                className,
            )}
        >
            {options.map(({value: optionValue, label, icon: Icon, ariaLabel: optionLabel}) => {
                const selected = optionValue === value;
                return (
                    <button
                        key={optionValue}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={optionLabel}
                        title={label ? undefined : optionLabel}
                        onClick={() => onChange(optionValue)}
                        className={clsx(
                            'flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors',
                            label ? 'px-3' : 'w-[34px]',
                            FOCUS_RING_INSET,
                            selected
                                ? 'bg-base text-primary shadow-card'
                                : 'text-secondary hover:text-primary',
                        )}
                    >
                        {Icon && <Icon size={16} className="shrink-0" />}
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
