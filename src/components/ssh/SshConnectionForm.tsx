import {useState, type FormEvent} from 'react';
import {useTranslation} from 'react-i18next';
import {AlertCircle, Check, FolderOpen, Loader2, Plug} from 'lucide-react';
import {open} from '@tauri-apps/plugin-dialog';
import {Button} from '@/components/ui/Button';
import {Checkbox} from '@/components/ui/Checkbox';
import {Field} from '@/components/ui/Field';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {Input, InputAction} from '@/components/ui/Input';
import {PasswordInput} from '@/components/ui/PasswordInput';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {
    saveSshConnection,
    testSshConnection,
    updateSshConnection,
    validateSshConnection,
    type SshConnection,
} from '@/utils/ssh';
import {toErrorMessage} from '@/utils/errors';

type AuthType = 'password' | 'ssh_key';

interface SshConnectionFormProps {
    /** Connection being edited; omitted to create one. */
    connection?: SshConnection | null;
    /** Id of the <form>, so a modal footer button can submit it. */
    formId: string;
    onSaved: (connection: SshConnection) => void;
}

const EMPTY: Partial<SshConnection> = {port: 22, auth_type: 'password', save_in_keychain: true};

/** Older connections have no auth_type: a key file means key authentication. */
function withAuthType(connection: SshConnection): Partial<SshConnection> {
    return {
        ...connection,
        auth_type:
            connection.auth_type ||
            (connection.key_file && connection.key_file.trim() !== '' ? 'ssh_key' : 'password'),
    };
}

/**
 * Create or edit a saved SSH connection, with a tunnel test. When editing, an
 * untouched password or passphrase is not sent: the backend reads it from the keychain.
 */
export function SshConnectionForm({connection, formId, onSaved}: SshConnectionFormProps) {
    const {t} = useTranslation();
    const editingId = connection?.id ?? null;
    const [formData, setFormData] = useState<Partial<SshConnection>>(() =>
        connection ? withAuthType(connection) : EMPTY,
    );
    const [passwordDirty, setPasswordDirty] = useState(false);
    const [passphraseDirty, setPassphraseDirty] = useState(false);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const updateField = <K extends keyof SshConnection>(field: K, value: SshConnection[K]) =>
        setFormData((prev) => ({...prev, [field]: value}));

    /** Drops untouched secrets of an edited connection so the keychain copy is kept. */
    const withSecrets = (data: Partial<SshConnection>): Partial<SshConnection> => {
        const next = {...data};
        if (!editingId) return next;
        if (next.auth_type === 'password') {
            if (!passwordDirty) delete next.password;
            else if (!next.password) next.password = '';
        }
        if (next.auth_type === 'ssh_key') {
            if (!passphraseDirty) delete next.key_passphrase;
            else if (!next.key_passphrase) next.key_passphrase = '';
        }
        return next;
    };

    const handleTest = async () => {
        setTestStatus('testing');
        setMessage('');
        try {
            const result = await testSshConnection(
                withSecrets({...formData, ...(editingId ? {id: editingId} : {})}),
            );
            setTestStatus('success');
            setMessage(result);
        } catch (error) {
            console.error('SSH test failed:', error);
            setTestStatus('error');
            setMessage(toErrorMessage(error));
        }
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const validation = validateSshConnection(formData, {
            allowEmptyPassword: !!editingId && !passwordDirty && !formData.password?.trim(),
        });
        if (!validation.isValid) {
            setTestStatus('error');
            setMessage(validation.error || t('sshConnections.fillRequired'));
            return;
        }
        const sshData = withSecrets({
            host: formData.host,
            port: formData.port || 22,
            user: formData.user,
            auth_type: formData.auth_type,
            password: formData.password,
            key_file: formData.key_file,
            key_passphrase: formData.key_passphrase,
            allow_passphrase_prompt: formData.allow_passphrase_prompt,
            save_in_keychain: formData.save_in_keychain,
        });
        try {
            const saved = editingId
                ? await updateSshConnection(editingId, formData.name!, sshData)
                : await saveSshConnection(formData.name!, sshData);
            onSaved(saved ?? ({...formData, id: editingId} as SshConnection));
        } catch (error) {
            console.error('Failed to save SSH connection:', error);
            setTestStatus('error');
            setMessage(t('sshConnections.failSave'));
        }
    };

    const keychainHint =
        editingId && formData.save_in_keychain ? t('sshConnections.savedInKeychain') : undefined;

    return (
        <form id={formId} onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <Field label={t('sshConnections.name')}>
                <Input
                    value={formData.name ?? ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder={t('sshConnections.namePlaceholder')}
                    autoFocus
                />
            </Field>

            <div className="grid grid-cols-[1fr_96px] gap-3">
                <Field label={t('newConnection.sshHost')}>
                    <Input
                        value={formData.host ?? ''}
                        onChange={(e) => updateField('host', e.target.value)}
                        placeholder="ssh.example.com"
                    />
                </Field>
                <Field label={t('newConnection.sshPort')}>
                    <Input
                        type="number"
                        value={formData.port ?? ''}
                        onChange={(e) => updateField('port', parseInt(e.target.value) || 22)}
                        placeholder="22"
                    />
                </Field>
            </div>

            <Field label={t('newConnection.sshUser')}>
                <Input
                    value={formData.user ?? ''}
                    onChange={(e) => updateField('user', e.target.value)}
                    placeholder="user"
                />
            </Field>

            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-secondary">
                    {t('sshConnections.authType')}
                </span>
                <SegmentedControl<AuthType>
                    ariaLabel={t('sshConnections.authType')}
                    value={(formData.auth_type as AuthType) || 'password'}
                    onChange={(value) => updateField('auth_type', value)}
                    options={[
                        {value: 'password', label: t('sshConnections.authTypePassword')},
                        {value: 'ssh_key', label: t('sshConnections.authTypeSshKey')},
                    ]}
                />
            </div>

            {formData.auth_type === 'ssh_key' ? (
                <>
                    <Field label={t('newConnection.sshKeyFile')}>
                        <Input
                            value={formData.key_file ?? ''}
                            onChange={(e) => updateField('key_file', e.target.value)}
                            placeholder={t('newConnection.sshKeyFilePlaceholder')}
                            trailing={
                                <InputAction
                                    label={t('newConnection.browseFile', {defaultValue: 'Browse'})}
                                    onClick={async () => {
                                        const selected = await open({multiple: false});
                                        if (selected) updateField('key_file', selected);
                                    }}
                                >
                                    <FolderOpen size={14} />
                                </InputAction>
                            }
                        />
                    </Field>
                    <Field
                        label={t('newConnection.sshKeyPassphrase')}
                        hint={!passphraseDirty ? keychainHint : undefined}
                    >
                        <PasswordInput
                            value={formData.key_passphrase ?? ''}
                            onChange={(value) => {
                                setPassphraseDirty(true);
                                updateField('key_passphrase', value);
                            }}
                            placeholder={
                                editingId && !passphraseDirty && !formData.key_passphrase
                                    ? '••••••••'
                                    : t('newConnection.sshKeyPassphrasePlaceholder')
                            }
                        />
                    </Field>
                </>
            ) : (
                <Field
                    label={t('newConnection.sshPassword')}
                    hint={!passwordDirty ? keychainHint : undefined}
                >
                    <PasswordInput
                        value={formData.password ?? ''}
                        onChange={(value) => {
                            setPasswordDirty(true);
                            updateField('password', value);
                        }}
                        placeholder={
                            editingId && !passwordDirty && !formData.password
                                ? '••••••••'
                                : t('newConnection.sshPasswordPlaceholder')
                        }
                    />
                </Field>
            )}

            <div className="flex flex-col gap-3">
                <Checkbox
                    checked={!!formData.save_in_keychain}
                    onChange={(checked) => {
                        // Toggling the storage re-sends the secrets, even empty ones.
                        setPasswordDirty(true);
                        setPassphraseDirty(true);
                        setFormData((prev) => ({
                            ...prev,
                            save_in_keychain: checked,
                            password:
                                prev.auth_type === 'password' ? prev.password || '' : prev.password,
                            key_passphrase:
                                prev.auth_type === 'ssh_key'
                                    ? prev.key_passphrase || ''
                                    : prev.key_passphrase,
                        }));
                    }}
                    label={t('newConnection.saveKeychain')}
                    description={
                        !formData.save_in_keychain && (
                            <span className="text-tint-warning-fg">
                                {t('newConnection.secretsStoredInPlainText')}
                            </span>
                        )
                    }
                />
                <Checkbox
                    checked={!!formData.allow_passphrase_prompt}
                    onChange={(checked) => updateField('allow_passphrase_prompt', checked)}
                    label={t('newConnection.allowSshPrompt')}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => void handleTest()}
                    disabled={testStatus === 'testing'}
                    icon={
                        testStatus === 'testing' ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Plug size={14} />
                        )
                    }
                >
                    {t('newConnection.testConnection')}
                </Button>
                {message && testStatus !== 'testing' && (
                    <InlineBanner
                        tone={testStatus === 'success' ? 'green' : 'red'}
                        role={testStatus === 'success' ? 'status' : 'alert'}
                        icon={
                            testStatus === 'success' ? (
                                <Check size={14} />
                            ) : (
                                <AlertCircle size={14} />
                            )
                        }
                    >
                        <span className="break-words">{message}</span>
                    </InlineBanner>
                )}
            </div>
        </form>
    );
}
