import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {ChevronDown} from 'lucide-react';
import {FOCUS_RING} from '@/components/ui/focusRing';

interface UngroupedHeaderProps {
    count: number;
    isCollapsed: boolean;
    onToggle: () => void;
}

/** Header of the connections outside any group, styled like a group header. */
export function UngroupedHeader({count, isCollapsed, onToggle}: UngroupedHeaderProps) {
    const {t} = useTranslation();
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={!isCollapsed}
            className={clsx('flex h-9 w-fit items-center gap-2 rounded-md pr-2.5', FOCUS_RING)}
        >
            <ChevronDown
                size={14}
                className={clsx(
                    'shrink-0 text-secondary transition-transform',
                    isCollapsed && '-rotate-90',
                )}
            />
            <span className="text-sm font-semibold text-primary">{t('groups.ungrouped')}</span>
            <span className="text-sm font-semibold text-muted">{count}</span>
        </button>
    );
}
