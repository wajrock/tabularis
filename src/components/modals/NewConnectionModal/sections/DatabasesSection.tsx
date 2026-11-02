import {useTranslation} from 'react-i18next';
import {AlertCircle, Loader2, Database, RefreshCw} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Checkbox} from '@/components/ui/Checkbox';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {SearchBar} from '@/components/ui/SearchBar';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {DefaultDatabaseSelect} from '@/components/modals/NewConnectionModal/fields/DefaultDatabaseSelect';
import {useConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';

type DatabaseMode = 'all' | 'choose';

export function DatabasesSection() {
    const {t} = useTranslation();
    const {
        formData,
        selectedDatabasesState,
        setSelectedDatabasesState,
        loadAllDatabases,
        setLoadAllDatabases,
        dbSearchQuery,
        setDbSearchQuery,
        availableDatabases,
        loadingDatabases,
        databaseLoadError,
        databasesTabError,
        setDatabasesTabError,
        loadDatabases,
    } = useConnectionFormContext();

    const filteredDbs = availableDatabases.filter((db) =>
        db.toLowerCase().includes(dbSearchQuery.toLowerCase()),
    );
    const allFilteredSelected = filteredDbs.every((db) => selectedDatabasesState.includes(db));

    const toggleAllFiltered = () => {
        if (allFilteredSelected) {
            setSelectedDatabasesState((prev) => prev.filter((db) => !filteredDbs.includes(db)));
        } else {
            setSelectedDatabasesState((prev) => Array.from(new Set([...prev, ...filteredDbs])));
            if (databasesTabError) setDatabasesTabError(false);
        }
    };

    const toggleDatabase = (db: string, selected: boolean) => {
        setSelectedDatabasesState((prev) =>
            selected ? [...prev, db] : prev.filter((d) => d !== db),
        );
        if (databasesTabError && selected) setDatabasesTabError(false);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Mode: automatic (all databases) vs explicit selection */}
            <div className="flex flex-col gap-2">
                <SegmentedControl<DatabaseMode>
                    ariaLabel={t('newConnection.selectDatabases')}
                    value={loadAllDatabases ? 'all' : 'choose'}
                    onChange={(mode) => {
                        setLoadAllDatabases(mode === 'all');
                        if (mode === 'all') setDatabasesTabError(false);
                    }}
                    options={[
                        {
                            value: 'all',
                            label: t('newConnection.allDatabases', {
                                defaultValue: 'All databases',
                            }),
                        },
                        {
                            value: 'choose',
                            label: t('newConnection.chooseDatabases', {
                                defaultValue: 'Choose databases',
                            }),
                        },
                    ]}
                />
                <p className="text-xs text-muted">
                    {loadAllDatabases
                        ? t('newConnection.allDatabasesHint', {
                              defaultValue:
                                  'Every database on the server is loaded automatically when connecting. Databases created or dropped on the server show up on their own — no need to edit this connection.',
                          })
                        : t('newConnection.selectDatabasesHint', {
                              defaultValue: 'Select the databases to include in this connection.',
                          })}
                </p>
            </div>

            {!loadAllDatabases && (
                <>
                    {/* Search the loaded list, or (re)load it from the server */}
                    <div className="flex items-center gap-2">
                        {availableDatabases.length > 0 && (
                            <SearchBar
                                value={dbSearchQuery}
                                onChange={setDbSearchQuery}
                                placeholder={t('common.search')}
                                className="flex-1"
                            />
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void loadDatabases()}
                            disabled={loadingDatabases || !formData.host}
                            icon={
                                loadingDatabases ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={14} />
                                )
                            }
                        >
                            {loadingDatabases
                                ? t('newConnection.loadingDatabases')
                                : t('newConnection.loadDatabases')}
                        </Button>
                    </div>

                    {databaseLoadError && (
                        <InlineBanner tone="red" role="alert" icon={<AlertCircle size={14} />}>
                            {databaseLoadError}
                        </InlineBanner>
                    )}

                    {availableDatabases.length > 0 ? (
                        <div className="overflow-hidden rounded-md border border-default">
                            {/* List header: selection count and select all */}
                            <div className="flex h-9 items-center justify-between gap-3 border-b border-default px-3 text-xs">
                                <span className="text-muted">
                                    {selectedDatabasesState.length > 0
                                        ? t('newConnection.selectedDatabases', {
                                              count: selectedDatabasesState.length,
                                          })
                                        : t('newConnection.noDatabasesSelected')}
                                </span>
                                {filteredDbs.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={toggleAllFiltered}
                                        className="shrink-0 rounded-sm font-medium text-accent hover:underline"
                                    >
                                        {allFilteredSelected
                                            ? t('sidebar.deselectAll')
                                            : t('sidebar.selectAll')}
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto py-1">
                                {filteredDbs.map((db) => (
                                    <Checkbox
                                        key={db}
                                        checked={selectedDatabasesState.includes(db)}
                                        onChange={(checked) => toggleDatabase(db, checked)}
                                        label={<span className="truncate font-normal">{db}</span>}
                                        className="w-full px-3 py-1.5 hover:bg-surface-hover"
                                    />
                                ))}
                                {filteredDbs.length === 0 && (
                                    <p className="px-3 py-4 text-center text-xs text-muted">
                                        {t('newConnection.noDatabasesFound')}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-strong py-8 text-center">
                            <Database size={20} className="text-muted" />
                            <p className="text-xs text-muted">
                                {t('newConnection.loadDatabasesHint', {
                                    defaultValue:
                                        'Click Load Databases to fetch available databases.',
                                })}
                            </p>
                        </div>
                    )}

                    {selectedDatabasesState.length > 0 && (
                        <DefaultDatabaseSelect
                            databases={selectedDatabasesState}
                            onChange={setSelectedDatabasesState}
                        />
                    )}
                </>
            )}
        </div>
    );
}
