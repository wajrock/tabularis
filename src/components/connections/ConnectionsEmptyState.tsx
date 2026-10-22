import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {FileInput, Loader2, Plus} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {FOCUS_RING} from '@/components/ui/focusRing';
import {useDrivers} from '@/hooks/useDrivers';
import {getDriverColorStyle, getDriverIcon} from '@/utils/driverUI';

interface ConnectionsEmptyStateProps {
    onAddConnection: () => void;
    onImport: () => void;
    onCreateSqlite: () => void;
    isCreatingSqlite: boolean;
}

const SHOWCASE_DRIVERS = [
    // Outer tiles tilt outward and sit 2 px lower: the three read as an arc.
    {id: 'sqlite', tilt: 'translate-y-0.5 -rotate-5'},
    {id: 'postgres', tilt: ''},
    {id: 'mysql', tilt: 'translate-y-0.5 rotate-5'},
];

export function ConnectionsEmptyState({
    onAddConnection,
    onImport,
    onCreateSqlite,
    isCreatingSqlite,
}: ConnectionsEmptyStateProps) {
    const {t} = useTranslation();
    const {allDrivers} = useDrivers();

    return (
        <EmptyState
            illustration={
                <div className="flex">
                    {SHOWCASE_DRIVERS.map(({id, tilt}, i) => {
                        const manifest = allDrivers.find((d) => d.id === id);
                        return (
                            <span
                                key={id}
                                className={clsx(
                                    // relative: without it the transformed outer tiles paint over the middle one.
                                    'relative flex h-14 w-14 items-center justify-center rounded-lg text-white outline outline-[5px] outline-base',
                                    i > 0 && '-ml-1',
                                    tilt,
                                )}
                                style={getDriverColorStyle(manifest)}
                            >
                                {getDriverIcon(manifest, 26)}
                            </span>
                        );
                    })}
                </div>
            }
            title={t('connections.empty.title')}
            description={t('connections.empty.hint')}
            actions={
                <>
                    <Button icon={<Plus size={16} />} onClick={onAddConnection}>
                        {t('connections.addConnection')}
                    </Button>
                    <Button
                        variant="outline"
                        icon={<FileInput size={16} className="text-secondary" />}
                        onClick={onImport}
                    >
                        {t('connections.empty.import')}
                    </Button>
                </>
            }
            footer={
                <p className="text-sm font-medium text-muted">
                    {t('connections.empty.or')}{' '}
                    <button
                        type="button"
                        onClick={onCreateSqlite}
                        disabled={isCreatingSqlite}
                        className={clsx(
                            'inline-flex items-center gap-1 rounded-sm text-accent hover:underline disabled:opacity-50',
                            FOCUS_RING,
                        )}
                    >
                        {isCreatingSqlite && <Loader2 size={12} className="animate-spin" />}
                        {t('connections.empty.createSqlite')}
                    </button>
                </p>
            }
        />
    );
}
