import type {ReactNode} from 'react';

interface FieldProps {
    label: ReactNode;
    /** Help under the control; replaced by `error` when set. */
    hint?: ReactNode;
    error?: ReactNode;
    children: ReactNode;
}

/** Form field: label above its control, then a hint or an error. The label wraps the control. */
export function Field({label, hint, error, children}: FieldProps) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-secondary">{label}</span>
            {children}
            {error ? (
                <span role="alert" className="text-xs text-tint-danger-fg">
                    {error}
                </span>
            ) : (
                hint && <span className="text-xs text-muted">{hint}</span>
            )}
        </label>
    );
}
