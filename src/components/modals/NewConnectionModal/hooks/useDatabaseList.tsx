import {useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {save} from '@tauri-apps/plugin-dialog';
import {toErrorMessage} from '@/utils/errors';
import {type ConnectionParams} from '@/components/modals/NewConnectionModal/types';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import type {PluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';
import type {SshTunnel} from '@/components/modals/NewConnectionModal/hooks/useSshTunnel';
import type {Kubernetes} from '@/components/modals/NewConnectionModal/hooks/useKubernetes';
import type {SsmTunnel} from '@/components/modals/NewConnectionModal/hooks/useSsmTunnel';
import type {FormActions} from '@/components/modals/NewConnectionModal/hooks/useFormActions';

/** Database list loaded from the server, and the local SQLite file creation. */
export function useDatabaseList(
    form: FormState & PluginSlots & SshTunnel & Kubernetes & SsmTunnel & FormActions,
) {
    const {
        activeActionRef,
        beginFormAction,
        driver,
        drivers,
        finishFormAction,
        formData,

        pluginSecretChanges,
        resolveK8sPort,
        setIsCreatingSqliteFile,
        setMessage,
        setSelectedDatabasesState,
        setStatus,
        setTestResult,
        t,
        updateField,
        initialConnection,
    } = form;
    // ── databases ──
    const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
    const [loadingDatabases, setLoadingDatabases] = useState(false);
    const [databaseLoadError, setDatabaseLoadError] = useState<string | null>(null);

    const handleCreateSqliteFile = async () => {
        const actionId = beginFormAction();
        if (actionId === null) return;

        setIsCreatingSqliteFile(true);
        setStatus('idle');
        setMessage('');
        setTestResult(null);
        try {
            const path = await save({
                title: t('connections.newSqliteDatabase.dialogTitle'),
                defaultPath: 'database.db',
                filters: [
                    {
                        name: t('connections.newSqliteDatabase.fileType'),
                        extensions: ['db', 'sqlite', 'sqlite3'],
                    },
                ],
            });
            if (!path || activeActionRef.current !== actionId) return;

            const createdPath = await invoke<string>('create_sqlite_file', {path});
            if (activeActionRef.current !== actionId) return;
            updateField('database', createdPath);
        } catch (error) {
            if (activeActionRef.current !== actionId) return;
            setStatus('error');
            setMessage(`${t('connections.newSqliteDatabase.error')}: ${toErrorMessage(error)}`);
            setTestResult('error');
        } finally {
            if (activeActionRef.current === actionId) {
                setIsCreatingSqliteFile(false);
            }
            finishFormAction(actionId);
        }
    };

    const loadDatabases = async (
        overrides?: Partial<ConnectionParams>,
        shouldApply: () => boolean = () => true,
    ) => {
        const effectiveDriver = overrides?.driver ?? driver;
        const targetDriver = drivers.find((d) => d.id === effectiveDriver);

        if (
            targetDriver?.capabilities?.file_based === true ||
            targetDriver?.capabilities?.folder_based === true
        ) {
            return;
        }

        setLoadingDatabases(true);
        setDatabaseLoadError(null);
        try {
            const listParamsBase: Partial<ConnectionParams> = {
                ...formData,
                ...overrides,
                driver: effectiveDriver,
                port:
                    overrides?.port != null
                        ? Number(overrides.port)
                        : formData.port != null
                          ? Number(formData.port)
                          : undefined,
            };
            const listParams: Partial<ConnectionParams> = {
                ...listParamsBase,
                k8s_port: resolveK8sPort(listParamsBase),
            };
            const databases = await invoke<string[]>('list_databases', {
                request: {
                    params: {...listParams},
                    connection_id: initialConnection?.id,
                    // Pending plugin secrets belong to the driver being edited; stored
                    // ones are resolved by the backend from `connection_id`.
                    plugin_secret_changes: effectiveDriver === driver ? pluginSecretChanges : {},
                },
            });
            if (!shouldApply()) return;
            setAvailableDatabases(databases);
            // Initialization restores the saved order. Reloads must preserve the
            // draft default and must not reselect databases the user removed.
            setSelectedDatabasesState((prev) => prev.filter((db) => databases.includes(db)));
        } catch (err) {
            if (!shouldApply()) return;
            const errorMsg =
                typeof err === 'string'
                    ? err
                    : err instanceof Error
                      ? err.message
                      : t('newConnection.failLoadDatabases');
            setDatabaseLoadError(errorMsg);
            setAvailableDatabases([]);
        } finally {
            if (shouldApply()) setLoadingDatabases(false);
        }
    };

    return {
        availableDatabases,
        setAvailableDatabases,
        loadingDatabases,
        setLoadingDatabases,
        databaseLoadError,
        setDatabaseLoadError,
        handleCreateSqliteFile,
        loadDatabases,
    };
}

export type DatabaseList = ReturnType<typeof useDatabaseList>;
