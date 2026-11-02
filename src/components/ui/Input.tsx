import {
    forwardRef,
    type ButtonHTMLAttributes,
    type InputHTMLAttributes,
    type ReactNode,
} from 'react';
import clsx from 'clsx';

/** Look of every text field of the redesign: 32 px, outlined, 8 px radius. */
export const INPUT_CLASS =
    'h-8 w-full rounded-md border border-strong bg-base px-3 text-sm text-primary placeholder:text-disabled transition-colors focus:border-focus focus:outline-none disabled:opacity-50 aria-[invalid=true]:border-tint-danger-fg';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    /** Icons or `InputAction`s shown inside the field, on the right. */
    trailing?: ReactNode;
    /** Classes of the wrapper when `trailing` is set (width in a flex row). */
    containerClassName?: string;
}

/** Text field; spell checking and autocorrection are off (names, hosts, SQL). */
export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({className, type = 'text', trailing, containerClassName, ...props}, ref) => {
        const input = (
            <input
                ref={ref}
                type={type}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
                {...props}
                className={clsx(INPUT_CLASS, trailing != null && 'pr-9', className)}
            />
        );
        if (trailing == null) return input;
        return (
            <div className={clsx('relative', containerClassName)}>
                {input}
                <div className="absolute inset-y-0 right-1.5 flex items-center gap-0.5">
                    {trailing}
                </div>
            </div>
        );
    },
);

Input.displayName = 'Input';

interface InputActionProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
    /** Accessible name, also shown as the native tooltip. */
    label: string;
    children: ReactNode;
}

/** 24 px icon button inside an `Input` (reveal, clear, browse). */
export function InputAction({label, className, type = 'button', ...props}: InputActionProps) {
    return (
        <button
            type={type}
            aria-label={label}
            title={label}
            className={clsx(
                'flex h-6 w-6 items-center justify-center rounded-sm text-muted transition-colors hover:text-primary focus:outline-none focus-visible:text-primary disabled:pointer-events-none disabled:opacity-50',
                className,
            )}
            {...props}
        />
    );
}
