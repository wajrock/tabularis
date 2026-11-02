import {useTranslation} from 'react-i18next';
import {EyeOff} from 'lucide-react';
import {MaskingOverridesEditor} from '@/components/settings/MaskingOverridesEditor';
import {FormSection} from '@/components/ui/FormSection';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {useConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';

export function PrivacySection() {
    const {t} = useTranslation();
    const {initialConnection, settings} = useConnectionFormContext();
    return initialConnection ? (
        <FormSection
            title={t('settings.maskingOverrides')}
            description={t('settings.maskingOverridesDesc')}
        >
            {!(settings.columnMaskingEnabled ?? true) && (
                <InlineBanner tone="amber" icon={<EyeOff size={14} />}>
                    {t('settings.maskingDisabledNotice')}
                </InlineBanner>
            )}
            <MaskingOverridesEditor
                key={initialConnection.id}
                connectionId={initialConnection.id}
                layout="fields"
            />
        </FormSection>
    ) : null;
}
