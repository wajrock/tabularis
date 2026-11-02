import {useId, type ElementType, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {X} from 'lucide-react';
import {useEscapeKey} from '@/hooks/useEscapeKey';
import {IconButton} from './IconButton';

export type ModalSize = 'sm' | 'md' | 'lg';
export type ModalTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONE_CLASS: Record<ModalTone, string> = {
    neutral: 'bg-surface-primary text-secondary',
    accent: 'bg-tint-accent-bg text-tint-accent-fg',
    success: 'bg-tint-success-bg text-tint-success-fg',
    warning: 'bg-tint-warning-bg text-tint-warning-fg',
    danger: 'bg-tint-danger-bg text-tint-danger-fg',
};

const SIZE_CLASS: Record<ModalSize, string> = {
    sm: 'w-[440px]',
    md: 'w-[600px]',
    lg: 'w-[860px]',
};

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    /**
     * Standard dialog: a header with this title and a close button, the
     * children as a scrolling body, then `footer`. Without a title the
     * children are rendered as the whole dialog (modals not migrated yet).
     */
    title?: ReactNode;
    /** Icon shown in a tinted tile before the title. */
    icon?: ElementType;
    /** Tint of the icon tile; `danger` for destructive dialogs. */
    iconTone?: ModalTone;
    /** Extra content at the right of the header, before the close button (e.g. steps). */
    headerActions?: ReactNode;
    /** Footer buttons, aligned right. */
    footer?: ReactNode;
    /** Footer content aligned left, e.g. a secondary "Copy" action. */
    footerStart?: ReactNode;
    size?: ModalSize;
    /** Extra classes for the dialog panel (fixed height…). */
    className?: string;
    /** Extra classes for the body (padding, spacing). */
    bodyClassName?: string;
    /** `aria-describedby` of the dialog. */
    describedBy?: string;
    /** While true, Escape, the backdrop and the close button do not close it. */
    busy?: boolean;
    closeOnBackdrop?: boolean;
    /** Raise it above another modal or overlay. */
    zIndex?: number;
    /** `top`: hangs from the upper part of the window (palettes) instead of the center. */
    placement?: 'center' | 'top';
    children: ReactNode;
}

/** Dialog over a dimmed backdrop; closes on Escape and on a click outside. */
export const Modal = ({
    isOpen,
    onClose,
    title,
    icon: Icon,
    iconTone = 'neutral',
    headerActions,
    footer,
    footerStart,
    size = 'md',
    className,
    bodyClassName,
    describedBy,
    busy = false,
    closeOnBackdrop = true,
    zIndex = 100,
    placement = 'center',
    children,
}: ModalProps) => {
    const {t} = useTranslation();
    const titleId = useId();
    const close = () => {
        if (!busy) onClose();
    };
    useEscapeKey(isOpen, close);

    if (!isOpen) return null;

    return createPortal(
        // Backdrop only: the dialog inside carries the semantics, Escape closes it
        // via useEscapeKey, and clicks on the child never reach this check.
        <div
            role="presentation"
            style={{zIndex}}
            className={clsx(
                'fixed inset-0 flex justify-center bg-backdrop p-6',
                placement === 'top' ? 'items-start pt-[15vh]' : 'items-center',
            )}
            onMouseDown={(event) => {
                if (closeOnBackdrop && event.target === event.currentTarget) close();
            }}
        >
            {title === undefined ? (
                children
            ) : (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={describedBy}
                    aria-busy={busy || undefined}
                    className={clsx(
                        'flex max-h-full max-w-full flex-col overflow-hidden rounded-lg bg-base shadow-modal',
                        SIZE_CLASS[size],
                        className,
                    )}
                >
                    <div className="flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-default px-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                            {Icon && (
                                <span
                                    aria-hidden="true"
                                    className={clsx(
                                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                                        TONE_CLASS[iconTone],
                                    )}
                                >
                                    <Icon size={14} />
                                </span>
                            )}
                            <h2
                                id={titleId}
                                className="min-w-0 truncate text-[16px] font-semibold leading-6 text-primary"
                            >
                                {title}
                            </h2>
                        </div>
                        <div className="flex shrink-0 items-center gap-5">
                            {headerActions}
                            <IconButton
                                label={t('common.close')}
                                size="md"
                                disabled={busy}
                                onClick={close}
                            >
                                <X size={16} />
                            </IconButton>
                        </div>
                    </div>
                    <div
                        className={clsx(
                            'min-h-0 flex-1 overflow-y-auto pl-4 pr-4 py-4',
                            bodyClassName,
                        )}
                    >
                        {children}
                    </div>
                    {(footer || footerStart) && (
                        <div className="flex shrink-0 items-center gap-3 border-t border-default px-4 py-3">
                            {footerStart}
                            <div className="ml-auto flex items-center gap-2.5">{footer}</div>
                        </div>
                    )}
                </div>
            )}
        </div>,
        document.body,
    );
};
