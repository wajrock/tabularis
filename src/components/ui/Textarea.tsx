import {forwardRef, type TextareaHTMLAttributes} from 'react';
import clsx from 'clsx';

/** Multi-line field, outlined like `Input`; monospace for lists of identifiers. */
export const TEXTAREA_CLASS =
    'w-full resize-y rounded-md border border-strong bg-base px-3 py-2 font-mono text-sm text-primary placeholder:text-disabled transition-colors focus:border-focus focus:outline-none disabled:opacity-50';

export const Textarea = forwardRef<
    HTMLTextAreaElement,
    TextareaHTMLAttributes<HTMLTextAreaElement>
>(({className, ...props}, ref) => (
    <textarea
        ref={ref}
        autoCorrect="off"
        autoCapitalize="off"
        autoComplete="off"
        spellCheck={false}
        {...props}
        className={clsx(TEXTAREA_CLASS, className)}
    />
));

Textarea.displayName = 'Textarea';
