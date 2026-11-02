import {useId, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {KeyRound, Trash2} from 'lucide-react';
import {invoke} from '@tauri-apps/api/core';
import type {SavedConnection} from '@/contexts/DatabaseContext';
import {ConfirmModal} from '@/components/modals/ConfirmModal';
import {Button} from '@/components/ui/Button';
import {Modal} from '@/components/ui/Modal';
import {deleteSshConnection, type SshConnection} from '@/utils/ssh';
import {toErrorMessage} from '@/utils/errors';
import {SshConnectionForm} from './SshConnectionForm';

interface SshConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Connection to edit; omitted to create one. */
    connection?: SshConnection | null;
    onSaved: (connection: SshConnection) => void;
    /** Called after the edited connection was deleted. */
    onDeleted?: (id: string) => void;
    /** Raised above a parent modal (the connection modal). */
    zIndex?: number;
}

/** Create or edit one saved SSH connection. */
export function SshConnectionModal({
    isOpen,
    onClose,
    connection,
    onSaved,
    onDeleted,
    zIndex,
}: SshConnectionModalProps) {
    const {t} = useTranslation();
    const formId = useId();
    /** Database connections using the tunnel; `null` while the confirmation is closed. */
    const [deleteUsage, setDeleteUsage] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const requestDelete = async () => {
        setDeleteError(null);
        let usage = 0;
        try {
            const saved = await invoke<SavedConnection[]>('get_connections');
            usage = saved.filter((c) => c.params.ssh_connection_id === connection?.id).length;
        } catch (error) {
            // Best-effort warning only — deletion is still confirmed by the user.
            console.error('Failed to count connections using SSH tunnel:', error);
        }
        setDeleteUsage(usage);
    };

    const confirmDelete = async () => {
        if (!connection) return;
        setDeleteUsage(null);
        try {
            await deleteSshConnection(connection.id);
            onDeleted?.(connection.id);
            onClose();
        } catch (error) {
            console.error('Failed to delete SSH connection:', error);
            setDeleteError(`${t('sshConnections.failDelete')}: ${toErrorMessage(error)}`);
        }
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={
                    connection
                        ? t('sshConnections.editTitle', {defaultValue: 'Edit SSH connection'})
                        : t('sshConnections.newTitle', {defaultValue: 'New SSH connection'})
                }
                icon={KeyRound}
                iconTone="accent"
                size="sm"
                zIndex={zIndex}
                bodyClassName="flex flex-col gap-4"
                footerStart={
                    connection && (
                        <Button
                            variant="ghost"
                            className="-ml-1.5 hover:text-tint-danger-fg"
                            icon={<Trash2 size={16} />}
                            onClick={() => void requestDelete()}
                        >
                            {t('sshConnections.delete')}
                        </Button>
                    )
                }
                footer={
                    <>
                        <Button variant="outline" onClick={onClose}>
                            {t('sshConnections.cancel')}
                        </Button>
                        <Button type="submit" form={formId}>
                            {connection ? t('sshConnections.update') : t('sshConnections.save')}
                        </Button>
                    </>
                }
            >
                {/* Remounted per opening so the form starts from the given connection. */}
                {isOpen && (
                    <SshConnectionForm
                        key={connection?.id ?? 'new'}
                        connection={connection}
                        formId={formId}
                        onSaved={(saved) => {
                            onSaved(saved);
                            onClose();
                        }}
                    />
                )}
                {deleteError && (
                    <p role="alert" className="text-xs text-tint-danger-fg">
                        {deleteError}
                    </p>
                )}
            </Modal>
            <ConfirmModal
                isOpen={deleteUsage !== null}
                onClose={() => setDeleteUsage(null)}
                title={t('sshConnections.delete')}
                message={
                    deleteUsage
                        ? `${t('sshConnections.confirmDelete')} ${t('sshConnections.deleteInUse', {count: deleteUsage})}`
                        : t('sshConnections.confirmDelete')
                }
                onConfirm={() => void confirmDelete()}
                zIndex={(zIndex ?? 100) + 10}
            />
        </>
    );
}
