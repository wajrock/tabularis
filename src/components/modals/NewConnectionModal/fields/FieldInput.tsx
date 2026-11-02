import {Field} from '@/components/ui/Field';
import {Input} from '@/components/ui/Input';
import {PasswordInput} from '@/components/ui/PasswordInput';

/** Labelled text or password field of the connection form. */
export const FieldInput = ({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
    autoFocus,
    className,
}: {
    label: string;
    value: string | number | undefined;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    autoFocus?: boolean;
    className?: string;
}) => (
    <div className={className}>
        <Field label={label}>
            {type === 'password' ? (
                <PasswordInput
                    value={String(value ?? '')}
                    onChange={onChange}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                />
            ) : (
                <Input
                    type={type}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                />
            )}
        </Field>
    </div>
);
