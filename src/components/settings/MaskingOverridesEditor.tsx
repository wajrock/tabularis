import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useSettings} from '@/hooks/useSettings';
import {normalizeMaskingPatterns} from '@/utils/columnMasking';
import {FormSection} from '@/components/ui/FormSection';
import {Textarea} from '@/components/ui/Textarea';
import {SettingRow} from './SettingControls';

interface MaskingOverridesEditorProps {
    /** Saved connection the include/exclude lists apply to. */
    connectionId: string;
    /** `rows`: Settings page rows; `fields`: stacked titled parts (connection modal). */
    layout?: 'rows' | 'fields';
}

/**
 * Per-connection masking overrides (#485): "always mask" (include) and
 * "never mask" (exclude) lists, one `table.column` entry per line. Shared by
 * the Settings → Privacy tab and the connection modal's Privacy section.
 *
 * Pass `key={connectionId}` from the caller so switching connections remounts
 * with fresh drafts.
 */
export function MaskingOverridesEditor({
    connectionId,
    layout = 'rows',
}: MaskingOverridesEditorProps) {
    const {t} = useTranslation();
    const {settings, updateSetting} = useSettings();

    const maskingEnabled = settings.columnMaskingEnabled ?? true;
    const overrides = settings.columnMaskingOverrides ?? {};
    const connOverride = overrides[connectionId] ?? {};
    const include = connOverride.include ?? [];
    const exclude = connOverride.exclude ?? [];

    // Textareas edit a draft and commit normalized values on blur so typing
    // trailing newlines doesn't fight the controlled value.
    const [includeDraft, setIncludeDraft] = useState<string | null>(null);
    const [excludeDraft, setExcludeDraft] = useState<string | null>(null);

    const commitOverride = (field: 'include' | 'exclude', raw: string) => {
        const list = normalizeMaskingPatterns(raw.split('\n'));
        const next = {...overrides};
        const entry = {...next[connectionId], [field]: list};
        if (!entry.include?.length && !entry.exclude?.length) {
            delete next[connectionId];
        } else {
            next[connectionId] = entry;
        }
        updateSetting('columnMaskingOverrides', next);
    };

    const lists = [
        {
            field: 'include' as const,
            label: t('settings.maskingInclude'),
            description: t('settings.maskingIncludeDesc'),
            value: includeDraft ?? include.join('\n'),
            setDraft: setIncludeDraft,
            draft: includeDraft,
        },
        {
            field: 'exclude' as const,
            label: t('settings.maskingExclude'),
            description: t('settings.maskingExcludeDesc'),
            value: excludeDraft ?? exclude.join('\n'),
            setDraft: setExcludeDraft,
            draft: excludeDraft,
        },
    ];

    const textarea = (list: (typeof lists)[number]) => (
        <Textarea
            value={list.value}
            disabled={!maskingEnabled}
            onChange={(e) => list.setDraft(e.target.value)}
            onBlur={() => {
                if (list.draft !== null) {
                    commitOverride(list.field, list.draft);
                    list.setDraft(null);
                }
            }}
            className="h-28 text-[12px]"
            placeholder={t('settings.maskingOverridePlaceholder')}
        />
    );

    if (layout === 'fields') {
        return (
            <div className="flex flex-col gap-6">
                {lists.map((list) => (
                    <FormSection
                        key={list.field}
                        size="sm"
                        title={list.label}
                        description={list.description}
                    >
                        {textarea(list)}
                    </FormSection>
                ))}
            </div>
        );
    }

    return (
        <>
            {lists.map((list) => (
                <SettingRow
                    key={list.field}
                    label={list.label}
                    description={list.description}
                    vertical
                >
                    {textarea(list)}
                </SettingRow>
            ))}
        </>
    );
}
