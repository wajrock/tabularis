import type {ElementType, ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {ChevronDown, Download, FolderSymlink, Trash2, X} from 'lucide-react';
import {DropdownMenu} from '@/components/ui/DropdownMenu';
import {FOCUS_RING} from '@/components/ui/focusRing';
import {IconButton} from '@/components/ui/IconButton';
import type {MenuEntry} from '@/components/ui/Menu';

interface ConnectionsSelectionBarProps {
    selectedCount: number;
    /** Hidden once everything visible is selected. */
    onSelectAll?: () => void;
    moveTargets: () => MenuEntry[];
    onExport: () => void;
    onDelete: () => void;
    onClear: () => void;
}

const actionClass = clsx(
    'flex h-9 items-center gap-2 rounded-md px-2.5 text-sm transition-colors',
    FOCUS_RING,
);

function Divider() {
    return <span aria-hidden="true" className="h-5 w-px shrink-0 bg-default" />;
}

function Action({
    icon: Icon,
    danger = false,
    children,
    ...props
}: {icon: ElementType; danger?: boolean; children: ReactNode} & React.ComponentProps<'button'>) {
    return (
        <button
            type="button"
            {...props}
            className={clsx(
                actionClass,
                danger
                    ? 'text-tint-danger-fg hover:bg-tint-danger-bg'
                    : 'text-primary hover:bg-surface-hover',
            )}
        >
            <Icon size={16} className={clsx('shrink-0', !danger && 'text-secondary')} />
            {children}
        </button>
    );
}

/** Bulk actions for the Cmd/Ctrl + click selection, floating at the bottom of the page. */
export function ConnectionsSelectionBar({
    selectedCount,
    onSelectAll,
    moveTargets,
    onExport,
    onDelete,
    onClear,
}: ConnectionsSelectionBarProps) {
    const {t} = useTranslation();
    return (
        <div
            // w-max: positioned from the middle, the bar would otherwise only get half the
            // page width and wrap its labels.
            role="toolbar"
            aria-label={t('connections.selectedCount', {count: selectedCount})}
            className="absolute bottom-6 left-1/2 z-30 flex w-max -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-lg border border-default bg-base px-4 py-1.5 shadow-menu"
        >
            <div className="flex items-center gap-2 whitespace-nowrap text-sm font-medium">
                <span className="text-primary">
                    {t('connections.selectedCount', {count: selectedCount})}
                </span>
                {onSelectAll && (
                    <button
                        type="button"
                        onClick={onSelectAll}
                        className={clsx('rounded-sm text-accent hover:underline', FOCUS_RING)}
                    >
                        {t('connections.selectAll')}
                    </button>
                )}
            </div>
            <Divider />
            <div className="flex items-center gap-1">
                <DropdownMenu
                    align="start"
                    items={moveTargets}
                    trigger={(props) => (
                        <Action {...props} icon={FolderSymlink}>
                            {t('connections.moveSelected')}
                            <ChevronDown size={14} className="text-secondary" />
                        </Action>
                    )}
                />
                <Action icon={Download} onClick={onExport}>
                    {t('connections.exportShort')}
                </Action>
                <Action icon={Trash2} danger onClick={onDelete}>
                    {t('connections.delete')}
                </Action>
            </div>
            <Divider />
            <IconButton label={t('connections.deselectAll')} onClick={onClear} className="-mr-1.5">
                <X size={16} />
            </IconButton>
        </div>
    );
}
