import {useTranslation} from 'react-i18next';
import {ProxyOverrideEditor} from '@/components/settings/ProxyFields';
import {defaultProxyOverride, normalizeProxyOverride, proxyKeychainConnection} from '@/types/proxy';
import {Select} from '@/components/ui/Select';
import {Checkbox} from '@/components/ui/Checkbox';
import {FormSection} from '@/components/ui/FormSection';
import {SqlEditorWrapper} from '@/components/ui/SqlEditorWrapper';
import {useConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';

export function AdvancedSection() {
    const {t} = useTranslation();
    const {
        initialConnection,

        driver,
        isPostgresDialect,
        formData,
        proxyDraft,
        setProxyDraft,
        effectiveConnectionId,
        updateField,
    } = useConnectionFormContext();
    return (
        <div className="flex flex-col gap-8">
            <FormSection
                title={t('newConnection.startupScript', {defaultValue: 'Startup Script'})}
                description={t('newConnection.startupScriptDescription', {
                    defaultValue:
                        'SQL run on every new connection to this data source. Use it for session settings such as SET / set_config (e.g. bypassing RLS). Separate statements with semicolons.',
                })}
            >
                <div className="h-32 overflow-hidden rounded-md border border-strong">
                    <SqlEditorWrapper
                        editorKey={`startup-script-${initialConnection?.id ?? 'new'}`}
                        initialValue={formData.startup_script ?? ''}
                        onChange={(value) => updateField('startup_script', value)}
                        onRun={() => {}}
                        height="100%"
                        // A small form field, not the full query editor: compact text and gutters.
                        options={{
                            placeholder: t('newConnection.startupScriptPlaceholder', {
                                defaultValue: "SELECT set_config('app.bypass_rls', 'on', false);",
                            }),
                            fontSize: 12,
                            lineHeight: 18,
                            padding: {top: 8, bottom: 8},
                            lineNumbersMinChars: 3,
                            lineDecorationsWidth: 12,
                            glyphMargin: false,
                            folding: false,
                            renderLineHighlight: 'none',
                        }}
                    />
                </div>
                {/* MySQL: PIPES_AS_CONCAT compatibility (Vitess/PlanetScale) */}
                {driver === 'mysql' && (
                    <Checkbox
                        id="pipes-as-concat-toggle"
                        checked={formData.pipes_as_concat !== false}
                        onChange={(checked) =>
                            updateField('pipes_as_concat', checked ? undefined : false)
                        }
                        label={t('newConnection.pipesAsConcat', {
                            defaultValue: 'Set PIPES_AS_CONCAT sql_mode on connect',
                        })}
                        description={t('newConnection.pipesAsConcatHint', {
                            defaultValue:
                                'Leave enabled — Tabularis automatically skips it on servers that reject it (Vitess/PlanetScale).',
                        })}
                    />
                )}
            </FormSection>

            {/* PostgreSQL: pooler mode (PgBouncer transaction/session) */}
            {isPostgresDialect && (
                <FormSection
                    title={t('newConnection.poolerMode')}
                    description={
                        formData.pooler_mode === 'transaction'
                            ? t('newConnection.poolerModeTransactionHint')
                            : undefined
                    }
                >
                    <Select
                        value={formData.pooler_mode ?? 'none'}
                        options={['none', 'transaction', 'session']}
                        labels={{
                            none: t('newConnection.poolerModes.none'),
                            transaction: t('newConnection.poolerModes.transaction'),
                            session: t('newConnection.poolerModes.session'),
                        }}
                        onChange={(v) => updateField('pooler_mode', v === 'none' ? undefined : v)}
                        searchable={false}
                    />
                </FormSection>
            )}

            <FormSection
                title={t('settings.network.connectionProxy', {defaultValue: 'Proxy'})}
                description={t('settings.network.connectionProxyDesc', {
                    defaultValue:
                        'Override the global proxy for this connection’s database and SSH traffic. When an SSH tunnel is used, the proxy applies to the bastion hop; the local tunnel leg is not re-proxied.',
                })}
            >
                <ProxyOverrideEditor
                    value={
                        proxyDraft?.connectionId === effectiveConnectionId
                            ? proxyDraft.value
                            : (formData.proxy ?? defaultProxyOverride('inherit'))
                    }
                    onChange={(proxy) => {
                        // Keep an incomplete custom endpoint editable (choosing "Custom"
                        // before typing a host); only a valid override reaches the form.
                        setProxyDraft({connectionId: effectiveConnectionId, value: proxy});
                        updateField('proxy', normalizeProxyOverride(proxy));
                    }}
                    passwordSlot={
                        initialConnection?.id ? proxyKeychainConnection(initialConnection.id) : null
                    }
                />
                {!initialConnection?.id && formData.proxy?.mode === 'custom' && (
                    <p className="text-xs text-muted">
                        {t('settings.network.passwordAfterSave', {
                            defaultValue:
                                'Save the connection first to store a proxy password in the keychain.',
                        })}
                    </p>
                )}
            </FormSection>
        </div>
    );
}
