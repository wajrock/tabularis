import {useState, useCallback, useRef} from 'react';
import {listen} from '@tauri-apps/api/event';
import {loadSshConnections, testSshConnection, type SshConnection} from '@/utils/ssh';
import {toErrorMessage} from '@/utils/errors';
import {classifyConnectionError, type ClassifiedConnectionError} from '@/utils/connectionErrors';
import {
    type ConnectionTestLogEntry,
    type ConnectionTestProgressPayload,
} from '@/utils/connectionTest';
import {type ConnectionParams} from '@/components/modals/NewConnectionModal/types';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import type {PluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';

/** SSH tunnel: saved or inline tunnel, its validation and its test. */
export function useSshTunnel(form: FormState & PluginSlots) {
    const {
        formData,
        setActiveTab,
        sshPasswordDirty,

        t,
        updateField,
        initialConnection,
    } = form;
    // ── SSH ──
    const [sshConnections, setSshConnections] = useState<SshConnection[]>([]);
    const [sshMode, setSshMode] = useState<'existing' | 'inline'>('existing');
    const [sshTestStatus, setSshTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>(
        'idle',
    );
    const [sshTestMessage, setSshTestMessage] = useState<string | null>(null);
    const [sshTestError, setSshTestError] = useState<ClassifiedConnectionError | null>(null);
    const [sshTestLog, setSshTestLog] = useState<ConnectionTestLogEntry[]>([]);
    const [isSshDiagnosticsOpen, setIsSshDiagnosticsOpen] = useState(false);
    const sshTestProgressIdRef = useRef<string | null>(null);
    const [sshSelectionError, setSshSelectionError] = useState<string | null>(null);
    const [sshTabError, setSshTabError] = useState(false);
    const sshTestSequenceRef = useRef(0);

    // ── helpers ──
    const loadSshConnectionsList = async () => {
        const result = await loadSshConnections();
        setSshConnections(result);
    };

    const validateInlineSshSelection = useCallback((): boolean => {
        if (!formData.ssh_enabled) {
            setSshSelectionError(null);
            setSshTabError(false);
            return true;
        }

        let errorKey: string | null = null;
        if (sshMode === 'existing') {
            if (!formData.ssh_connection_id) {
                errorKey = 'sshConnections.errors.connectionRequired';
            }
        } else if (!formData.ssh_host?.trim()) {
            errorKey = 'sshConnections.errors.hostRequired';
        } else if (!formData.ssh_user?.trim()) {
            errorKey = 'sshConnections.errors.userRequired';
        } else if (
            formData.ssh_port == null ||
            !Number.isInteger(formData.ssh_port) ||
            formData.ssh_port < 1 ||
            formData.ssh_port > 65535
        ) {
            errorKey = 'sshConnections.errors.portInvalid';
        }

        if (errorKey) {
            setSshSelectionError(t(errorKey));
            setSshTabError(true);
            setActiveTab('ssh');
            return false;
        }

        setSshSelectionError(null);
        setSshTabError(false);
        return true;
    }, [
        formData.ssh_connection_id,
        formData.ssh_enabled,
        formData.ssh_host,
        formData.ssh_port,
        formData.ssh_user,
        sshMode,
        t,
        setActiveTab,
    ]);

    const testSshTunnel = async () => {
        if (!validateInlineSshSelection()) return;

        const sequence = ++sshTestSequenceRef.current;
        setSshTestStatus('testing');
        setSshTestMessage(null);
        setSshTestError(null);
        setSshTestLog([]);
        setIsSshDiagnosticsOpen(false);
        const progressId = crypto.randomUUID();
        sshTestProgressIdRef.current = progressId;
        let unlistenProgress: (() => void) | null = null;

        try {
            unlistenProgress = await listen<ConnectionTestProgressPayload>(
                'connection-test-progress',
                (event) => {
                    if (event.payload.id !== sshTestProgressIdRef.current) return;
                    const entry: ConnectionTestLogEntry = {
                        step: event.payload.step,
                        status: event.payload.status,
                        detail: event.payload.detail ?? null,
                        timestamp: Date.now(),
                    };
                    setSshTestLog((previous) => [...previous, entry]);
                },
            );

            let target: string;
            if (sshMode === 'existing') {
                const selected = sshConnections.find(
                    (conn) => conn.id === formData.ssh_connection_id,
                );
                if (!selected) {
                    setSshTestStatus('idle');
                    setSshSelectionError(t('sshConnections.errors.connectionMissing'));
                    setSshTabError(true);
                    return;
                }
                await testSshConnection(selected, {progressId});
                target = `${selected.user}@${selected.host}:${selected.port}`;
            } else {
                const port = formData.ssh_port || 22;
                await testSshConnection(
                    {
                        host: formData.ssh_host,
                        port,
                        user: formData.ssh_user,
                        password: formData.ssh_password,
                        key_file: formData.ssh_key_file,
                        key_passphrase: formData.ssh_key_passphrase,
                        allow_passphrase_prompt: formData.ssh_allow_passphrase_prompt,
                    },
                    {
                        // Keychain fallback only when the password field was left
                        // untouched: a dirty (even cleared) field expresses intent to
                        // test with exactly what is typed.
                        dbConnectionId: sshPasswordDirty ? undefined : initialConnection?.id,
                        progressId,
                    },
                );
                target = `${formData.ssh_user}@${formData.ssh_host}:${port}`;
            }
            if (sshTestSequenceRef.current !== sequence) return;
            setSshTestStatus('success');
            setSshTestMessage(t('newConnection.sshTestSuccess', {target}));
        } catch (err) {
            if (sshTestSequenceRef.current !== sequence) return;
            setSshTestStatus('error');
            setSshTestError(classifyConnectionError(toErrorMessage(err)));
            setIsSshDiagnosticsOpen(true);
        } finally {
            // The failing step's event can arrive after the invoke rejects — keep
            // the subscription alive briefly; stale ids are filtered regardless.
            const unlisten = unlistenProgress;
            if (unlisten) {
                setTimeout(unlisten, 1000);
            }
        }
    };

    // Abandons the in-flight SSH test: the invoke keeps running in the backend
    // but its result and any late progress events are discarded.
    const cancelSshTest = () => {
        if (sshTestStatus !== 'testing') return;
        sshTestSequenceRef.current += 1;
        sshTestProgressIdRef.current = null;
        setSshTestStatus('idle');
        setSshTestMessage(null);
        setSshTestLog((previous) => [
            ...previous,
            {
                step: 'cancelled',
                status: 'cancelled',
                detail: null,
                timestamp: Date.now(),
            },
        ]);
        setIsSshDiagnosticsOpen(true);
    };

    // Any change to the SSH configuration invalidates a previous SSH test
    // result: a stale green check must not survive an edit.
    const invalidateSshTest = useCallback(() => {
        sshTestSequenceRef.current += 1;
        sshTestProgressIdRef.current = null;
        setSshTestStatus('idle');
        setSshTestMessage(null);
        setSshTestError(null);
        setSshTestLog([]);
        setIsSshDiagnosticsOpen(false);
        setSshSelectionError(null);
        setSshTabError(false);
    }, []);

    const updateSshField = <K extends keyof ConnectionParams>(
        field: K,
        value: ConnectionParams[K],
    ) => {
        invalidateSshTest();
        updateField(field, value);
    };

    return {
        sshConnections,
        setSshConnections,
        sshMode,
        setSshMode,
        sshTestStatus,
        setSshTestStatus,
        sshTestMessage,
        setSshTestMessage,
        sshTestError,
        setSshTestError,
        sshTestLog,
        setSshTestLog,
        isSshDiagnosticsOpen,
        setIsSshDiagnosticsOpen,
        sshTestProgressIdRef,
        sshSelectionError,
        setSshSelectionError,
        sshTabError,
        setSshTabError,
        sshTestSequenceRef,
        loadSshConnectionsList,
        validateInlineSshSelection,
        testSshTunnel,
        cancelSshTest,
        invalidateSshTest,
        updateSshField,
    };
}

export type SshTunnel = ReturnType<typeof useSshTunnel>;
