import {invoke} from '@tauri-apps/api/core';
import {withoutBlankSslMode} from '@/utils/connections';
import {normalizeLocalDatabasePath} from '@/utils/fsPath';
import {toErrorMessage} from '@/utils/errors';
import {classifyConnectionError} from '@/utils/connectionErrors';
import {type ConnectionParams} from '@/components/modals/NewConnectionModal/types';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import type {PluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';
import type {SshTunnel} from '@/components/modals/NewConnectionModal/hooks/useSshTunnel';
import type {Kubernetes} from '@/components/modals/NewConnectionModal/hooks/useKubernetes';
import type {SsmTunnel} from '@/components/modals/NewConnectionModal/hooks/useSsmTunnel';
import type {FormActions} from '@/components/modals/NewConnectionModal/hooks/useFormActions';
import type {DatabaseList} from '@/components/modals/NewConnectionModal/hooks/useDatabaseList';
import type {ConnectionStringImport} from '@/components/modals/NewConnectionModal/hooks/useConnectionString';
import type {IconImageCleanup} from '@/components/modals/NewConnectionModal/hooks/useIconImageCleanup';
import type {FormLifecycle} from '@/components/modals/NewConnectionModal/hooks/useFormLifecycle';
import type {ConnectionTest} from '@/components/modals/NewConnectionModal/hooks/useConnectionTest';

/** Validating and saving the connection. */
export function useSaveConnection(
    form: FormState &
        PluginSlots &
        SshTunnel &
        Kubernetes &
        SsmTunnel &
        FormActions &
        DatabaseList &
        ConnectionStringImport &
        IconImageCleanup &
        FormLifecycle &
        ConnectionTest,
) {
    const {
        actionSnapshotRef,
        activeActionRef,
        activeCatalogueDriver,
        activeDriverNotInstalled,
        appearance,
        credentialFieldsHidden,
        databaseField,
        detectJsonInTextColumns,
        driver,
        effectiveK8sPort,
        environment,
        finishFormAction,
        formData,
        handleClose,
        hasConnectionUri,
        inlineK8sTestActiveRef,
        inlineK8sTestSequenceRef,
        installDriver,
        installStatus,
        invalidateK8sAsync,
        isFlatMultiDbDriver,
        isLocalPathDriver,
        isOptedInMultiDb,
        isUriPassthrough,
        loadAllDatabases,
        name,
        nameInputRef,
        noConnectionRequired,
        originalImagePath,
        persistenceActionRef,
        pluginSecretChanges,
        preflightFormAction,
        selectedDatabasesState,
        setActiveTab,
        setDatabasesTabError,
        setErrorFeedback,
        setIsDiagnosticsOpen,
        setIsPersistencePending,
        setMessage,
        setNameError,
        setSshTabError,
        setStatus,
        setTestLog,
        setTestResult,
        showAlert,
        singleDatabase,
        step,
        t,
        tagIds,
        uploadedPathsRef,
        validateInlineK8sSelection,
        validateInlineSshSelection,
        validateInlineSsmSelection,
        wasSavedRef,
        withInlineK8sPaths,
        initialConnection,
        onSave,
    } = form;
    const saveConnection = async () => {
        if (step === 'catalogue') return;
        if (installStatus === 'installing') return;
        if (activeDriverNotInstalled && activeCatalogueDriver) {
            const ok = await installDriver(
                activeCatalogueDriver.slug,
                activeCatalogueDriver.latestVersion,
            );
            if (!ok) return; // banner shows the error; do not proceed
        }

        const preflight = await preflightFormAction();
        if (!preflight) return;
        const {actionId, startingSnapshot, inlinePaths} = preflight;

        try {
            invalidateK8sAsync('new-k8s-test');
            inlineK8sTestSequenceRef.current += 1;
            inlineK8sTestActiveRef.current = false;
            setErrorFeedback(null);
            setTestLog([]);
            setIsDiagnosticsOpen(false);

            if (!name.trim()) {
                setStatus('error');
                setMessage(t('newConnection.nameRequired'));
                setTestResult('error');
                setNameError(true);
                // The name lives in the General tab: show it before focusing.
                setActiveTab('general');
                requestAnimationFrame(() => nameInputRef.current?.focus());
                return;
            }
            // The URI embeds credentials, so it may only leave this modal if it can
            // go to the OS keychain. Fail loudly instead of persisting it in plaintext.
            if (hasConnectionUri && !formData.save_in_keychain) {
                setStatus('error');
                setMessage(t('newConnection.connectionUriRequiresKeychain'));
                setTestResult('error');
                return;
            }
            if (isUriPassthrough && !hasConnectionUri) {
                setStatus('error');
                setMessage(t('newConnection.connectionUriRequired'));
                setTestResult('error');
                return;
            }
            if (isOptedInMultiDb) {
                if (!loadAllDatabases && selectedDatabasesState.length === 0) {
                    setStatus('error');
                    setMessage(t('newConnection.noDatabasesSelected'));
                    setTestResult('error');
                    setActiveTab('databases');
                    setDatabasesTabError(true);
                    return;
                }
            } else if (
                !noConnectionRequired &&
                !singleDatabase &&
                !databaseField?.hidden &&
                !hasConnectionUri &&
                (!formData.database ||
                    (typeof formData.database === 'string' && !formData.database.trim()))
            ) {
                setStatus('error');
                setMessage(t('newConnection.dbNameRequired'));
                setTestResult('error');
                return;
            }
            if (!validateInlineK8sSelection()) return;
            if (!validateInlineSshSelection()) return;
            if (!validateInlineSsmSelection()) return;

            const paramsBase: Partial<ConnectionParams> = {
                driver,
                ...formData,
                port: formData.port != null ? Number(formData.port) : undefined,
                k8s_port: effectiveK8sPort,
                database: isOptedInMultiDb
                    ? loadAllDatabases
                        ? // "All databases" mode: persisted as an empty database so the
                          // list is fetched from the server on every connect.
                          ''
                        : // A single database selected via the Databases tab collapses to
                          // a plain string for flat multi-db drivers (MySQL), matching
                          // how they've always persisted a one-element selection. A
                          // schema-based multi-db driver (PostgreSQL) must NOT collapse:
                          // a plain string there is indistinguishable from the
                          // traditional single-database mode it already had before this
                          // feature existed, so it always keeps the array shape as the
                          // opt-in signal — see hasOptedIntoDatabaseSelection.
                          isFlatMultiDbDriver && selectedDatabasesState.length === 1
                          ? selectedDatabasesState[0]
                          : selectedDatabasesState
                    : singleDatabase
                      ? typeof formData.database === 'string' && formData.database.trim()
                          ? formData.database
                          : driver
                      : isLocalPathDriver
                        ? (normalizeLocalDatabasePath(
                              typeof formData.database === 'string' ||
                                  Array.isArray(formData.database)
                                  ? formData.database
                                  : undefined,
                          ) ?? formData.database)
                        : formData.database,
            };
            const params = withoutBlankSslMode(withInlineK8sPaths(paramsBase, inlinePaths.options));
            const appearancePayload =
                appearance.icon || appearance.accentColor ? appearance : undefined;
            const finalImagePath = appearance.icon?.type === 'image' ? appearance.icon.path : null;
            const uploadedPathsForAction = [...uploadedPathsRef.current];
            const originalImagePathForAction = originalImagePath.current;

            if (
                activeActionRef.current !== actionId ||
                actionSnapshotRef.current !== startingSnapshot
            ) {
                return;
            }
            persistenceActionRef.current = actionId;
            setIsPersistencePending(true);
            setStatus('saving');
            setMessage('');
            setErrorFeedback(null);
            setTestResult(null);
            try {
                let savedConnectionId: string;
                let persistedInKeychain = params.save_in_keychain;
                if (initialConnection) {
                    // An omitted password means "keep the stored one". While a plugin
                    // hides the login inputs the empty password is deliberate: it is
                    // sent as-is so the backend drops the keychain entry too.
                    if (!params.password?.trim() && !credentialFieldsHidden) {
                        delete params.password;
                    }
                    if (!params.ssh_password?.trim()) delete params.ssh_password;
                    const updated = await invoke<{
                        params?: {save_in_keychain?: boolean};
                    }>('update_connection', {
                        id: initialConnection.id,
                        name,
                        params,
                        pluginSecretChanges,
                        detectJsonInTextColumns: detectJsonInTextColumns ? true : null,
                        environment: environment || null,
                    });
                    persistedInKeychain = updated?.params?.save_in_keychain;
                    savedConnectionId = initialConnection.id;
                    await invoke('set_connection_appearance', {
                        id: initialConnection.id,
                        appearance: appearancePayload ?? null,
                    });
                } else {
                    const saved = await invoke<{
                        id: string;
                        params?: {save_in_keychain?: boolean};
                    }>('save_connection', {
                        name,
                        params,
                        pluginSecretChanges,
                        detectJsonInTextColumns: detectJsonInTextColumns ? true : null,
                        environment: environment || null,
                    });
                    persistedInKeychain = saved.params?.save_in_keychain;
                    savedConnectionId = saved.id;
                    if (appearancePayload) {
                        await invoke('set_connection_appearance', {
                            id: saved.id,
                            appearance: appearancePayload,
                        });
                    }
                }

                await invoke('set_connection_tags', {
                    connectionId: savedConnectionId,
                    tagIds,
                });

                if (
                    activeActionRef.current !== actionId ||
                    actionSnapshotRef.current !== startingSnapshot
                ) {
                    if (activeActionRef.current === actionId) {
                        setStatus('idle');
                        setMessage('');
                        setErrorFeedback(null);
                        setTestResult(null);
                    }
                    return;
                }

                if (params.save_in_keychain && persistedInKeychain === false) {
                    showAlert(t('newConnection.secretsStoredInPlainText'), {
                        kind: 'warning',
                    });
                }

                if (onSave) onSave();
                wasSavedRef.current = true;

                // Delete only paths owned by this save attempt. Paths uploaded by a
                // superseding session remain tracked for that session's own cleanup.
                const toDelete = uploadedPathsForAction.filter((path) => path !== finalImagePath);
                if (
                    originalImagePathForAction &&
                    originalImagePathForAction !== finalImagePath &&
                    !toDelete.includes(originalImagePathForAction)
                ) {
                    toDelete.push(originalImagePathForAction);
                }
                await Promise.all(
                    toDelete.map((path) =>
                        invoke('delete_connection_icon', {relativePath: path}).catch(() => {}),
                    ),
                );
                const handledUploads = new Set(uploadedPathsForAction);
                uploadedPathsRef.current = uploadedPathsRef.current.filter(
                    (path) => !handledUploads.has(path),
                );

                persistenceActionRef.current = null;
                setIsPersistencePending(false);
                handleClose();
            } catch (err) {
                if (
                    activeActionRef.current === actionId &&
                    actionSnapshotRef.current === startingSnapshot
                ) {
                    setStatus('error');
                    const classified = classifyConnectionError(toErrorMessage(err), {
                        sshEnabled: formData.ssh_enabled === true,
                        ssmEnabled: formData.ssm_enabled === true,
                    });
                    setMessage('');
                    setErrorFeedback(
                        classified.kind === 'unknown'
                            ? {...classified, summaryKey: 'newConnection.failSave'}
                            : classified,
                    );
                    setTestResult('error');
                    if (classified.kind.startsWith('ssh')) {
                        setSshTabError(true);
                    }
                    setIsDiagnosticsOpen(true);
                } else if (activeActionRef.current === actionId) {
                    setStatus('idle');
                    setMessage('');
                    setErrorFeedback(null);
                    setTestResult(null);
                }
            }
        } finally {
            if (persistenceActionRef.current === actionId) {
                persistenceActionRef.current = null;
                setIsPersistencePending(false);
            }
            finishFormAction(actionId);
        }
    };

    return {
        saveConnection,
    };
}

export type SaveConnection = ReturnType<typeof useSaveConnection>;
