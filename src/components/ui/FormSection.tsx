import type {ReactNode} from 'react';
import clsx from 'clsx';

interface FormSectionProps {
    title: ReactNode;
    description?: ReactNode;
    /** `md`: a section of a form; `sm`: a part inside a section. */
    size?: 'md' | 'sm';
    children: ReactNode;
}

/** Titled block of a form: title, description, then its controls. */
export function FormSection({title, description, size = 'md', children}: FormSectionProps) {
    return (
        <section className={clsx('flex flex-col', size === 'md' ? 'gap-4' : 'gap-2')}>
            <header className="flex flex-col gap-0.5">
                <h3
                    className={clsx(
                        'text-primary',
                        size === 'md'
                            ? 'text-[14px] font-semibold leading-5'
                            : 'text-sm font-medium',
                    )}
                >
                    {title}
                </h3>
                {description && (
                    <p className={clsx('text-muted', size === 'md' ? 'text-sm' : 'text-xs')}>
                        {description}
                    </p>
                )}
            </header>
            {children}
        </section>
    );
}
