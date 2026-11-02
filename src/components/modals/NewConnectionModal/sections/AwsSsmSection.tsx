import {useTranslation} from 'react-i18next';
import {AlertCircle, Check, Info, Loader2, Plug} from 'lucide-react';
import {resolveSsmDocument} from '@/utils/ssm';
import {Button} from '@/components/ui/Button';
import {Checkbox} from '@/components/ui/Checkbox';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {FieldInput} from '@/components/modals/NewConnectionModal/fields/FieldInput';
import {useConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';

export function AwsSsmSection() {
    const {t} = useTranslation();
    const {
        formData,
        ssmTestStatus,
        ssmTestMessage,
        ssmSelectionError,
        isActionPending,
        isNetworkDriver,
        handleSsmEnabledChange,
        updateSsmField,
        testSsmTunnel,
    } = useConnectionFormContext();

    if (!isNetworkDriver) {
        return <p className="text-xs text-muted">{t('newConnection.ssmNotAvailable')}</p>;
    }

    return (
        <div className="flex flex-col gap-4">
            <Checkbox
                id="ssm-toggle"
                checked={!!formData.ssm_enabled}
                onChange={handleSsmEnabledChange}
                label={t('newConnection.useSsm')}
            />

            {formData.ssm_enabled && (
                <>
                    <FieldInput
                        label={t('newConnection.ssmTarget')}
                        value={formData.ssm_target}
                        onChange={(v) => updateSsmField('ssm_target', v)}
                        placeholder="i-0123456789abcdef0"
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <FieldInput
                            label={t('newConnection.ssmProfile')}
                            value={formData.ssm_profile}
                            onChange={(v) => updateSsmField('ssm_profile', v)}
                            placeholder="default"
                        />
                        <FieldInput
                            label={t('newConnection.ssmRegion')}
                            value={formData.ssm_region}
                            onChange={(v) => updateSsmField('ssm_region', v)}
                            placeholder="eu-west-1"
                        />
                    </div>

                    {/* Where the session forwards to, and the IAM permission it needs */}
                    <InlineBanner tone="neutral" icon={<Info size={14} />}>
                        <span className="flex flex-col gap-1">
                            <span>
                                {t('newConnection.ssmForwardHint', {
                                    document: resolveSsmDocument(formData.host),
                                    host: formData.host?.trim() || 'localhost',
                                    port: formData.port ?? '',
                                })}
                            </span>
                            <span>{t('newConnection.ssmIamHint')}</span>
                        </span>
                    </InlineBanner>

                    {/* SSM-only test: opens a session without touching the database */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={testSsmTunnel}
                                disabled={ssmTestStatus === 'testing' || isActionPending}
                                icon={
                                    ssmTestStatus === 'testing' ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Plug size={14} />
                                    )
                                }
                            >
                                {t('newConnection.testSsm')}
                            </Button>
                            <span className="text-xs text-muted">
                                {t('newConnection.testSsmHint')}
                            </span>
                        </div>

                        {ssmSelectionError && (
                            <InlineBanner tone="red" role="alert" icon={<AlertCircle size={14} />}>
                                {ssmSelectionError}
                            </InlineBanner>
                        )}
                        {ssmTestStatus === 'success' && ssmTestMessage && (
                            <InlineBanner tone="green" role="status" icon={<Check size={14} />}>
                                {ssmTestMessage}
                            </InlineBanner>
                        )}
                        {ssmTestStatus === 'error' && ssmTestMessage && (
                            <InlineBanner tone="red" role="alert" icon={<AlertCircle size={14} />}>
                                <span className="break-words">{ssmTestMessage}</span>
                            </InlineBanner>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
