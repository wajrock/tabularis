import {useTranslation} from 'react-i18next';
import {FolderOpen} from 'lucide-react';
import {open} from '@tauri-apps/plugin-dialog';
import {Checkbox} from '@/components/ui/Checkbox';
import {Field} from '@/components/ui/Field';
import {FormSection} from '@/components/ui/FormSection';
import {Input, InputAction} from '@/components/ui/Input';
import {SelectMenu} from '@/components/ui/SelectMenu';
import {
    shouldShowUnverifiedSslHint,
    suggestedVerifyingSslMode,
    type SslModeFamily,
} from '@/utils/sslMode';
import {useConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';

const MYSQL_ENFORCED_TLS = ['required', 'verify_ca', 'verify_identity'];

const CERT_FILTERS = [
    {name: 'Certificate Files', extensions: ['pem', 'crt', 'cer', 'der']},
    {name: 'All Files', extensions: ['*']},
];
const KEY_FILTERS = [
    {name: 'Key Files', extensions: ['pem', 'key']},
    {name: 'All Files', extensions: ['*']},
];

/** Path field of a certificate or key, with a browse button inside it. */
function CertificateField({
    label,
    value,
    onChange,
    placeholder,
    filters,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    filters: {name: string; extensions: string[]}[];
}) {
    const {t} = useTranslation();
    return (
        <Field label={label}>
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                trailing={
                    <InputAction
                        label={t('newConnection.browseFile', {defaultValue: 'Browse'})}
                        onClick={async () => {
                            const selected = await open({
                                multiple: false,
                                directory: false,
                                filters,
                            });
                            if (selected) onChange(selected);
                        }}
                    >
                        <FolderOpen size={14} />
                    </InputAction>
                }
            />
        </Field>
    );
}

export function SslSection() {
    const {t} = useTranslation();
    const {sslModeSelectId, sslModeHintId, driver, isPostgresDialect, formData, updateField} =
        useConnectionFormContext();
    const selectedSslMode =
        formData.ssl_mode ||
        (driver === 'clickhouse' ? 'disable' : isPostgresDialect ? 'prefer' : 'required');
    const sslModeFamily: SslModeFamily | null =
        driver === 'clickhouse' ? null : isPostgresDialect ? 'postgres' : 'mysql';
    const showUnverifiedSslHint =
        sslModeFamily !== null &&
        shouldShowUnverifiedSslHint(formData.host, selectedSslMode, sslModeFamily);
    const suggestedSslMode =
        sslModeFamily === null ? null : suggestedVerifyingSslMode(sslModeFamily);
    const sslModeLabels: Record<string, string> =
        driver === 'clickhouse'
            ? {
                  disable: t('newConnection.sslModes.disable', {
                      defaultValue: 'Disable',
                  }),
                  require: t('newConnection.sslModes.require', {
                      defaultValue: 'Require',
                  }),
              }
            : isPostgresDialect
              ? {
                    disable: t('newConnection.sslModes.disable', {
                        defaultValue: 'Disable',
                    }),
                    allow: t('newConnection.sslModes.allow', {
                        defaultValue: 'Allow',
                    }),
                    prefer: t('newConnection.sslModes.prefer', {
                        defaultValue: 'Prefer',
                    }),
                    require: t('newConnection.sslModes.require', {
                        defaultValue: 'Require',
                    }),
                    'verify-ca': t('newConnection.sslModes.verify-ca', {
                        defaultValue: 'Verify CA',
                    }),
                    'verify-full': t('newConnection.sslModes.verify-full', {
                        defaultValue: 'Verify Full',
                    }),
                }
              : {
                    disabled: t('newConnection.sslModes.disabled', {
                        defaultValue: 'Disabled',
                    }),
                    preferred: t('newConnection.sslModes.preferred', {
                        defaultValue: 'Preferred',
                    }),
                    required: t('newConnection.sslModes.required', {
                        defaultValue: 'Required',
                    }),
                    verify_ca: t('newConnection.sslModes.verify_ca', {
                        defaultValue: 'Verify CA',
                    }),
                    verify_identity: t('newConnection.sslModes.verify_identity', {
                        defaultValue: 'Verify Identity',
                    }),
                };
    const sslModeOptions = (
        driver === 'clickhouse'
            ? ['disable', 'require']
            : isPostgresDialect
              ? ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']
              : ['disabled', 'preferred', 'required', 'verify_ca', 'verify_identity']
    ).map((mode) => ({
        value: mode,
        label: sslModeLabels[mode] ?? mode,
    }));
    // MySQL options that send credentials need enforced TLS (`required` by default).
    const mysqlTlsOff = !MYSQL_ENFORCED_TLS.includes(formData.ssl_mode || 'required');

    return (
        <div className="space-y-4">
            <p className="text-xs text-muted">
                {t('newConnection.sslDescription', {
                    defaultValue: 'Configure SSL/TLS for secure database connections (optional).',
                })}
            </p>

            {/* SSL Mode */}
            <div className="flex flex-col gap-1.5">
                <label htmlFor={sslModeSelectId} className="text-xs font-medium text-secondary">
                    {t('newConnection.sslMode', {defaultValue: 'SSL Mode'})}
                </label>
                <SelectMenu
                    id={sslModeSelectId}
                    ariaDescribedBy={showUnverifiedSslHint ? sslModeHintId : undefined}
                    value={selectedSslMode}
                    options={sslModeOptions}
                    onChange={(v) => {
                        updateField('ssl_mode', v);
                        // Cleartext auth and RDS IAM must never go over a TLS-off
                        // connection. `Preferred` is also TLS-off for our purposes
                        // (opportunistic — the backend force-upgrades it to Required
                        // for IAM, but the UI must reflect what the user picked so
                        // the persisted value matches the visible checkbox).
                        if (driver === 'mysql') {
                            const effectiveSslMode = v || 'required';
                            const tlsOff = !MYSQL_ENFORCED_TLS.includes(effectiveSslMode);
                            if (tlsOff) {
                                updateField('enable_cleartext_plugin', false);
                                updateField('use_iam_auth', false);
                            }
                        }
                    }}
                />
                {showUnverifiedSslHint && suggestedSslMode && (
                    <p id={sslModeHintId} className="text-xs text-tint-warning-fg">
                        {t('newConnection.sslUnverifiedRemoteHint', {
                            mode: suggestedSslMode,
                            defaultValue:
                                'This mode does not verify the server certificate. For a remote host, use {{mode}}.',
                        })}
                    </p>
                )}
            </div>

            {/* SSL Certificate Files */}
            {formData.ssl_mode &&
                formData.ssl_mode !== 'disable' &&
                formData.ssl_mode !== 'disabled' && (
                    <FormSection
                        size="sm"
                        title={t('newConnection.sslCertificates', {defaultValue: 'Certificates'})}
                        description={t('newConnection.sslCertificatesOptional', {
                            defaultValue:
                                'Certificate paths are optional. Leave empty to use system defaults.',
                        })}
                    >
                        <CertificateField
                            label={t('newConnection.sslCa', {defaultValue: 'CA Certificate'})}
                            value={formData.ssl_ca || ''}
                            onChange={(v) => updateField('ssl_ca', v)}
                            placeholder="/path/to/ca-cert.pem"
                            filters={CERT_FILTERS}
                        />
                        <CertificateField
                            label={t('newConnection.sslCert', {defaultValue: 'Client Certificate'})}
                            value={formData.ssl_cert || ''}
                            onChange={(v) => updateField('ssl_cert', v)}
                            placeholder="/path/to/client-cert.pem"
                            filters={CERT_FILTERS}
                        />
                        <CertificateField
                            label={t('newConnection.sslKey', {defaultValue: 'Client Key'})}
                            value={formData.ssl_key || ''}
                            onChange={(v) => updateField('ssl_key', v)}
                            placeholder="/path/to/client-key.pem"
                            filters={KEY_FILTERS}
                        />
                    </FormSection>
                )}

            {/* MySQL authentication options. Rendered outside the certificate block so
          they stay reachable for new connections (where formData.ssl_mode is "" and
          the cert block is hidden), and so that switching SSL to Disabled doesn't
          unmount them while the underlying flag is still true. Both need enforced
          TLS: `Preferred` only attempts TLS and can fall back to plaintext, which
          matches the backend (build_mysql_options). */}
            {driver === 'mysql' && (
                <div className="flex flex-col gap-3">
                    <Checkbox
                        id="iam-auth-toggle"
                        checked={!mysqlTlsOff && !!formData.use_iam_auth}
                        disabled={mysqlTlsOff}
                        onChange={(checked) => updateField('use_iam_auth', checked)}
                        label={t('newConnection.useIamAuth', {
                            defaultValue: 'Use AWS IAM Authentication (RDS)',
                        })}
                        description={
                            formData.use_iam_auth && mysqlTlsOff ? (
                                <span className="text-tint-warning-fg">
                                    {t('newConnection.useIamAuthTlsRequired', {
                                        defaultValue:
                                            'Select an enforced TLS mode above (Required, Verify CA, or Verify Identity) to use AWS IAM authentication.',
                                    })}
                                </span>
                            ) : (
                                t('newConnection.useIamAuthHint', {
                                    defaultValue:
                                        'The password field is treated as an RDS auth token (from `aws rds generate-db-auth-token`). Requires TLS. Tokens expire every 15 minutes.',
                                })
                            )
                        }
                    />
                    <Checkbox
                        id="cleartext-plugin-toggle"
                        checked={!mysqlTlsOff && !!formData.enable_cleartext_plugin}
                        disabled={mysqlTlsOff}
                        onChange={(checked) => updateField('enable_cleartext_plugin', checked)}
                        label={t('newConnection.enableCleartextPlugin', {
                            defaultValue: 'Enable cleartext password plugin',
                        })}
                        description={
                            mysqlTlsOff
                                ? t('newConnection.enableCleartextPluginTlsRequired', {
                                      defaultValue:
                                          'Select an enforced TLS mode above (Required, Verify CA, or Verify Identity) to use the cleartext password plugin.',
                                  })
                                : t('newConnection.enableCleartextPluginHint', {
                                      defaultValue:
                                          'Sends the password using mysql_clear_password. Required for bastions like Warpgate. Only used over a TLS connection.',
                                  })
                        }
                    />
                </div>
            )}
        </div>
    );
}
