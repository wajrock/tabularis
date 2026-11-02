import {useEffect, useLayoutEffect, useMemo, useCallback, useRef} from 'react';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import type {PluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';
import type {SshTunnel} from '@/components/modals/NewConnectionModal/hooks/useSshTunnel';
import type {Kubernetes} from '@/components/modals/NewConnectionModal/hooks/useKubernetes';
import type {SsmTunnel} from '@/components/modals/NewConnectionModal/hooks/useSsmTunnel';

/** Lifecycle of test/save actions: snapshot, preflight, cancellation and closing. */
export function useFormActions(form: FormState & PluginSlots & SshTunnel & Kubernetes & SsmTunnel) {
    const {
        actionSequenceRef,
        activeActionRef,
        appearance,
        appliedK8sOptions,
        beginFormAction,
        cancelK8sPathValidation,
        detectJsonInTextColumns,
        driver,
        effectiveK8sPort,
        ensureInlineK8sPaths,
        finishFormAction,
        formData,
        initSequenceRef,
        inlineK8sTestActiveRef,
        inlineK8sTestSequenceRef,
        invalidateK8sAsync,
        invalidateK8sDiscovery,
        isOptedInMultiDb,
        k8sMode,
        name,
        noConnectionRequired,
        pathOverrides,
        persistenceActionRef,
        resetK8sPathOverrides,
        selectedDatabasesState,
        setErrorFeedback,
        setIsActionPending,
        setIsCreatingSqliteFile,
        setIsDiagnosticsOpen,
        setIsPersistencePending,
        setIsSshDiagnosticsOpen,
        setK8sPathActionError,
        setMessage,
        setSshSelectionError,
        setSshTabError,
        setSshTestError,
        setSshTestLog,
        setSshTestMessage,
        setSshTestStatus,
        setStatus,
        setTestLog,
        setTestResult,
        sshMode,
        sshTestProgressIdRef,
        t,
        testProgressIdRef,
        initialConnection,
        isOpen,
        onClose,
    } = form;
    const actionSnapshot = useMemo(
        () => ({
            driver,
            name,
            formData,
            selectedDatabasesState,
            detectJsonInTextColumns,
            appearance,
            sshMode,
            k8sMode,
            effectiveK8sPort,
            isOptedInMultiDb,
            noConnectionRequired,
            initialConnection,
            kubectlPath: pathOverrides.kubectlPath,
            kubeconfigPath: pathOverrides.kubeconfigPath,
            appliedK8sOptions,
        }),
        [
            appearance,
            appliedK8sOptions,
            detectJsonInTextColumns,
            driver,
            effectiveK8sPort,
            formData,
            initialConnection,
            isOptedInMultiDb,
            k8sMode,
            name,
            noConnectionRequired,
            pathOverrides.kubeconfigPath,
            pathOverrides.kubectlPath,
            selectedDatabasesState,
            sshMode,
        ],
    );
    const actionSnapshotRef = useRef(actionSnapshot);
    useLayoutEffect(() => {
        actionSnapshotRef.current = actionSnapshot;
    }, [actionSnapshot]);

    const cancelInlineK8sWork = useCallback(() => {
        invalidateK8sDiscovery();
        invalidateK8sAsync('new-k8s-test');
        inlineK8sTestSequenceRef.current += 1;
        inlineK8sTestActiveRef.current = false;
        actionSequenceRef.current += 1;
        activeActionRef.current = null;
        initSequenceRef.current += 1;
        cancelK8sPathValidation();
    }, [
        cancelK8sPathValidation,
        invalidateK8sAsync,
        invalidateK8sDiscovery,
        actionSequenceRef,
        activeActionRef,
        initSequenceRef,
        inlineK8sTestActiveRef,
        inlineK8sTestSequenceRef,
    ]);

    useEffect(() => {
        if (!isOpen) {
            cancelInlineK8sWork();
            queueMicrotask(() => {
                setIsActionPending(false);
                if (persistenceActionRef.current === null) {
                    setIsPersistencePending(false);
                }
                setStatus('idle');
                setMessage('');
                setErrorFeedback(null);
                setTestResult(null);
                setIsCreatingSqliteFile(false);
                setSshTestStatus('idle');
                setSshTestMessage(null);
                setSshTestError(null);
                setSshTestLog([]);
                setIsSshDiagnosticsOpen(false);
                sshTestProgressIdRef.current = null;
                setSshSelectionError(null);
                setSshTabError(false);
                setTestLog([]);
                setIsDiagnosticsOpen(false);
                testProgressIdRef.current = null;
            });
        }
    }, [
        cancelInlineK8sWork,
        isOpen,
        persistenceActionRef,
        setErrorFeedback,
        setIsActionPending,
        setIsCreatingSqliteFile,
        setIsDiagnosticsOpen,
        setIsPersistencePending,
        setIsSshDiagnosticsOpen,
        setMessage,
        setSshSelectionError,
        setSshTabError,
        setSshTestError,
        setSshTestLog,
        setSshTestMessage,
        setSshTestStatus,
        setStatus,
        setTestLog,
        setTestResult,
        sshTestProgressIdRef,
        testProgressIdRef,
    ]);

    const handleClose = useCallback(() => {
        if (persistenceActionRef.current !== null) return;
        cancelInlineK8sWork();
        setIsActionPending(false);
        resetK8sPathOverrides();
        onClose();
    }, [
        cancelInlineK8sWork,
        onClose,
        resetK8sPathOverrides,
        persistenceActionRef,
        setIsActionPending,
    ]);

    const preflightFormAction = useCallback(async () => {
        const actionId = beginFormAction();
        if (actionId === null) return null;
        const startingSnapshot = actionSnapshotRef.current;

        try {
            const inlinePaths = await ensureInlineK8sPaths();
            if (activeActionRef.current !== actionId) {
                finishFormAction(actionId);
                return null;
            }
            if (!inlinePaths.allowed && inlinePaths.reason === 'applied') {
                setK8sPathActionError(t('k8sConnections.pathSelectionReset'));
                finishFormAction(actionId);
                return null;
            }
            if (actionSnapshotRef.current !== startingSnapshot) {
                finishFormAction(actionId);
                return null;
            }
            if (!inlinePaths.allowed) {
                setK8sPathActionError(t('k8sConnections.pathValidationFailed'));
                finishFormAction(actionId);
                return null;
            }

            setK8sPathActionError(null);
            return {actionId, startingSnapshot, inlinePaths};
        } catch (error) {
            finishFormAction(actionId);
            throw error;
        }
    }, [
        beginFormAction,
        ensureInlineK8sPaths,
        finishFormAction,
        t,
        activeActionRef,
        setK8sPathActionError,
    ]);

    return {
        actionSnapshot,
        actionSnapshotRef,
        cancelInlineK8sWork,
        handleClose,
        preflightFormAction,
    };
}

export type FormActions = ReturnType<typeof useFormActions>;
