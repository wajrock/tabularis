import {useState, useEffect, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {AlertCircle, Check, Loader2, Pencil, Plus, Trash2, XCircle, Zap} from 'lucide-react';
import {invoke} from '@tauri-apps/api/core';
import clsx from 'clsx';
import {
    loadSshConnections,
    deleteSshConnection,
    testSshConnection,
    type SshConnection,
} from '@/utils/ssh';
import type {SavedConnection} from '@/contexts/DatabaseContext';
import {toErrorMessage} from '@/utils/errors';
import {ConfirmModal} from '@/components/modals/ConfirmModal';
import {Button} from '@/components/ui/Button';
import {IconButton} from '@/components/ui/IconButton';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {SshConnectionModal} from './SshConnectionModal';

interface SshConnectionsManagerProps {
    /**
     * z-index of the editor and delete confirmation, to stack them
     * above a parent modal. Defaults to the standard Modal layer.
     */
    confirmZIndex?: number;
}

/**
 * List of saved SSH connections (Settings → SSH): quick test, edit and delete.
 * Creating and editing go through the shared SshConnectionModal.
 */
export function SshConnectionsManager({confirmZIndex}: SshConnectionsManagerProps) {
    const {t} = useTranslation();
    const [connections, setConnections] = useState<SshConnection[]>([]);
    /** `null`: closed; `'new'`: creating; otherwise the connection being edited. */
    const [editor, setEditor] = useState<SshConnection | 'new' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<string, 'success' | 'error'>>({});
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [deleteUsageCount, setDeleteUsageCount] = useState(0);

    const loadConnections = useCallback(async () => {
        setConnections(await loadSshConnections());
    }, []);

    useEffect(() => {
        let cancelled = false;
        void loadSshConnections().then((result) => {
            if (!cancelled) setConnections(result);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const requestDelete = async (id: string) => {
        setDeleteTargetId(id);
        setDeleteUsageCount(0);
        try {
            const saved = await invoke<SavedConnection[]>('get_connections');
            setDeleteUsageCount(saved.filter((c) => c.params.ssh_connection_id === id).length);
        } catch (err) {
            // Best-effort warning only — deletion is still confirmed by the user.
            console.error('Failed to count connections using SSH tunnel:', err);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteTargetId(null);
        try {
            await deleteSshConnection(id);
            await loadConnections();
        } catch (err) {
            console.error('Failed to delete SSH connection:', err);
            setError(`${t('sshConnections.failDelete')}: ${toErrorMessage(err)}`);
        }
    };

    /** Shows the result on the row for 3 seconds. */
    const flashResult = (id: string, result: 'success' | 'error') => {
        setTestResults((prev) => ({...prev, [id]: result}));
        setTimeout(() => {
            setTestResults((prev) => {
                const updated = {...prev};
                delete updated[id];
                return updated;
            });
        }, 3000);
    };

    const handleQuickTest = async (conn: SshConnection) => {
        setTestingConnectionId(conn.id);
        try {
            await testSshConnection(conn);
            flashResult(conn.id, 'success');
        } catch (err) {
            console.error('SSH quick test failed:', err);
            flashResult(conn.id, 'error');
            setError(`${t('sshConnections.testFailed')}: ${toErrorMessage(err)}`);
        } finally {
            setTestingConnectionId(null);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <Button className="w-fit" icon={<Plus size={16} />} onClick={() => setEditor('new')}>
                {t('sshConnections.createNew')}
            </Button>

            {error && (
                <InlineBanner tone="red" role="alert" icon={<AlertCircle size={14} />}>
                    {error}
                </InlineBanner>
            )}

            {connections.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                    {t('sshConnections.noConnections')}
                </p>
            ) : (
                <div className="flex flex-col gap-2">
                    {connections.map((conn) => (
                        <div
                            key={conn.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-default bg-base p-3"
                        >
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-primary">
                                    {conn.name}
                                </div>
                                <div className="truncate text-xs text-muted">
                                    {conn.user}@{conn.host}:{conn.port}
                                </div>
                                {conn.key_file && (
                                    <div className="truncate text-xs text-muted">
                                        {t('sshConnections.keyFile')}: {conn.key_file}
                                    </div>
                                )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <IconButton
                                    label={t('sshConnections.quickTest')}
                                    onClick={() => void handleQuickTest(conn)}
                                    disabled={testingConnectionId === conn.id}
                                    className={clsx(
                                        testResults[conn.id] === 'success' &&
                                            'text-tint-success-fg',
                                        testResults[conn.id] === 'error' && 'text-tint-danger-fg',
                                    )}
                                >
                                    {testingConnectionId === conn.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : testResults[conn.id] === 'success' ? (
                                        <Check size={14} />
                                    ) : testResults[conn.id] === 'error' ? (
                                        <XCircle size={14} />
                                    ) : (
                                        <Zap size={14} />
                                    )}
                                </IconButton>
                                <IconButton
                                    label={t('sshConnections.edit')}
                                    onClick={() => setEditor(conn)}
                                >
                                    <Pencil size={14} />
                                </IconButton>
                                <IconButton
                                    label={t('sshConnections.delete')}
                                    onClick={() => void requestDelete(conn.id)}
                                    className="hover:text-tint-danger-fg"
                                >
                                    <Trash2 size={14} />
                                </IconButton>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <SshConnectionModal
                isOpen={editor !== null}
                onClose={() => setEditor(null)}
                connection={editor === 'new' ? null : editor}
                onSaved={() => void loadConnections()}
                onDeleted={() => void loadConnections()}
                zIndex={confirmZIndex}
            />

            <ConfirmModal
                isOpen={deleteTargetId !== null}
                onClose={() => setDeleteTargetId(null)}
                title={t('sshConnections.delete')}
                message={
                    deleteUsageCount > 0
                        ? `${t('sshConnections.confirmDelete')} ${t('sshConnections.deleteInUse', {count: deleteUsageCount})}`
                        : t('sshConnections.confirmDelete')
                }
                onConfirm={() => deleteTargetId && handleDelete(deleteTargetId)}
                zIndex={confirmZIndex}
            />
        </div>
    );
}
