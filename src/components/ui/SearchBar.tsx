import type {InputHTMLAttributes} from 'react';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Search, X} from 'lucide-react';

export interface SearchBarProps extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onChange' | 'type'
> {
    value: string;
    onChange: (value: string) => void;
    /** Classes for the outer field (width, margins). */
    className?: string;
}

/** 36 px outlined search field with a clear button. */
export function SearchBar({
    value,
    onChange,
    onKeyDown,
    placeholder,
    className,
    ...props
}: SearchBarProps) {
    const {t} = useTranslation();

    return (
        <label
            className={clsx(
                'flex h-9 items-center gap-2 rounded-md border border-strong bg-base px-3.5 focus-within:border-focus',
                className,
            )}
        >
            <Search size={16} className="shrink-0 text-muted" />
            <input
                {...props}
                type="search"
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    onKeyDown?.(e);
                    // Escape clears the query first; a second Escape reaches the page.
                    if (e.key === 'Escape' && value) {
                        e.stopPropagation();
                        onChange('');
                    }
                }}
                placeholder={placeholder}
                aria-label={props['aria-label'] ?? placeholder}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-primary placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    aria-label={t('common.clearSearch')}
                    title={t('common.clearSearch')}
                    className="shrink-0 rounded-sm text-muted transition-colors hover:text-primary"
                >
                    <X size={14} />
                </button>
            )}
        </label>
    );
}
