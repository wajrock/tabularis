import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {withoutBlankSslMode} from '@/utils/connections';
import {normalizeLocalDatabasePath} from '@/utils/fsPath';
import {toErrorMessage} from '@/utils/errors';
import {classifyConnectionError} from '@/utils/connectionErrors';
import {
    type ConnectionTestLogEntry,
    type ConnectionTestProgressPayload,
} from '@/utils/connectionTest';
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

/** Testing the connection from the form, with live progress. */
export function useConnectionTest(
    form: FormState &
        PluginSlots &
        SshTunnel &
        Kubernetes &
        SsmTunnel &
        FormActions &
        DatabaseList &
        ConnectionStringImport &
        IconImageCleanup &
        FormLifecycle,
) {
    const {
        actionSnapshotRef,
        activeActionRef,
        activeCatalogueDriver,
        activeDriverNotInstalled,
        driver,
        effectiveK8sPort,
        finishFormAction,
        formData,
        inlineK8sTestActiveRef,
        inlineK8sTestSequenceRef,
        installDriver,
        installStatus,
        isLocalPathDriver,
        isOptedInMultiDb,
        loadAllDatabases,
        pluginSecretChanges,
        preflightFormAction,
        runK8sAsync,
        selectedDatabasesState,
        setErrorFeedback,
        setIsActionPending,
        setIsDiagnosticsOpen,
        setMessage,
        setSshTabError,
        setStatus,
        setTestLog,
        setTestResult,
        status,
        step,
        testLog,
        testProgressIdRef,
        validateInlineK8sSelection,
        validateInlineSshSelection,
        validateInlineSsmSelection,
        withInlineK8sPaths,
        initialConnection,
    } = form;
    const testConnection = async () => {
        if (step === 'catalogue') return false;
        if (installStatus === 'installing') return false;
        if (activeDriverNotInstalled && activeCatalogueDriver) {
            const ok = await installDriver(
                activeCatalogueDriver.slug,
                activeCatalogueDriver.latestVersion,
            );
            if (!ok) return false; // banner shows the error; do not proceed
        }

        const preflight = await preflightFormAction();
        if (!preflight) return false;
        const {actionId, startingSnapshot, inlinePaths} = preflight;

        try {
            if (!validateInlineK8sSelection()) return false;
            if (!validateInlineSshSelection()) return false;
            if (!validateInlineSsmSelection()) return false;

            const usesK8s = formData.k8s_enabled === true;
            const k8sTestSequence = usesK8s ? ++inlineK8sTestSequenceRef.current : undefined;
            inlineK8sTestActiveRef.current = usesK8s;

            setStatus('testing');
            setMessage('');
            setErrorFeedback(null);
            setTestResult(null);
            setTestLog([]);
            setIsDiagnosticsOpen(false);
            const progressId = crypto.randomUUID();
            testProgressIdRef.current = progressId;
            let unlistenProgress: (() => void) | null = null;
            try {
                unlistenProgress = await listen<ConnectionTestProgressPayload>(
                    'connection-test-progress',
                    (event) => {
                        if (event.payload.id !== testProgressIdRef.current) return;
                        const entry: ConnectionTestLogEntry = {
                            step: event.payload.step,
                            status: event.payload.status,
                            detail: event.payload.detail ?? null,
                            timestamp: Date.now(),
                        };
                        setTestLog((previous) => [...previous, entry]);
                    },
                );
                const testParamsBase: Partial<ConnectionParams> = {
                    driver,
                    ...formData,
                    port: formData.port != null ? Number(formData.port) : undefined,
                    k8s_port: effectiveK8sPort,
                    database: isOptedInMultiDb
                        ? loadAllDatabases
                            ? ''
                            : (selectedDatabasesState[0] ??
                              (typeof formData.database === 'string' ? formData.database : ''))
                        : isLocalPathDriver
                          ? (normalizeLocalDatabasePath(
                                typeof formData.database === 'string' ||
                                    Array.isArray(formData.database)
                                    ? formData.database
                                    : undefined,
                            ) ?? '')
                          : formData.database,
                };
                const testParams = withoutBlankSslMode(
                    withInlineK8sPaths(testParamsBase, inlinePaths.options),
                );
                const invokeTest = () =>
                    invoke<string>('test_connection', {
                        request: {
                            params: {...testParams},
                            connection_id: initialConnection?.id,
                            progress_id: progressId,
                            plugin_secret_changes: pluginSecretChanges,
                        },
                    });

                let result: string;
                if (usesK8s) {
                    const latestResult = await runK8sAsync('new-k8s-test', invokeTest);
                    if (latestResult.status === 'stale') return false;
                    if (latestResult.status === 'error') throw latestResult.error;
                    result = latestResult.value;
                } else {
                    result = await invokeTest();
                }

                if (
                    activeActionRef.current !== actionId ||
                    actionSnapshotRef.current !== startingSnapshot
                ) {
                    if (activeActionRef.current === actionId) {
                        inlineK8sTestActiveRef.current = false;
                        setStatus('idle');
                        setMessage('');
                        setErrorFeedback(null);
                        setTestResult(null);
                    }
                    return false;
                }
                setStatus('success');
                setMessage(result);
                setTestResult('success');
                setTimeout(() => {
                    if (
                        k8sTestSequence !== undefined &&
                        inlineK8sTestSequenceRef.current !== k8sTestSequence
                    ) {
                        return;
                    }
                    inlineK8sTestActiveRef.current = false;
                    setTestResult(null);
                    setStatus('idle');
                    setMessage('');
                }, 3000);
                return true;
            } catch (err) {
                if (
                    activeActionRef.current !== actionId ||
                    actionSnapshotRef.current !== startingSnapshot
                ) {
                    if (activeActionRef.current === actionId) {
                        inlineK8sTestActiveRef.current = false;
                        setStatus('idle');
                        setMessage('');
                        setErrorFeedback(null);
                        setTestResult(null);
                    }
                    return false;
                }
                setStatus('error');
                const classified = classifyConnectionError(toErrorMessage(err), {
                    sshEnabled: formData.ssh_enabled === true,
                    ssmEnabled: formData.ssm_enabled === true,
                });
                setMessage('');
                setErrorFeedback(classified);
                setTestResult('error');
                if (classified.kind.startsWith('ssh')) {
                    setSshTabError(true);
                }
                setIsDiagnosticsOpen(true);
                // The error stays visible until the user acts again: no auto-reset
                // racing against read time.
                inlineK8sTestActiveRef.current = false;
                return false;
            } finally {
                // The failing step's event can be delivered after the invoke
                // rejects — keep the subscription alive briefly so the log gets its
                // closing entry. Cancel/new-test invalidate the id, so late events
                // for a superseded run are filtered out regardless.
                const unlisten = unlistenProgress;
                if (unlisten) {
                    setTimeout(unlisten, 1000);
                }
            }
        } finally {
            finishFormAction(actionId);
        }
    };

    // Abandons the in-flight test: the invoke keeps running in the backend but
    // its result and any late progress events are discarded.
    const cancelTest = () => {
        if (activeActionRef.current === null || status !== 'testing') return;
        testProgressIdRef.current = null;
        activeActionRef.current = null;
        setIsActionPending(false);
        inlineK8sTestActiveRef.current = false;
        setStatus('idle');
        setMessage('');
        setTestResult(null);
        setTestLog((previous) => [
            ...previous,
            {
                step: 'cancelled',
                status: 'cancelled',
                detail: null,
                timestamp: Date.now(),
            },
        ]);
        // Show what the test had done up to the interruption.
        setIsDiagnosticsOpen(true);
    };

    // Last progress entry, shown live next to the Test button while testing.
    const liveTestStep = testLog.length > 0 ? testLog[testLog.length - 1] : null;

    return {
        testConnection,
        cancelTest,
        liveTestStep,
    };
}

export type ConnectionTest = ReturnType<typeof useConnectionTest>;
