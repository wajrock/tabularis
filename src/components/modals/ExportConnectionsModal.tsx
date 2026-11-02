import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Download, EyeOff, FileWarning, Loader2, Lock} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {FormSection} from '@/components/ui/FormSection';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {Modal} from '@/components/ui/Modal';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {PasswordInput} from '@/components/ui/PasswordInput';

export type ExportMode = 'encrypted' | 'noSecrets' | 'plaintext';

interface ExportConnectionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (mode: ExportMode, password?: string) => Promise<void>;
    /** When > 0, only that many selected connections will be exported. */
    selectedCount?: number;
    /** Number of saved connections, exported when nothing is selected. */
    totalCount?: number;
}

/**
 * Export of the saved connections: how passwords are handled, then the file
 * password when the export is encrypted. The count is in the Export button.
 */
export const ExportConnectionsModal = ({
    isOpen,
    onClose,
    onExport,
    selectedCount = 0,
    totalCount = 0,
}: ExportConnectionsModalProps) => {
    const {t} = useTranslation();
    const [mode, setMode] = useState<ExportMode>('encrypted');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const reset = () => {
        setPassword('');
        setConfirmPassword('');
        setSubmitted(false);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const options = [
        {
            value: 'encrypted' as const,
            icon: Lock,
            label: t('connections.exportModal.modeEncrypted'),
        },
        {
            value: 'noSecrets' as const,
            icon: EyeOff,
            label: t('connections.exportModal.modeNoSecrets'),
        },
        {
            value: 'plaintext' as const,
            icon: FileWarning,
            label: t('connections.exportModal.modePlaintext'),
        },
    ];
    const exportCount = selectedCount > 0 ? selectedCount : totalCount;

    // Required shows once Export was pressed; a mismatch as soon as the confirmation is typed.
    const passwordError =
        submitted && !password ? t('connections.exportModal.passwordRequired') : undefined;
    const confirmError =
        (confirmPassword || submitted) && password && password !== confirmPassword
            ? t('connections.exportModal.passwordMismatch')
            : undefined;

    const handleExport = async () => {
        if (mode === 'encrypted' && (!password || password !== confirmPassword)) {
            setSubmitted(true);
            return;
        }
        setLoading(true);
        try {
            await onExport(mode, mode === 'encrypted' ? password : undefined);
            reset();
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('connections.exportModal.title')}
            icon={Download}
            iconTone="accent"
            size="sm"
            busy={loading}
            bodyClassName="flex flex-col gap-5"
            footer={
                <>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={() => void handleExport()}
                        disabled={loading}
                        icon={
                            loading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Download size={16} />
                            )
                        }
                    >
                        {exportCount > 0
                            ? t('connections.exportModal.exportCount', {count: exportCount})
                            : t('connections.exportModal.export')}
                    </Button>
                </>
            }
        >
            <FormSection title={t('connections.exportModal.passwordsTitle')}>
                <SegmentedControl
                    options={options}
                    value={mode}
                    onChange={setMode}
                    ariaLabel={t('connections.exportModal.passwordsTitle')}
                    className="w-full [&>button]:flex-1"
                />
                {mode === 'plaintext' ? (
                    <InlineBanner tone="amber" icon={<FileWarning size={14} />}>
                        {t('connections.exportModal.plaintextDesc')}
                    </InlineBanner>
                ) : (
                    <p className="text-xs text-muted">
                        {mode === 'encrypted'
                            ? t('connections.exportModal.encryptedDesc')
                            : t('connections.exportModal.noSecretsDesc')}
                    </p>
                )}
            </FormSection>

            {mode === 'encrypted' && (
                <FormSection
                    title={t('connections.exportModal.filePasswordTitle')}
                    description={t('connections.exportModal.filePasswordDesc')}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t('connections.exportModal.password')} error={passwordError}>
                            <PasswordInput value={password} onChange={setPassword} autoFocus />
                        </Field>
                        <Field
                            label={t('connections.exportModal.confirmPassword')}
                            error={confirmError}
                        >
                            <PasswordInput value={confirmPassword} onChange={setConfirmPassword} />
                        </Field>
                    </div>
                </FormSection>
            )}
        </Modal>
    );
};
