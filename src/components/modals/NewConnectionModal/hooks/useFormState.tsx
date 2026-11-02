import {useState, useMemo, useCallback, useRef, useId} from 'react';
import {useTranslation} from 'react-i18next';
import {invoke} from '@tauri-apps/api/core';
import {type ConnectionAppearance} from '@/contexts/DatabaseContext';
import {type ProxyOverride} from '@/types/proxy';
import {useAlert} from '@/hooks/useAlert';
import {useDrivers} from '@/hooks/useDrivers';
import {useSettings} from '@/hooks/useSettings';
import {useLatestAsync} from '@/hooks/useLatestAsync';
import {
    isMultiDatabaseCapable,
    isSchemaBasedMultiDbCapable,
    hasOptedIntoDatabaseSelection,
} from '@/utils/database';
import {isLocalDriver} from '@/utils/driverCapabilities';
import {type ClassifiedConnectionError} from '@/utils/connectionErrors';
import {type ConnectionTestLogEntry} from '@/utils/connectionTest';
import {getDriverIcon, isUrlIcon} from '@/utils/driverUI';
import {uriPassthroughEnabled} from '@/utils/connectionStringParser';
import {useConnectionCatalogue} from '@/hooks/useConnectionCatalogue';
import {type EngineGroup} from '@/utils/connectionCatalogue';
import {type ConnectionParams, paradigmAccent} from '@/components/modals/NewConnectionModal/types';
import {type NewConnectionModalProps} from '@/components/modals/NewConnectionModal/types';

/** Form fields, wizard step, selected driver and action status shared by every section. */
export function useFormState({
    isOpen,
    onClose,
    onSave,
    initialConnection,
}: NewConnectionModalProps) {
    const {t} = useTranslation();
    const {showAlert} = useAlert();
    const sslModeSelectId = useId();
    const sslModeHintId = useId();
    const {drivers, refresh: refreshDrivers} = useDrivers();
    const {settings, updateSetting} = useSettings();
    const {invalidate: invalidateK8sAsync, run: runK8sAsync} = useLatestAsync();
    const {run: runSsmAsync} = useLatestAsync();

    // ── wizard step ──
    const isEditing = Boolean(initialConnection);
    const [step, setStep] = useState<'catalogue' | 'form'>(isEditing ? 'form' : 'catalogue');
    const [pendingGroup, setPendingGroup] = useState<EngineGroup | null>(null);
    const catalogue = useConnectionCatalogue();

    // ── form state ──
    const [driver, setDriver] = useState<string>('mysql');
    const activeDriver = drivers.find((d) => d.id === driver) ?? drivers[0];
    const isLocalPathDriver = isLocalDriver(activeDriver?.capabilities);
    // Capability-driven, not driver-id-driven: a driver whose manifest EXPLICITLY
    // declares the postgres SQL dialect (builtin "postgres" or a plugin like
    // "postgresql") gets Postgres-style SSL mode options. Deliberately requires
    // an explicit declaration rather than falling back to the schema's default
    // (unlike identifier quoting / statement splitting elsewhere) — most shipped
    // plugins omit `sql_dialect` entirely, and defaulting them into the
    // Postgres SSL branch would silently change behavior for drivers unrelated
    // to this fix (e.g. the Oracle plugin, which sets supports_ssl but declares
    // no dialect).
    const isPostgresDialect = activeDriver?.capabilities?.sql_dialect === 'postgres';

    // ── driver install state ──
    const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'error'>('idle');
    const [installError, setInstallError] = useState<string | undefined>();

    const installDriver = async (slug: string, version: string): Promise<boolean> => {
        setInstallStatus('installing');
        setInstallError(undefined);
        try {
            await invoke('install_plugin', {pluginId: slug, version});
            // install_plugin hot-registers the driver, but the connection modal only
            // surfaces external drivers that are in `activeExternalDrivers`. Installing
            // from the catalogue is an explicit opt-in, so activate it — otherwise the
            // freshly-installed driver is filtered out and selection falls back to a
            // built-in (mysql).
            await updateSetting(
                'activeExternalDrivers',
                Array.from(new Set([...(settings.activeExternalDrivers ?? []), slug])),
            );
            catalogue.refresh();
            refreshDrivers();
            setInstallStatus('idle');
            return true;
        } catch (e) {
            setInstallStatus('error');
            setInstallError(
                typeof e === 'string' ? e : e instanceof Error ? e.message : JSON.stringify(e),
            );
            return false;
        }
    };

    const activeCatalogueDriver =
        catalogue.groups.flatMap((g) => g.drivers).find((d) => d.slug === driver) ?? null;
    const activeDriverNotInstalled =
        activeCatalogueDriver != null && !activeCatalogueDriver.installed;

    // Accent + glyph for the active driver, preferring the registry's icon URL
    // (the real plugin logo) and falling back to the built-in driver glyph.
    const driverAccent =
        activeCatalogueDriver?.color || paradigmAccent(activeCatalogueDriver?.paradigms?.[0] ?? '');
    const renderDriverGlyph = (size: number) => {
        const icon = activeCatalogueDriver?.icon ?? activeDriver?.icon ?? '';
        if (isUrlIcon(icon)) {
            return (
                <img
                    src={icon}
                    alt=""
                    className="h-full w-full rounded-[inherit] object-contain p-1.5"
                />
            );
        }
        return getDriverIcon(activeDriver, size);
    };
    const [name, setName] = useState('');
    const [formData, setFormData] = useState<Partial<ConnectionParams>>({
        host: 'localhost',
        port: 3306,
        username: '',
        database: '',
        ssl_mode: '',
        ssh_enabled: false,
        ssh_port: 22,
        k8s_enabled: false,
        // New connections store secrets in the keychain. An edit starts from the
        // saved flag so a slow credential load cannot flip an existing connection.
        save_in_keychain: initialConnection
            ? (initialConnection.params.save_in_keychain ?? false)
            : true,
    });
    const [selectedDatabasesState, setSelectedDatabasesState] = useState<string[]>([]);
    // Multi-db drivers: true = no explicit selection, every database on the
    // server is loaded automatically at connect (persisted as an empty
    // database param). Default for new connections.
    const [loadAllDatabases, setLoadAllDatabases] = useState(true);
    // Whether the user has explicitly opted a schema-based driver (PostgreSQL)
    // into multi-database browsing. Starts false for new connections so the
    // Database field shows and the Databases tab is hidden by default — a new
    // PG connection stays single-database unless the user checks the opt-in.
    // Set from the saved connection's opt-in signal on edit load. Flat multi-db
    // drivers (MySQL) ignore this — they have no single-database mode.
    const [optedIntoSchemaMultiDb, setOptedIntoSchemaMultiDb] = useState(false);
    const [dbSearchQuery, setDbSearchQuery] = useState('');
    const [detectJsonInTextColumns, setDetectJsonInTextColumns] = useState(false);
    const [passwordDirty, setPasswordDirty] = useState(false);
    const [sshPasswordDirty, setSshPasswordDirty] = useState(false);
    const [pluginSecretChanges, setPluginSecretChanges] = useState<Record<string, string | null>>(
        {},
    );
    // ── tab ──
    const [activeTab, setActiveTab] = useState<
        | 'general'
        | 'databases'
        | 'ssh'
        | 'ssl'
        | 'k8s'
        | 'ssm'
        | 'advanced'
        | 'appearance'
        | 'privacy'
    >('general');

    // Proxy override as edited, possibly incomplete; tied to the connection it was typed for.
    const [proxyDraft, setProxyDraft] = useState<{
        connectionId: string | undefined;
        value: ProxyOverride;
    } | null>(null);

    // ── connection test ──
    const [status, setStatus] = useState<'idle' | 'testing' | 'saving' | 'success' | 'error'>(
        'idle',
    );
    const [message, setMessage] = useState('');
    const [errorFeedback, setErrorFeedback] = useState<ClassifiedConnectionError | null>(null);
    const [testLog, setTestLog] = useState<ConnectionTestLogEntry[]>([]);
    const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
    const testProgressIdRef = useRef<string | null>(null);
    const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
    const [isActionPending, setIsActionPending] = useState(false);
    const [isPersistencePending, setIsPersistencePending] = useState(false);
    const [isCreatingSqliteFile, setIsCreatingSqliteFile] = useState(false);
    const actionSequenceRef = useRef(0);
    const activeActionRef = useRef<number | null>(null);
    const persistenceActionRef = useRef<number | null>(null);
    const initSequenceRef = useRef(0);

    const beginFormAction = useCallback((): number | null => {
        if (activeActionRef.current !== null || persistenceActionRef.current !== null) {
            return null;
        }

        const actionId = ++actionSequenceRef.current;
        activeActionRef.current = actionId;
        setIsActionPending(true);
        return actionId;
    }, []);

    const finishFormAction = useCallback((actionId: number) => {
        if (activeActionRef.current !== actionId) return;
        activeActionRef.current = null;
        setIsActionPending(false);
    }, []);

    // ── validation errors ──
    const [nameError, setNameError] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [databasesTabError, setDatabasesTabError] = useState(false);

    // ── appearance ──
    const [appearance, setAppearance] = useState<ConnectionAppearance>(
        initialConnection?.appearance ?? {},
    );

    // ── tags ──
    const [tagIds, setTagIds] = useState<string[]>(initialConnection?.tag_ids ?? []);

    // ── environment ── ("" = unclassified)
    const [environment, setEnvironment] = useState<string>(initialConnection?.environment ?? '');
    // Stable UUID used as connectionId for icon uploads on new connections.
    // The backend mints its own id on save_connection, so we use this temp id
    // for the icon filename. After save, set_connection_appearance persists the
    // appearance (including the icon path which refs this temp id) under the
    // real connection id. Because cascade_delete_if_image uses the stored path
    // directly, cleanup works correctly despite the temp-id prefix in the filename.
    const generatedId = useMemo(() => crypto.randomUUID(), []);
    const effectiveConnectionId = initialConnection?.id ?? generatedId;

    // ── capabilities ──
    const noConnectionRequired = activeDriver?.capabilities?.no_connection_required === true;
    // A raw URI is self-contained: it carries the database (or deliberately omits
    // it, as Atlas URIs do) and the credentials, so it replaces those form fields.
    const hasConnectionUri = !!formData.connection_uri?.trim();
    // Drivers with the `connection_uri` capability consume the raw URI verbatim:
    // host/port/username/database all derive from it, so the form only asks for
    // the connection string and an optional token (password) field.
    const isUriPassthrough = uriPassthroughEnabled(activeDriver?.capabilities);
    const isNetworkDriver =
        !noConnectionRequired &&
        activeDriver?.capabilities?.file_based === false &&
        !activeDriver?.capabilities?.folder_based;
    const isFlatMultiDbDriver = isMultiDatabaseCapable(activeDriver?.capabilities);
    const schemaBasedMultiDbCapable = isSchemaBasedMultiDbCapable(activeDriver?.capabilities);
    // Whether the connection has actually opted into database-selection browsing,
    // not just whether the driver is *capable* of it. A traditional single-DB
    // PostgreSQL connection (plain string database) has the capability but has
    // NOT opted in — its save should keep the plain string, and the "Select at
    // least one database" validation must not fire for it.
    //
    // Flat multi-db drivers (MySQL) have no single-database mode, so capability
    // alone is the gate. Schema-based drivers (PostgreSQL) use the explicit
    // opt-in checkbox state — NOT the database param — because the empty-string
    // default of a new/edited form is indistinguishable from the persisted "all
    // databases" signal, so the form must not infer opt-in from formData.database
    // alone.
    const isOptedInMultiDb =
        isFlatMultiDbDriver ||
        (schemaBasedMultiDbCapable
            ? optedIntoSchemaMultiDb
            : hasOptedIntoDatabaseSelection(activeDriver?.capabilities, formData.database ?? ''));
    // Flat single-database store (e.g. Meilisearch): no database to select or name.
    const singleDatabase = activeDriver?.capabilities?.single_database === true;
    const hostField = activeDriver?.connection_fields?.host;
    const portField = activeDriver?.connection_fields?.port;
    const usernameField = activeDriver?.connection_fields?.username;
    const passwordField = activeDriver?.connection_fields?.password;
    const databaseField = activeDriver?.connection_fields?.database;

    const updateField = <K extends keyof ConnectionParams>(
        field: K,
        value: ConnectionParams[K],
    ) => {
        setFormData((prev) => ({...prev, [field]: value}));
    };

    return {
        isOpen,
        onClose,
        onSave,
        initialConnection,
        t,
        showAlert,
        sslModeSelectId,
        sslModeHintId,
        drivers,
        refreshDrivers,
        settings,
        updateSetting,
        invalidateK8sAsync,
        runK8sAsync,
        runSsmAsync,
        isEditing,
        step,
        setStep,
        pendingGroup,
        setPendingGroup,
        catalogue,
        driver,
        setDriver,
        activeDriver,
        isLocalPathDriver,
        isPostgresDialect,
        installStatus,
        setInstallStatus,
        installError,
        setInstallError,
        installDriver,
        activeCatalogueDriver,
        activeDriverNotInstalled,
        driverAccent,
        renderDriverGlyph,
        name,
        setName,
        formData,
        setFormData,
        selectedDatabasesState,
        setSelectedDatabasesState,
        loadAllDatabases,
        setLoadAllDatabases,
        optedIntoSchemaMultiDb,
        setOptedIntoSchemaMultiDb,
        dbSearchQuery,
        setDbSearchQuery,
        detectJsonInTextColumns,
        setDetectJsonInTextColumns,
        passwordDirty,
        setPasswordDirty,
        sshPasswordDirty,
        setSshPasswordDirty,
        pluginSecretChanges,
        setPluginSecretChanges,
        activeTab,
        setActiveTab,
        proxyDraft,
        setProxyDraft,
        status,
        setStatus,
        message,
        setMessage,
        errorFeedback,
        setErrorFeedback,
        testLog,
        setTestLog,
        isDiagnosticsOpen,
        setIsDiagnosticsOpen,
        testProgressIdRef,
        testResult,
        setTestResult,
        isActionPending,
        setIsActionPending,
        isPersistencePending,
        setIsPersistencePending,
        isCreatingSqliteFile,
        setIsCreatingSqliteFile,
        actionSequenceRef,
        activeActionRef,
        persistenceActionRef,
        initSequenceRef,
        beginFormAction,
        finishFormAction,
        nameError,
        setNameError,
        nameInputRef,
        databasesTabError,
        setDatabasesTabError,
        appearance,
        setAppearance,
        tagIds,
        setTagIds,
        environment,
        setEnvironment,
        generatedId,
        effectiveConnectionId,
        noConnectionRequired,
        hasConnectionUri,
        isUriPassthrough,
        isNetworkDriver,
        isFlatMultiDbDriver,
        schemaBasedMultiDbCapable,
        isOptedInMultiDb,
        singleDatabase,
        hostField,
        portField,
        usernameField,
        passwordField,
        databaseField,
        updateField,
    };
}

export type FormState = ReturnType<typeof useFormState>;
