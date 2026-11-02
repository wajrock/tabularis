import {useTranslation} from 'react-i18next';
import {
    Check,
    AlertCircle,
    Loader2,
    Database,
    FolderOpen,
    MemoryStick,
    Plus,
    X,
} from 'lucide-react';
import {EnvironmentSelect} from '@/components/modals/NewConnectionModal/fields/EnvironmentSelect';
import {open} from '@tauri-apps/plugin-dialog';
import clsx from 'clsx';
import {Select} from '@/components/ui/Select';
import {SlotAnchor} from '@/components/ui/SlotAnchor';
import {Field} from '@/components/ui/Field';
import {Button} from '@/components/ui/Button';
import {Checkbox} from '@/components/ui/Checkbox';
import {Input, InputAction} from '@/components/ui/Input';
import {sanitizeLocalFilePath} from '@/utils/fsPath';
import {IN_MEMORY_DATABASE, supportsInMemoryDatabase} from '@/utils/driverCapabilities';
import {FieldInput} from '@/components/modals/NewConnectionModal/fields/FieldInput';
import {useConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';

export function GeneralSection() {
    const {t} = useTranslation();
    const {
        initialConnection,

        driver,
        activeDriver,
        isPostgresDialect,
        driverAccent,
        renderDriverGlyph,
        name,
        setName,
        formData,
        setFormData,
        setSelectedDatabasesState,
        setLoadAllDatabases,
        optedIntoSchemaMultiDb,
        setOptedIntoSchemaMultiDb,
        detectJsonInTextColumns,
        setDetectJsonInTextColumns,
        passwordDirty,
        setPasswordDirty,
        connectionString,
        connectionStringError,
        setActiveTab,
        availableDatabases,
        loadingDatabases,
        databaseLoadError,
        isActionPending,
        isCreatingSqliteFile,
        nameError,
        setNameError,
        nameInputRef,
        environment,
        setEnvironment,
        noConnectionRequired,
        isUriPassthrough,
        connectionStringEnabled,
        connectionStringPlaceholder,
        schemaBasedMultiDbCapable,
        isOptedInMultiDb,
        connectionStringExamples,
        selectedConnectionStringExample,
        singleDatabase,
        hostField,
        portField,
        usernameField,
        passwordField,
        databaseField,
        dbFieldSlotContext,
        hasConnectionContentSlot,
        credentialFieldsHidden,
        extraFieldsSlotContext,
        updateField,
        handleCreateSqliteFile,
        loadDatabases,
        handleConnectionStringChange,
        handleClearConnectionString,
    } = useConnectionFormContext();
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-[1fr_180px] gap-3">
                <Field label={t('newConnection.name')}>
                    <Input
                        ref={nameInputRef}
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (nameError) setNameError(false);
                        }}
                        placeholder={t('newConnection.namePlaceholder')}
                        aria-invalid={nameError || undefined}
                        autoFocus
                    />
                </Field>
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-secondary">
                        {t('environment.label')}
                    </span>
                    <EnvironmentSelect value={environment} onChange={setEnvironment} />
                </div>
            </div>
            {/* API-based: no connection form needed — plugin may provide custom content via slot */}
            {noConnectionRequired ? (
                hasConnectionContentSlot ? (
                    <SlotAnchor
                        name="connection-modal.connection_content"
                        context={dbFieldSlotContext}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-strong bg-base/40 px-6 py-10 text-center">
                        <span
                            className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl shadow-sm"
                            style={{backgroundColor: `${driverAccent}1f`, color: driverAccent}}
                        >
                            {renderDriverGlyph(24)}
                        </span>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-primary">
                                {t('newConnection.noConnectionDetailsTitle', {
                                    defaultValue: 'No connection details needed',
                                })}
                            </p>
                            <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted">
                                {t('newConnection.noConnectionDetailsBody', {
                                    driver: activeDriver?.name ?? driver,
                                    defaultValue:
                                        '{{driver}} connects without a host or port. Just give this connection a name and save it. Driver-specific options live in Settings → Plugins.',
                                })}
                            </p>
                        </div>
                    </div>
                )
            ) : activeDriver?.capabilities?.file_based === true ||
              activeDriver?.capabilities?.folder_based === true ? (
                <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-secondary">
                        {activeDriver.capabilities.folder_based
                            ? t('newConnection.folderPath')
                            : t('newConnection.filePath')}
                    </span>
                    <div className="flex gap-2">
                        <Input
                            value={typeof formData.database === 'string' ? formData.database : ''}
                            onChange={(e) => updateField('database', e.target.value)}
                            onBlur={(e) => {
                                const cleaned = sanitizeLocalFilePath(e.target.value);
                                if (cleaned !== e.target.value) {
                                    updateField('database', cleaned);
                                }
                            }}
                            aria-label={
                                activeDriver.capabilities.folder_based
                                    ? t('newConnection.folderPath')
                                    : t('newConnection.filePath')
                            }
                            placeholder={
                                activeDriver.capabilities.folder_based
                                    ? t('newConnection.folderPathPlaceholder')
                                    : t('newConnection.filePathPlaceholder')
                            }
                            containerClassName="flex-1"
                            trailing={
                                <InputAction
                                    label={
                                        activeDriver.capabilities.folder_based
                                            ? t('newConnection.browseFolder')
                                            : t('newConnection.browseFile')
                                    }
                                    onClick={async () => {
                                        const selected = await open({
                                            multiple: false,
                                            directory: activeDriver.capabilities.folder_based,
                                        });
                                        if (selected) updateField('database', selected);
                                    }}
                                >
                                    <FolderOpen size={14} />
                                </InputAction>
                            }
                        />
                        {supportsInMemoryDatabase(activeDriver.capabilities) && (
                            <Button
                                variant={
                                    formData.database === IN_MEMORY_DATABASE ? 'tinted' : 'outline'
                                }
                                className="h-8"
                                icon={<MemoryStick size={14} />}
                                onClick={() => updateField('database', IN_MEMORY_DATABASE)}
                                aria-pressed={formData.database === IN_MEMORY_DATABASE}
                                title={t('newConnection.inMemoryDatabaseHint')}
                            >
                                {t('newConnection.inMemoryDatabase')}
                            </Button>
                        )}
                        {driver === 'sqlite' && activeDriver.capabilities.file_based === true && (
                            <Button
                                variant="outline"
                                className="h-8"
                                icon={
                                    isCreatingSqliteFile ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Plus size={14} />
                                    )
                                }
                                onClick={() => void handleCreateSqliteFile()}
                                disabled={isActionPending}
                                title={t('connections.newSqliteDatabase.dialogTitle')}
                            >
                                {t('newConnection.createSqliteFile')}
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    {connectionStringEnabled && (
                        <div className="flex flex-col gap-1.5">
                            <Field
                                label={t('newConnection.connectionString', {
                                    defaultValue: 'Connection String',
                                })}
                                error={connectionStringError || undefined}
                            >
                                <Input
                                    value={connectionString}
                                    onChange={(e) => handleConnectionStringChange(e.target.value)}
                                    aria-invalid={!!connectionStringError || undefined}
                                    placeholder={connectionStringPlaceholder}
                                    className={connectionString ? 'pr-14' : undefined}
                                    // Always set (even empty) so the field is not remounted on the first keystroke.
                                    trailing={
                                        connectionString && (
                                            <>
                                                {!connectionStringError && (
                                                    <Check
                                                        size={14}
                                                        className="mx-1 text-tint-success-fg"
                                                        aria-label={t(
                                                            'newConnection.connectionStringValid',
                                                            {
                                                                defaultValue:
                                                                    'Valid connection string',
                                                            },
                                                        )}
                                                    />
                                                )}
                                                <InputAction
                                                    label={t('common.clear', {
                                                        defaultValue: 'Clear',
                                                    })}
                                                    onClick={handleClearConnectionString}
                                                >
                                                    <X size={14} />
                                                </InputAction>
                                            </>
                                        )
                                    }
                                />
                            </Field>
                            {connectionStringExamples.length > 0 && (
                                <>
                                    <Select
                                        ariaLabel={t('newConnection.connectionStringExample', {
                                            defaultValue: 'Connection string example',
                                        })}
                                        value={selectedConnectionStringExample?.value ?? null}
                                        options={connectionStringExamples.map(
                                            (example) => example.value,
                                        )}
                                        labels={Object.fromEntries(
                                            connectionStringExamples.map((example) => [
                                                example.value,
                                                example.label,
                                            ]),
                                        )}
                                        onChange={handleConnectionStringChange}
                                        placeholder={t(
                                            'newConnection.chooseConnectionStringExample',
                                            {
                                                defaultValue: 'Choose an example',
                                            },
                                        )}
                                        searchable={false}
                                    />
                                    {selectedConnectionStringExample?.description && (
                                        <p className="text-xs text-secondary">
                                            {selectedConnectionStringExample.description}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {!isUriPassthrough && (!hostField?.hidden || !portField?.hidden) && (
                        <div
                            className={clsx(
                                'grid gap-3',
                                !hostField?.hidden && !portField?.hidden
                                    ? isPostgresDialect
                                        ? 'grid-cols-4'
                                        : 'grid-cols-3'
                                    : 'grid-cols-1',
                            )}
                        >
                            {!hostField?.hidden && (
                                <FieldInput
                                    className={!portField?.hidden ? 'col-span-2' : undefined}
                                    label={hostField?.label ?? t('newConnection.host')}
                                    value={formData.host}
                                    onChange={(v) => updateField('host', v)}
                                    placeholder={hostField?.placeholder ?? 'localhost'}
                                />
                            )}
                            {!portField?.hidden && (
                                <FieldInput
                                    label={portField?.label ?? t('newConnection.port')}
                                    value={formData.port}
                                    onChange={(v) =>
                                        updateField('port', v === '' ? undefined : Number(v))
                                    }
                                    type="number"
                                    placeholder={
                                        portField?.placeholder ??
                                        (driver === 'mysql' ? '3306' : '5432')
                                    }
                                />
                            )}
                        </div>
                    )}

                    {/* Plugin-owned extra connection fields (opaque `extra` map) */}
                    <SlotAnchor
                        name="connection-modal.extra_fields"
                        context={extraFieldsSlotContext}
                        className="flex flex-col gap-3"
                    />

                    {/* User + Password (a plugin may hide them via the extra_fields
              slot or per field through its manifest `connection_fields`) */}
                    {!credentialFieldsHidden &&
                        (!passwordField?.hidden ||
                            (!isUriPassthrough && !usernameField?.hidden)) && (
                            <div
                                className={clsx(
                                    'grid gap-3',
                                    !passwordField?.hidden &&
                                        !isUriPassthrough &&
                                        !usernameField?.hidden
                                        ? 'grid-cols-2'
                                        : 'grid-cols-1',
                                )}
                            >
                                {!isUriPassthrough && !usernameField?.hidden && (
                                    <FieldInput
                                        label={usernameField?.label ?? t('newConnection.username')}
                                        value={formData.username}
                                        onChange={(v) => updateField('username', v)}
                                        placeholder={
                                            usernameField?.placeholder ??
                                            t('newConnection.usernamePlaceholder')
                                        }
                                    />
                                )}
                                {!passwordField?.hidden && (
                                    <FieldInput
                                        label={passwordField?.label ?? t('newConnection.password')}
                                        value={formData.password}
                                        onChange={(v) => {
                                            setPasswordDirty(true);
                                            updateField('password', v);
                                        }}
                                        type="password"
                                        placeholder={
                                            initialConnection &&
                                            !passwordDirty &&
                                            !formData.password
                                                ? '••••••••'
                                                : (passwordField?.placeholder ??
                                                  t('newConnection.passwordPlaceholder'))
                                        }
                                    />
                                )}
                            </div>
                        )}

                    {/* Database (single) — shown unless the connection has opted into
              multi-database selection (flat drivers are always opted in) or
              the plugin hides it through its manifest `connection_fields` */}
                    {!isUriPassthrough &&
                        !isOptedInMultiDb &&
                        !singleDatabase &&
                        !databaseField?.hidden && (
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-secondary">
                                        {databaseField?.label ?? t('newConnection.dbName')}
                                    </span>
                                    {!hostField?.hidden && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void loadDatabases();
                                            }}
                                            disabled={loadingDatabases || !formData.host}
                                            className="flex items-center gap-1 text-xs text-accent disabled:text-muted disabled:cursor-not-allowed transition-colors"
                                        >
                                            {loadingDatabases ? (
                                                <Loader2 size={11} className="animate-spin" />
                                            ) : (
                                                <Database size={11} />
                                            )}
                                            {loadingDatabases
                                                ? t('newConnection.loadingDatabases')
                                                : t('newConnection.loadDatabases')}
                                        </button>
                                    )}
                                </div>
                                {availableDatabases.length > 0 ? (
                                    <Select
                                        value={
                                            typeof formData.database === 'string'
                                                ? formData.database || null
                                                : null
                                        }
                                        options={availableDatabases}
                                        onChange={(val) => updateField('database', val)}
                                        placeholder={t('newConnection.selectDatabase')}
                                        searchPlaceholder={t('common.search')}
                                        noResultsLabel={t('newConnection.noDatabasesFound')}
                                    />
                                ) : (
                                    <Input
                                        value={
                                            typeof formData.database === 'string'
                                                ? formData.database
                                                : ''
                                        }
                                        onChange={(e) => updateField('database', e.target.value)}
                                        aria-label={
                                            databaseField?.label ?? t('newConnection.dbName')
                                        }
                                        placeholder={
                                            databaseField?.placeholder ??
                                            t('newConnection.dbNamePlaceholder')
                                        }
                                    />
                                )}
                                {databaseLoadError && (
                                    <div className="flex items-center gap-1 text-xs text-accent-error mt-0.5">
                                        <AlertCircle size={11} /> {databaseLoadError}
                                    </div>
                                )}
                            </div>
                        )}

                    {/* Schema-based multi-database opt-in (PostgreSQL): browse multiple
              databases on one connection. Off by default so new and existing
              single-database connections keep the traditional single Database
              field and no Databases tab. Checking it switches to multi-database
              mode. */}
                    {schemaBasedMultiDbCapable && !isUriPassthrough && (
                        <Checkbox
                            checked={optedIntoSchemaMultiDb}
                            label={t('newConnection.browseMultipleDatabases')}
                            onChange={(checked) => {
                                setOptedIntoSchemaMultiDb(checked);
                                if (checked) {
                                    // Entering multi-database mode: clear the single database
                                    // field so the save path persists the opt-in signal (empty
                                    // string = "all databases"), default to all-databases mode,
                                    // and jump to the Databases tab.
                                    setFormData((prev) => ({...prev, database: ''}));
                                    setSelectedDatabasesState([]);
                                    setLoadAllDatabases(true);
                                    setActiveTab('databases');
                                } else {
                                    // Leaving multi-database mode: restore a blank single
                                    // database field so the user can type the one database.
                                    setFormData((prev) => ({...prev, database: ''}));
                                    setSelectedDatabasesState([]);
                                }
                            }}
                        />
                    )}

                    {/* Keychain */}
                    <Checkbox
                        checked={!!formData.save_in_keychain}
                        onChange={(checked) => updateField('save_in_keychain', checked)}
                        label={t('newConnection.saveKeychain')}
                        description={
                            !formData.save_in_keychain && (
                                <span className="text-tint-warning-fg">
                                    {t('newConnection.secretsStoredInPlainText')}
                                </span>
                            )
                        }
                    />
                </>
            )}

            {/* Detect JSON in text columns (per-connection opt-in) */}
            <label className="flex cursor-pointer select-none items-start gap-2">
                <input
                    type="checkbox"
                    checked={detectJsonInTextColumns}
                    onChange={(e) => setDetectJsonInTextColumns(e.target.checked)}
                    className="mt-[2px] h-3.5 w-3.5 shrink-0 rounded accent-accent-primary"
                />
                <span className="text-xs leading-[18px] text-muted">
                    <span className="font-medium text-primary">
                        {t('settings.detectJsonInTextColumns')}
                    </span>
                    {'. '}
                    {t('settings.detectJsonInTextColumnsDesc')}
                </span>
            </label>
        </div>
    );
}
