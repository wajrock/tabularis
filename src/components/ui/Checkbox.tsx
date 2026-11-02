import {useId, type ReactNode} from 'react';
import clsx from 'clsx';
import {Check} from 'lucide-react';

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: ReactNode;
    /** Help under the label, linked to the checkbox as its description. */
    description?: ReactNode;
    disabled?: boolean;
    id?: string;
    /** Classes of the row (e.g. full width with a hover background in a list). */
    className?: string;
}

/**
 * 16 px checkbox centred on the first line of its label; the label row is
 * clickable and the description sits under the label.
 */
export function Checkbox({
    checked,
    onChange,
    label,
    description,
    disabled,
    id,
    className,
}: CheckboxProps) {
    const descriptionId = useId();
    return (
        <div
            className={clsx(
                'flex flex-col gap-0.5',
                disabled && 'opacity-50',
                className ?? 'w-fit',
            )}
        >
            <label
                className={clsx(
                    'flex select-none items-start gap-2.5',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
            >
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.checked)}
                    aria-describedby={description ? descriptionId : undefined}
                    className="peer sr-only"
                />
                <span
                    aria-hidden="true"
                    className={clsx(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors',
                        'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
                        checked
                            ? 'border-accent-primary bg-accent-primary text-inverse'
                            : 'border-disabled bg-base text-transparent',
                    )}
                >
                    <Check size={10} strokeWidth={3.5} />
                </span>
                <span className="min-w-0 text-sm font-medium leading-5 text-primary">{label}</span>
            </label>
            {description && (
                <span id={descriptionId} className="pl-[26px] text-xs text-muted">
                    {description}
                </span>
            )}
        </div>
    );
}
