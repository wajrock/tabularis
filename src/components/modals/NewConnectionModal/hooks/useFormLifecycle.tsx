import {useEffect} from 'react';
import {loadSshConnections} from '@/utils/ssh';
import {loadK8sConnections, type K8sCommandOptions} from '@/utils/k8s';
import {hasOptedIntoDatabaseSelection} from '@/utils/database';
import {fetchConnectionWithCredentials} from '@/utils/credentials';
import {
    resolveEngineSelection,
    type EngineGroup,
    type CatalogueDriver,
} from '@/utils/connectionCatalogue';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import type {PluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';
import type {SshTunnel} from '@/components/modals/NewConnectionModal/hooks/useSshTunnel';
import type {Kubernetes} from '@/components/modals/NewConnectionModal/hooks/useKubernetes';
import type {SsmTunnel} from '@/components/modals/NewConnectionModal/hooks/useSsmTunnel';
import type {FormActions} from '@/components/modals/NewConnectionModal/hooks/useFormActions';
import type {DatabaseList} from '@/components/modals/NewConnectionModal/hooks/useDatabaseList';
import type {ConnectionStringImport} from '@/components/modals/NewConnectionModal/hooks/useConnectionString';
import type {IconImageCleanup} from '@/components/modals/NewConnectionModal/hooks/useIconImageCleanup';

/** Opening the modal: loading the edited connection, choosing and changing the driver. */
export function useFormLifecycle(
    form: FormState &
        PluginSlots &
        SshTunnel &
        Kubernetes &
        SsmTunnel &
        FormActions &
        DatabaseList &
        ConnectionStringImport &
        IconImageCleanup,
) {
    const {
        drivers,

        initSequenceRef,
        initializeK8sPathOverrides,
        inlineK8sTestActiveRef,
        inlineK8sTestSequenceRef,
        invalidateInlineK8sTest,
        invalidateK8sAsync,
        invalidateK8sDiscovery,
        invalidateSshTest,
        loadDatabases,
        loadK8sContextsList,
        loadK8sNamespacesList,
        loadK8sResourcePorts,
        loadK8sResourcesList,

        resetK8sPathOverrides,
        setActiveTab,
        setAppearance,
        setAvailableDatabases,
        setConnectionString,
        setConnectionStringError,
        setCredentialFieldsHiddenState,
        setDatabaseLoadError,
        setDatabasesTabError,
        setDbSearchQuery,
        setDetectJsonInTextColumns,
        setDriver,
        setEnvironment,
        setErrorFeedback,
        setFormData,
        setInstallError,
        setInstallStatus,
        setIsDiagnosticsOpen,
        setK8sAutoPort,
        setK8sConnections,
        setK8sContexts,
        setK8sDiscoveryErrors,
        setK8sMode,
        setK8sNamespaces,
        setK8sPathActionError,
        setK8sResources,
        setK8sSelectionError,
        setLoadAllDatabases,
        setLoadingDatabases,
        setMessage,
        setName,
        setNameError,
        setOptedIntoSchemaMultiDb,
        setPasswordDirty,
        setPendingGroup,
        setPluginSecretChanges,
        setSelectedDatabasesState,
        setSshConnections,
        setSshMode,
        setSshPasswordDirty,
        setStatus,
        setStep,
        setTagIds,
        setTestLog,
        setTestResult,
        settings,
        testProgressIdRef,
        updateSetting,
        initialConnection,
        isOpen,
    } = form;
    // ── init form on open ──
    useEffect(() => {
        if (!isOpen) {
            initSequenceRef.current += 1;
            return;
        }
        const initSequence = ++initSequenceRef.current;
        const isCurrentInit = () => initSequenceRef.current === initSequence;
        queueMicrotask(() => {
            if (isCurrentInit()) setLoadingDatabases(false);
        });
        const init = async () => {
            // Reset common state first so it's always clean even if async calls below fail
            setStatus('idle');
            setMessage('');
            setTestResult(null);
            setActiveTab('general');
            setAvailableDatabases([]);
            setDatabaseLoadError(null);
            setPasswordDirty(false);
            setSshPasswordDirty(false);
            setCredentialFieldsHiddenState(false);
            setPluginSecretChanges({});
            setDbSearchQuery('');
            setConnectionString('');
            setConnectionStringError(null);
            setNameError(false);
            setDatabasesTabError(false);
            setPendingGroup(null);
            setInstallStatus('idle');
            setInstallError(undefined);
            setStep(initialConnection ? 'form' : 'catalogue');
            invalidateK8sDiscovery();
            invalidateK8sAsync('new-k8s-test');
            inlineK8sTestSequenceRef.current += 1;
            inlineK8sTestActiveRef.current = false;
            setK8sAutoPort(null);
            setK8sContexts([]);
            setK8sNamespaces([]);
            setK8sResources([]);
            setK8sDiscoveryErrors({contexts: null, namespaces: null, resources: null});
            setK8sPathActionError(null);
            setK8sSelectionError(null);

            if (initialConnection) {
                setName(initialConnection.name);
                setDriver(initialConnection.params.driver);
                setDetectJsonInTextColumns(initialConnection.detect_json_in_text_columns === true);
                setAppearance(initialConnection.appearance ?? {});
                setTagIds(initialConnection.tag_ids ?? []);
                setEnvironment(initialConnection.environment ?? '');
                const db = initialConnection.params.database;
                setSshMode(initialConnection.params.ssh_connection_id ? 'existing' : 'inline');
                let params = initialConnection.params;
                try {
                    const fullConn = await fetchConnectionWithCredentials(initialConnection.id);
                    // A response without params would blank the form, so keep the
                    // secret-less ones instead of overwriting them with nothing.
                    if (fullConn?.params) params = fullConn.params;
                } catch {
                    // fallback: use params without secrets (backend will retrieve from keychain)
                }
                if (!isCurrentInit()) return;

                const isInlineK8s = !params.k8s_connection_id;
                const pathOptions: K8sCommandOptions = isInlineK8s
                    ? {
                          kubectl_path: params.k8s_kubectl_path,
                          kubeconfig_path: params.k8s_kubeconfig_path,
                      }
                    : {};
                const hasK8sPortOverride = params.k8s_port != null;
                const paramsForForm = isInlineK8s
                    ? params
                    : {
                          ...params,
                          k8s_kubectl_path: undefined,
                          k8s_kubeconfig_path: undefined,
                      };
                setK8sMode(isInlineK8s ? 'inline' : 'existing');
                initializeK8sPathOverrides(pathOptions);
                const editDriverForDb = drivers.find(
                    (d) => d.id === initialConnection.params.driver,
                );
                const editIsMultiDb = hasOptedIntoDatabaseSelection(
                    editDriverForDb?.capabilities,
                    db,
                );
                // Sync the schema-based opt-in checkbox to the saved connection's state.
                // hasOptedIntoDatabaseSelection returns true when db is an array or ""
                // (all-databases mode), false for a plain single-database string — so a
                // non-opted-in PG connection shows the Database field, and an opted-in
                // one shows the Databases tab.
                setOptedIntoSchemaMultiDb(editIsMultiDb);
                if (Array.isArray(db)) {
                    setSelectedDatabasesState(db);
                    setLoadAllDatabases(false);
                    setFormData({...paramsForForm, database: db[0] ?? ''});
                } else if (editIsMultiDb && db.trim()) {
                    // A saved single database on a multi-db driver is an explicit
                    // one-element selection.
                    setSelectedDatabasesState([db]);
                    setLoadAllDatabases(false);
                    setFormData({...paramsForForm});
                } else {
                    setSelectedDatabasesState([]);
                    // Empty database on a multi-db driver = "all databases" mode.
                    setLoadAllDatabases(editIsMultiDb);
                    setFormData({...paramsForForm});
                }

                if (params.k8s_enabled && isInlineK8s) {
                    void loadK8sContextsList(pathOptions);
                    if (params.k8s_context) {
                        void loadK8sNamespacesList(params.k8s_context, pathOptions);
                    }
                    if (params.k8s_context && params.k8s_namespace && params.k8s_resource_type) {
                        void loadK8sResourcesList(
                            params.k8s_context,
                            params.k8s_namespace,
                            params.k8s_resource_type,
                            pathOptions,
                        );
                    }
                    if (
                        !hasK8sPortOverride &&
                        params.k8s_context &&
                        params.k8s_namespace &&
                        params.k8s_resource_type === 'service' &&
                        params.k8s_resource_name
                    ) {
                        void loadK8sResourcePorts(
                            params.k8s_context,
                            params.k8s_namespace,
                            params.k8s_resource_type,
                            params.k8s_resource_name,
                            pathOptions,
                        );
                    }
                }

                // Auto-load available databases when editing a multi-db connection
                // with an explicit selection. Skipped in "all databases" mode: there
                // is nothing to preselect, and the fetch can spawn SSH/K8s tunnels as
                // a side effect of merely opening the dialog.
                const editHasExplicitSelection =
                    Array.isArray(db) || (typeof db === 'string' && db.trim() !== '');
                if (editIsMultiDb && editHasExplicitSelection) {
                    void loadDatabases(params, isCurrentInit);
                }
            } else {
                setName('');
                setDriver('mysql');
                setFormData({
                    host: 'localhost',
                    port: 3306,
                    username: '',
                    database: '',
                    ssh_enabled: false,
                    ssh_port: 22,
                    k8s_enabled: false,
                    ssm_enabled: false,
                    save_in_keychain: true,
                });
                setSelectedDatabasesState([]);
                setLoadAllDatabases(true);
                setOptedIntoSchemaMultiDb(false);
                setSshMode('existing');
                setK8sMode('existing');
                resetK8sPathOverrides();
                setDetectJsonInTextColumns(false);
                setAppearance({});
                setTagIds([]);
                setEnvironment('');
            }

            const nextSshConnections = await loadSshConnections();
            if (!isCurrentInit()) return;
            setSshConnections(nextSshConnections);

            const nextK8sConnections = await loadK8sConnections();
            if (!isCurrentInit()) return;
            setK8sConnections(nextK8sConnections);
        };
        void init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialConnection]);

    const handleDriverChange = (newDriver: string) => {
        setDriver(newDriver);
        setCredentialFieldsHiddenState(false);
        setPluginSecretChanges({});
        setFormData({
            driver: newDriver,
            host: '',
            port: drivers.find((d) => d.id === newDriver)?.default_port ?? undefined,
            username: '',
            password: '',
            database: '',
            ssl_mode: '',
            ssh_enabled: false,
            ssh_connection_id: undefined,
            ssh_host: undefined,
            ssh_port: 22,
            ssh_user: undefined,
            ssh_password: undefined,
            ssh_key_file: undefined,
            ssh_key_passphrase: undefined,
            save_in_keychain: true,
            k8s_enabled: false,
            k8s_connection_id: undefined,
            k8s_context: undefined,
            k8s_namespace: undefined,
            k8s_resource_type: undefined,
            k8s_resource_name: undefined,
            k8s_port: undefined,
            k8s_kubectl_path: undefined,
            k8s_kubeconfig_path: undefined,
            ssm_enabled: false,
            ssm_target: undefined,
            ssm_profile: undefined,
            ssm_region: undefined,
            pooler_mode: undefined,
        });
        invalidateK8sDiscovery();
        invalidateInlineK8sTest();
        resetK8sPathOverrides();
        setK8sAutoPort(null);
        setK8sContexts([]);
        setK8sNamespaces([]);
        setK8sResources([]);
        setK8sDiscoveryErrors({contexts: null, namespaces: null, resources: null});
        setK8sPathActionError(null);
        setK8sSelectionError(null);
        setSelectedDatabasesState([]);
        setLoadAllDatabases(true);
        setOptedIntoSchemaMultiDb(false);
        setDbSearchQuery('');
        setAvailableDatabases([]);
        setDatabaseLoadError(null);
        setStatus('idle');
        setMessage('');
        setErrorFeedback(null);
        setTestLog([]);
        setIsDiagnosticsOpen(false);
        testProgressIdRef.current = null;
        invalidateSshTest();
        setActiveTab('general');
        setConnectionString('');
        setConnectionStringError(null);
        setNameError(false);
        setDatabasesTabError(false);
        setInstallStatus('idle');
        setInstallError(undefined);
    };

    const goToForm = (d: CatalogueDriver) => {
        handleDriverChange(d.slug);
        setPendingGroup(null);
        setStep('form');
        // Picking an already-installed external driver from the catalogue is an
        // explicit intent to use it — activate it so the form resolves it instead of
        // falling back to a built-in. (Not-installed drivers route through the
        // InstallGate, which activates on install.)
        if (!d.isBuiltin && d.installed) {
            void updateSetting(
                'activeExternalDrivers',
                Array.from(new Set([...(settings.activeExternalDrivers ?? []), d.slug])),
            );
        }
    };

    const handleEngineSelect = (group: EngineGroup) => {
        const sel = resolveEngineSelection(group);
        if (sel.mode === 'pick-driver') {
            setPendingGroup(group);
        } else if (sel.driver) {
            // not-installed drivers are routed to the InstallGate by the form-step render; proceed either way
            goToForm(sel.driver);
        }
    };

    return {
        handleDriverChange,
        goToForm,
        handleEngineSelect,
    };
}

export type FormLifecycle = ReturnType<typeof useFormLifecycle>;
