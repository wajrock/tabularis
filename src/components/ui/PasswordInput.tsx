import {useState, type KeyboardEventHandler} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {Input, InputAction} from './Input';

interface PasswordInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    className?: string;
    onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
    'aria-label'?: string;
}

/**
 * Password field with a reveal (show/hide) toggle inside it. The eye button is
 * skipped in the tab order so keyboard focus flows straight to the next field.
 */
export const PasswordInput = ({
    value,
    onChange,
    placeholder,
    autoFocus,
    className,
    onKeyDown,
    'aria-label': ariaLabel,
}: PasswordInputProps) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Input
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            aria-label={ariaLabel}
            className={className}
            trailing={
                <InputAction
                    label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </InputAction>
            }
        />
    );
};
