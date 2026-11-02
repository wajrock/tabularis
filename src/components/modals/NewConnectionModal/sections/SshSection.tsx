import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {AlertCircle, Check, FolderOpen, Loader2, Pencil, Plug, Plus, Square} from 'lucide-react';
import {open} from '@tauri-apps/plugin-dialog';
import {Button} from '@/components/ui/Button';
import {Checkbox} from '@/components/ui/Checkbox';
import {Field} from '@/components/ui/Field';
import {IconButton} from '@/components/ui/IconButton';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {Input, InputAction} from '@/components/ui/Input';
import {PasswordInput} from '@/components/ui/PasswordInput';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {SelectMenu} from '@/components/ui/SelectMenu';
import {SshConnectionModal} from '@/components/ssh/SshConnectionModal';
import type {SshConnection} from '@/utils/ssh';
import {FieldInput} from '@/components/modals/NewConnectionModal/fields/FieldInput';
import {useConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';

type SshMode = 'existing' | 'inline';

/** Above the connection modal, like its other nested dialogs. */
const SSH_EDITOR_Z_INDEX = 110;

export function SshSection() {
    const {t} = useTranslation();
    const {
        initialConnection,
        formData,
        setFormData,
        sshPasswordDirty,
        setSshPasswordDirty,
        sshConnections,
        loadSshConnectionsList,
        sshMode,
        setSshMode,
        sshTestStatus,
        sshTestMessage,
        sshTestError,
        setIsSshDiagnosticsOpen,
        sshSelectionError,
        isActionPending,
        isNetworkDriver,
        invalidateK8sDiscovery,
        invalidateInlineK8sTest,
        testSshTunnel,
        cancelSshTest,
        updateField,
        invalidateSshTest,
        updateSshField,
    } = useConnectionFormContext();
    /** `null`: closed; `'new'`: creating; otherwise the saved connection being edited. */
    const [editor, setEditor] = useState<SshConnection | 'new' | null>(null);
    const selectedSsh = sshConnections.find((conn) => conn.id === formData.ssh_connection_id);

    if (!isNetworkDriver) {
        return (
            <p className="text-xs text-muted">
                {t('newConnection.sshNotAvailable', {
                    defaultValue: 'SSH is not available for this driver.',
                })}
            </p>
        );
    }

    const setEnabled = (enabled: boolean) => {
        invalidateSshTest();
        setFormData((previous) => ({
            ...previous,
            ssh_enabled: enabled,
            ssh_port: enabled && !previous.ssh_port ? 22 : previous.ssh_port,
            k8s_enabled: enabled && previous.k8s_enabled ? false : previous.k8s_enabled,
            ssm_enabled: enabled && previous.ssm_enabled ? false : previous.ssm_enabled,
        }));
        if (enabled && formData.k8s_enabled) {
            invalidateK8sDiscovery();
            invalidateInlineK8sTest();
        }
    };

    const changeMode = (mode: SshMode) => {
        invalidateSshTest();
        setSshMode(mode);
        if (mode === 'existing') {
            updateField('ssh_host', undefined);
            updateField('ssh_user', undefined);
            updateField('ssh_password', undefined);
            updateField('ssh_key_file', undefined);
            updateField('ssh_key_passphrase', undefined);
            setSshPasswordDirty(false);
        } else {
            updateField('ssh_connection_id', undefined);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <Checkbox
                id="ssh-toggle"
                checked={!!formData.ssh_enabled}
                onChange={setEnabled}
                label={t('newConnection.useSsh')}
            />

            {formData.ssh_enabled && (
                <>
                    <SegmentedControl<SshMode>
                        ariaLabel={t('newConnection.sshSource', {
                            defaultValue: 'SSH tunnel source',
                        })}
                        value={sshMode}
                        onChange={changeMode}
                        options={[
                            {value: 'existing', label: t('newConnection.useSshConnection')},
                            {value: 'inline', label: t('newConnection.createInlineSsh')},
                        ]}
                    />

                    {/* Saved SSH connection: pick one, or create / edit it in place */}
                    {sshMode === 'existing' && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-secondary">
                                {t('newConnection.selectSshConnection')}
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <SelectMenu
                                        ariaLabel={t('newConnection.selectSshConnection')}
                                        value={formData.ssh_connection_id ?? ''}
                                        onChange={(id) => updateSshField('ssh_connection_id', id)}
                                        placeholder={
                                            sshConnections.length === 0
                                                ? t('newConnection.noSshConnections')
                                                : t('newConnection.selectSshConnection')
                                        }
                                        options={sshConnections.map((conn) => ({
                                            value: conn.id,
                                            label: `${conn.name} · ${conn.user}@${conn.host}:${conn.port}`,
                                        }))}
                                    />
                                </div>
                                {selectedSsh && (
                                    <IconButton
                                        size="md"
                                        label={t('sshConnections.edit')}
                                        onClick={() => setEditor(selectedSsh)}
                                        className="border border-strong"
                                    >
                                        <Pencil size={14} />
                                    </IconButton>
                                )}
                                <Button
                                    variant="outline"
                                    className="h-8"
                                    icon={<Plus size={14} />}
                                    onClick={() => setEditor('new')}
                                >
                                    {t('sshConnections.new', {defaultValue: 'New'})}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Custom SSH settings for this connection only */}
                    {sshMode === 'inline' && (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-[1fr_96px] gap-3">
                                <FieldInput
                                    label={t('newConnection.sshHost')}
                                    value={formData.ssh_host}
                                    onChange={(v) => updateSshField('ssh_host', v)}
                                    placeholder="ssh.example.com"
                                />
                                <FieldInput
                                    label={t('newConnection.sshPort')}
                                    value={formData.ssh_port}
                                    onChange={(v) => updateSshField('ssh_port', Number(v))}
                                    type="number"
                                    placeholder="22"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FieldInput
                                    label={t('newConnection.sshUser')}
                                    value={formData.ssh_user}
                                    onChange={(v) => updateSshField('ssh_user', v)}
                                    placeholder="user"
                                />
                                <Field
                                    label={t('newConnection.sshPassword')}
                                    error={
                                        formData.save_in_keychain &&
                                        sshPasswordDirty &&
                                        !formData.ssh_password
                                            ? t('newConnection.sshPasswordMissing')
                                            : undefined
                                    }
                                >
                                    <PasswordInput
                                        value={formData.ssh_password ?? ''}
                                        onChange={(value) => {
                                            setSshPasswordDirty(true);
                                            updateSshField('ssh_password', value);
                                        }}
                                        placeholder={
                                            initialConnection &&
                                            !sshPasswordDirty &&
                                            !formData.ssh_password
                                                ? '••••••••'
                                                : t('newConnection.sshPasswordPlaceholder')
                                        }
                                    />
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label={t('newConnection.sshKeyFile')}>
                                    <Input
                                        value={formData.ssh_key_file ?? ''}
                                        onChange={(e) =>
                                            updateSshField('ssh_key_file', e.target.value)
                                        }
                                        placeholder={t('newConnection.sshKeyFilePlaceholder')}
                                        trailing={
                                            <InputAction
                                                label={t('newConnection.browseFile', {
                                                    defaultValue: 'Browse',
                                                })}
                                                onClick={async () => {
                                                    const selected = await open({multiple: false});
                                                    if (selected)
                                                        updateSshField('ssh_key_file', selected);
                                                }}
                                            >
                                                <FolderOpen size={14} />
                                            </InputAction>
                                        }
                                    />
                                </Field>
                                <FieldInput
                                    label={t('newConnection.sshKeyPassphrase')}
                                    value={formData.ssh_key_passphrase}
                                    onChange={(v) => updateSshField('ssh_key_passphrase', v)}
                                    type="password"
                                    placeholder={t('newConnection.sshKeyPassphrasePlaceholder')}
                                />
                            </div>
                            <Checkbox
                                id="ssh-prompt-toggle"
                                checked={!!formData.ssh_allow_passphrase_prompt}
                                onChange={(checked) =>
                                    updateSshField('ssh_allow_passphrase_prompt', checked)
                                }
                                label={t('newConnection.allowSshPrompt')}
                            />
                        </div>
                    )}

                    {/* SSH-only test: verifies the tunnel without touching the database */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={testSshTunnel}
                                disabled={sshTestStatus === 'testing' || isActionPending}
                                icon={
                                    sshTestStatus === 'testing' ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Plug size={14} />
                                    )
                                }
                            >
                                {t('newConnection.testSsh')}
                            </Button>
                            {sshTestStatus === 'testing' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={cancelSshTest}
                                    icon={<Square size={12} />}
                                >
                                    {t('newConnection.stopTest')}
                                </Button>
                            )}
                            <span className="text-xs text-muted">
                                {t('newConnection.testSshHint')}
                            </span>
                        </div>

                        {sshSelectionError && (
                            <InlineBanner tone="red" role="alert" icon={<AlertCircle size={14} />}>
                                {sshSelectionError}
                            </InlineBanner>
                        )}
                        {sshTestStatus === 'success' && sshTestMessage && (
                            <InlineBanner tone="green" role="status" icon={<Check size={14} />}>
                                {sshTestMessage}
                            </InlineBanner>
                        )}
                        {sshTestStatus === 'error' && sshTestError && (
                            <InlineBanner tone="red" role="alert" icon={<AlertCircle size={14} />}>
                                <span className="flex flex-wrap items-baseline gap-x-2">
                                    {t(sshTestError.summaryKey)}
                                    <button
                                        type="button"
                                        onClick={() => setIsSshDiagnosticsOpen(true)}
                                        className="font-medium underline underline-offset-2"
                                    >
                                        {t('common.showDetails')}
                                    </button>
                                </span>
                            </InlineBanner>
                        )}
                    </div>
                </>
            )}

            <SshConnectionModal
                isOpen={editor !== null}
                onClose={() => setEditor(null)}
                connection={editor === 'new' ? null : editor}
                onSaved={(saved) => {
                    void loadSshConnectionsList();
                    updateSshField('ssh_connection_id', saved.id);
                }}
                onDeleted={(id) => {
                    void loadSshConnectionsList();
                    if (formData.ssh_connection_id === id) {
                        updateSshField('ssh_connection_id', undefined);
                    }
                }}
                zIndex={SSH_EDITOR_Z_INDEX}
            />
        </div>
    );
}
