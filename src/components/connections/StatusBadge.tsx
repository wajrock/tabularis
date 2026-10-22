import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Loader2} from 'lucide-react';

export interface StatusBadgeProps {
    isActive: boolean;
    isOpen: boolean;
    isConnecting: boolean;
}

/** Live connection state: a green dot and label, pulsing for the active connection. */
export const StatusBadge = ({isActive, isOpen, isConnecting}: StatusBadgeProps) => {
    const {t} = useTranslation();
    if (isConnecting)
        return (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Loader2 size={12} className="animate-spin" />
                {t('connections.connecting')}
            </span>
        );
    if (!isActive && !isOpen) return null;
    return (
        <span className="flex items-center gap-1.5 text-xs font-semibold text-tint-success-fg">
            <span
                aria-hidden="true"
                className={clsx(
                    'h-2 w-2 rounded-full bg-status-success',
                    isActive && 'animate-pulse',
                )}
            />
            {isActive ? t('connections.active') : t('connections.open')}
        </span>
    );
};
