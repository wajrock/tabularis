import {useEffect, useId, useState, type ElementType, type ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {Loader2} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Modal} from '@/components/ui/Modal';
import {SqlPreview} from '@/components/ui/SqlPreview';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    /** Icon before the title, tinted after the variant. */
    icon?: ElementType;
    message: string;
    /** Optional SQL shown in a read-only preview below the message. */
    sql?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    busy?: boolean;
    confirmDisabled?: boolean;
    children?: ReactNode;
    onConfirm: () => void;
    /** `danger` gets the destructive confirm button; the others the primary one. */
    variant?: 'danger' | 'warning' | 'info';
    /**
     * When set, the confirm button stays disabled for this many seconds after the
     * modal opens, showing a countdown. Gives the user a beat to actually read the
     * message before confirming a destructive action.
     */
    confirmDelaySeconds?: number;
    /** Raise it above another modal. */
    zIndex?: number;
}

export const ConfirmModal = ({
    isOpen,
    onClose,
    title,
    icon,
    message,
    sql,
    confirmLabel,
    cancelLabel,
    busy = false,
    confirmDisabled = false,
    children,
    onConfirm,
    variant = 'danger',
    confirmDelaySeconds,
    zIndex,
}: ConfirmModalProps) => {
    const {t} = useTranslation();
    const messageId = useId();
    const [remaining, setRemaining] = useState(confirmDelaySeconds ?? 0);

    // Reset the countdown whenever the modal transitions to open — done during
    // render (React's recommended pattern) rather than in an effect.
    const [prevOpen, setPrevOpen] = useState(isOpen);
    if (isOpen !== prevOpen) {
        setPrevOpen(isOpen);
        setRemaining(isOpen ? (confirmDelaySeconds ?? 0) : 0);
    }

    useEffect(() => {
        if (!isOpen || !confirmDelaySeconds) return;
        const interval = setInterval(() => {
            setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen, confirmDelaySeconds]);

    const isCountingDown = remaining > 0;
    const label = confirmLabel ?? (variant === 'danger' ? t('common.delete') : t('common.ok'));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            icon={icon}
            iconTone={
                variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'accent'
            }
            size="sm"
            busy={busy}
            zIndex={zIndex}
            describedBy={messageId}
            bodyClassName="space-y-4"
            footer={
                <>
                    <Button variant="outline" onClick={onClose} disabled={busy}>
                        {cancelLabel ?? t('common.cancel')}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        disabled={isCountingDown || busy || confirmDisabled}
                        aria-busy={busy || undefined}
                        icon={
                            busy ? (
                                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                            ) : undefined
                        }
                    >
                        {isCountingDown ? `${label} (${remaining})` : label}
                    </Button>
                </>
            }
        >
            <p id={messageId} className="text-sm leading-relaxed text-secondary">
                {message}
            </p>
            {sql && <SqlPreview sql={sql} height="120px" />}
            {children}
        </Modal>
    );
};
