import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {
    ArrowLeftRight,
    ChevronDown,
    Database,
    Download,
    FileInput,
    Loader2,
    Plus,
} from 'lucide-react';
import {BetaBadge} from '@/components/ui/BetaBadge';
import {Button} from '@/components/ui/Button';
import {DropdownMenu} from '@/components/ui/DropdownMenu';
import {FOCUS_RING} from '@/components/ui/focusRing';

interface ConnectionsHeaderProps {
    connectionCount: number;
    openCount: number;
    onAddConnection: () => void;
    onCreateSqlite: () => void;
    isCreatingSqlite: boolean;
    onImport: () => void;
    onExport: () => void;
}

const splitPartClass = clsx(
    'flex h-full items-center text-inverse transition-colors hover:bg-inverse/10',
    FOCUS_RING,
);

export function ConnectionsHeader({
    connectionCount,
    openCount,
    onAddConnection,
    onCreateSqlite,
    isCreatingSqlite,
    onImport,
    onExport,
}: ConnectionsHeaderProps) {
    const {t} = useTranslation();
    const hasConnections = connectionCount > 0;

    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-[3px]">
                <h1 className="text-[22px] font-bold leading-7 text-primary">
                    {t('connections.title')}
                </h1>
                <div className="flex items-center gap-4 text-sm font-medium">
                    <span className="text-muted">
                        {hasConnections
                            ? t('connections.connectionCount', {count: connectionCount})
                            : t('connections.empty.subtitle')}
                    </span>
                    {openCount > 0 && (
                        <span className="flex items-center gap-1.5 text-tint-success-fg">
                            <span className="h-2 w-2 rounded-full bg-status-success" />
                            {t('connections.openCount', {count: openCount})}
                        </span>
                    )}
                </div>
            </div>

            {/* The empty state carries its own actions. */}
            {hasConnections && (
                <div className="flex shrink-0 items-center gap-3">
                    <DropdownMenu
                        items={[
                            {
                                label: t('connections.importFromApp.menuLabel'),
                                icon: FileInput,
                                onSelect: onImport,
                                trailing: <BetaBadge />,
                            },
                            {
                                label: t('connections.export'),
                                icon: Download,
                                onSelect: onExport,
                            },
                        ]}
                        trigger={(props, isOpen) => (
                            <Button
                                {...props}
                                variant="outline"
                                icon={<ArrowLeftRight size={16} className="text-secondary" />}
                            >
                                <span className="flex items-center gap-2">
                                    {t('connections.importExport')}
                                    <ChevronDown
                                        size={16}
                                        className={clsx(
                                            'text-secondary transition-transform',
                                            isOpen && 'rotate-180',
                                        )}
                                    />
                                </span>
                            </Button>
                        )}
                    />

                    {/* Split button: the main part adds a connection, the chevron lists other ways. */}
                    <div className="flex h-9 items-center overflow-hidden rounded-md bg-accent-primary text-sm font-medium">
                        <button
                            type="button"
                            onClick={onAddConnection}
                            className={clsx(splitPartClass, 'gap-2 rounded-l-md pl-3.5 pr-3')}
                        >
                            <Plus size={16} />
                            {t('connections.addConnection')}
                        </button>
                        <span aria-hidden="true" className="h-[18px] w-px bg-inverse/30" />
                        <DropdownMenu
                            items={[
                                {
                                    label: t('connections.newSqliteDatabase.menuLabel'),
                                    icon: isCreatingSqlite ? Loader2 : Database,
                                    onSelect: onCreateSqlite,
                                    disabled: isCreatingSqlite,
                                },
                            ]}
                            trigger={(props, isOpen) => (
                                <button
                                    {...props}
                                    type="button"
                                    aria-label={t('connections.moreAddOptions')}
                                    title={t('connections.moreAddOptions')}
                                    className={clsx(splitPartClass, 'rounded-r-md px-2.5')}
                                >
                                    <ChevronDown
                                        size={16}
                                        className={clsx(
                                            'transition-transform',
                                            isOpen && 'rotate-180',
                                        )}
                                    />
                                </button>
                            )}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
