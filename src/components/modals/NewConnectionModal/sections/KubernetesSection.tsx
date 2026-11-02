import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {AlertCircle, Pencil, Plus} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Checkbox} from '@/components/ui/Checkbox';
import {Field} from '@/components/ui/Field';
import {IconButton} from '@/components/ui/IconButton';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {Select} from '@/components/ui/Select';
import {SelectMenu} from '@/components/ui/SelectMenu';
import {K8sAdvancedSettings} from '@/components/ui/K8sAdvancedSettings';
import {K8sConnectionModal} from '@/components/modals/K8sConnectionModal';
import type {K8sConnection} from '@/utils/k8s';
import {FieldInput} from '@/components/modals/NewConnectionModal/fields/FieldInput';
import {useConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';

type K8sMode = 'existing' | 'inline';

/** Above the connection modal, like its other nested dialogs. */
const K8S_EDITOR_Z_INDEX = 110;

export function KubernetesSection() {
    const {t} = useTranslation();
    const {
        formData,
        updateField,
        k8sConnections,
        loadK8sConnectionsList,
        k8sMode,
        k8sContexts,
        k8sNamespaces,
        k8sResources,
        k8sDiscoveryErrors,
        k8sPathActionError,
        k8sSelectionError,
        isNetworkDriver,
        k8sDefaultPort,
        effectiveK8sPort,
        pathOverrides,
        handleInlineContextChange,
        handleInlineNamespaceChange,
        handleInlineResourceTypeChange,
        handleInlineResourceNameChange,
        handleInlinePortChange,
        handleK8sModeChange,
        handleK8sEnabledChange,
        handleSavedK8sConnectionChange,
    } = useConnectionFormContext();
    /** `null`: closed; `'new'`: creating; otherwise the saved connection being edited. */
    const [editor, setEditor] = useState<K8sConnection | 'new' | null>(null);
    const selectedK8s = k8sConnections.find((conn) => conn.id === formData.k8s_connection_id);

    if (!isNetworkDriver) {
        return (
            <p className="text-xs text-muted">
                {t('newConnection.k8sNotAvailable', {
                    defaultValue: 'Kubernetes is not available for this driver.',
                })}
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <Checkbox
                id="k8s-toggle"
                checked={!!formData.k8s_enabled}
                onChange={handleK8sEnabledChange}
                label={t('newConnection.useK8s', {defaultValue: 'Enable Kubernetes port-forward'})}
            />

            {formData.k8s_enabled && (
                <>
                    <SegmentedControl<K8sMode>
                        ariaLabel={t('newConnection.k8sSource', {
                            defaultValue: 'Port-forward source',
                        })}
                        value={k8sMode}
                        onChange={handleK8sModeChange}
                        options={[
                            {
                                value: 'existing',
                                label: t('newConnection.useK8sConnection', {
                                    defaultValue: 'Saved connection',
                                }),
                            },
                            {
                                value: 'inline',
                                label: t('newConnection.createInlineK8s', {
                                    defaultValue: 'Custom',
                                }),
                            },
                        ]}
                    />

                    {/* Saved port-forward: pick one, or create / edit it in place */}
                    {k8sMode === 'existing' && (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-medium text-secondary">
                                {t('newConnection.selectK8sConnection', {
                                    defaultValue: 'Select K8s Connection',
                                })}
                            </span>
                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <SelectMenu
                                        ariaLabel={t('newConnection.selectK8sConnection', {
                                            defaultValue: 'Select K8s Connection',
                                        })}
                                        value={formData.k8s_connection_id ?? ''}
                                        onChange={handleSavedK8sConnectionChange}
                                        placeholder={
                                            k8sConnections.length === 0
                                                ? t('newConnection.noK8sConnections', {
                                                      defaultValue: 'No saved connections',
                                                  })
                                                : t('newConnection.chooseK8s', {
                                                      defaultValue: 'Choose a connection...',
                                                  })
                                        }
                                        options={k8sConnections.map((conn) => ({
                                            value: conn.id,
                                            label: `${conn.name} · ${conn.context}/${conn.namespace}/${conn.resource_name}:${conn.port}`,
                                        }))}
                                    />
                                </div>
                                {selectedK8s && (
                                    <IconButton
                                        size="md"
                                        label={t('common.edit')}
                                        onClick={() => setEditor(selectedK8s)}
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

                    {/* Custom port-forward for this connection only */}
                    {k8sMode === 'inline' && (
                        <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Field
                                    label={t('newConnection.k8sContext', {defaultValue: 'Context'})}
                                    error={k8sDiscoveryErrors.contexts ?? undefined}
                                >
                                    <Select
                                        value={formData.k8s_context || null}
                                        options={k8sContexts}
                                        onChange={handleInlineContextChange}
                                        searchPlaceholder={t('common.search')}
                                        noResultsLabel={t('common.noResults')}
                                        placeholder={
                                            k8sContexts.length === 0
                                                ? t('k8sConnections.noContexts')
                                                : t('newConnection.chooseContext', {
                                                      defaultValue: 'Choose a context...',
                                                  })
                                        }
                                    />
                                </Field>
                                <Field
                                    label={t('newConnection.k8sNamespace', {
                                        defaultValue: 'Namespace',
                                    })}
                                    error={k8sDiscoveryErrors.namespaces ?? undefined}
                                >
                                    <Select
                                        value={formData.k8s_namespace || null}
                                        options={k8sNamespaces}
                                        onChange={handleInlineNamespaceChange}
                                        searchPlaceholder={t('common.search')}
                                        noResultsLabel={t('common.noResults')}
                                        placeholder={
                                            k8sNamespaces.length === 0
                                                ? t('k8sConnections.noNamespaces')
                                                : t('newConnection.chooseNamespace', {
                                                      defaultValue: 'Choose a namespace...',
                                                  })
                                        }
                                    />
                                </Field>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-medium text-secondary">
                                    {t('newConnection.k8sResourceType', {
                                        defaultValue: 'Resource Type',
                                    })}
                                </span>
                                <SegmentedControl
                                    ariaLabel={t('newConnection.k8sResourceType', {
                                        defaultValue: 'Resource Type',
                                    })}
                                    value={formData.k8s_resource_type || 'service'}
                                    onChange={handleInlineResourceTypeChange}
                                    options={[
                                        {
                                            value: 'service',
                                            label: t('newConnection.k8sResourceTypeService', {
                                                defaultValue: 'Service',
                                            }),
                                        },
                                        {
                                            value: 'pod',
                                            label: t('newConnection.k8sResourceTypePod', {
                                                defaultValue: 'Pod',
                                            }),
                                        },
                                    ]}
                                />
                            </div>

                            <div className="grid grid-cols-[1fr_120px] gap-3">
                                <Field
                                    label={t('newConnection.k8sResourceName', {
                                        defaultValue: 'Resource Name',
                                    })}
                                    error={k8sDiscoveryErrors.resources ?? undefined}
                                >
                                    <Select
                                        value={formData.k8s_resource_name || null}
                                        options={k8sResources}
                                        onChange={handleInlineResourceNameChange}
                                        searchPlaceholder={t('common.search')}
                                        noResultsLabel={t('common.noResults')}
                                        placeholder={
                                            k8sResources.length === 0
                                                ? t('k8sConnections.noResources')
                                                : t('newConnection.chooseResource', {
                                                      defaultValue: 'Choose a resource...',
                                                  })
                                        }
                                    />
                                </Field>
                                <FieldInput
                                    label={t('newConnection.k8sPort', {
                                        defaultValue: 'Container Port',
                                    })}
                                    value={effectiveK8sPort ?? ''}
                                    type="number"
                                    onChange={handleInlinePortChange}
                                    placeholder={
                                        k8sDefaultPort != null ? String(k8sDefaultPort) : undefined
                                    }
                                />
                            </div>

                            <K8sAdvancedSettings pathOverrides={pathOverrides} />
                        </div>
                    )}

                    {(k8sSelectionError || (k8sMode === 'inline' && k8sPathActionError)) && (
                        <InlineBanner tone="red" role="alert" icon={<AlertCircle size={14} />}>
                            {k8sSelectionError ?? k8sPathActionError}
                        </InlineBanner>
                    )}
                </>
            )}

            <K8sConnectionModal
                isOpen={editor !== null}
                onClose={() => setEditor(null)}
                connection={editor === 'new' ? null : editor}
                defaultPort={k8sDefaultPort}
                zIndex={K8S_EDITOR_Z_INDEX}
                onSaved={(saved) => {
                    void loadK8sConnectionsList();
                    handleSavedK8sConnectionChange(saved.id);
                }}
                onDeleted={(id) => {
                    void loadK8sConnectionsList();
                    if (formData.k8s_connection_id === id) {
                        updateField('k8s_connection_id', undefined);
                    }
                }}
            />
        </div>
    );
}
