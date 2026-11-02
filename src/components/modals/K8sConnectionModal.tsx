import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {AlertCircle, Boxes, Check, Loader2, Trash2, Zap} from 'lucide-react';
import {
    saveK8sConnection,
    updateK8sConnection,
    deleteK8sConnection,
    testK8sConnection,
    getK8sContexts,
    getK8sNamespaces,
    getK8sResources,
    getK8sResourcePorts,
    validateK8sConnection,
    type K8sCommandOptions,
    type K8sConnection,
    type K8sConnectionInput,
} from '@/utils/k8s';
import {toErrorMessage} from '@/utils/errors';
import {useK8sPathOverrides} from '@/hooks/useK8sPathOverrides';
import {useLatestAsync} from '@/hooks/useLatestAsync';
import {Button} from '@/components/ui/Button';
import {Field} from '@/components/ui/Field';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {Input} from '@/components/ui/Input';
import {Modal} from '@/components/ui/Modal';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {Select} from '@/components/ui/Select';
import {K8sAdvancedSettings} from '@/components/ui/K8sAdvancedSettings';

interface K8sConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Connection to edit; omitted to create one. */
    connection?: K8sConnection | null;
    defaultPort?: number | null;
    onSaved?: (connection: K8sConnection) => void;
    onDeleted?: (id: string) => void;
    /** Raised above a parent modal (the connection modal). */
    zIndex?: number;
}

interface DiscoveryErrors {
    contexts: string | null;
    namespaces: string | null;
    resources: string | null;
}

type DiscoverySource = keyof DiscoveryErrors;

/**
 * Create or edit one saved Kubernetes port-forward: context, namespace and
 * resource are discovered with kubectl; Test checks the cluster is reachable.
 */
export function K8sConnectionModal({
    isOpen,
    onClose,
    connection,
    defaultPort,
    onSaved,
    onDeleted,
    zIndex,
}: K8sConnectionModalProps) {
    const {t} = useTranslation();
    const {invalidate, run} = useLatestAsync();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [context, setContext] = useState('');
    const [namespace, setNamespace] = useState('');
    const [resourceType, setResourceType] = useState<string>('service');
    const [resourceName, setResourceName] = useState('');
    const effectiveDefaultPort = defaultPort ?? undefined;
    const [port, setPort] = useState<number | undefined>(undefined);
    const effectivePort = port ?? effectiveDefaultPort;
    const [isPortOverridden, setIsPortOverridden] = useState(false);

    // Discovery state
    const [contexts, setContexts] = useState<string[]>([]);
    const [namespaces, setNamespaces] = useState<string[]>([]);
    const [resources, setResources] = useState<string[]>([]);
    const [discoveryErrors, setDiscoveryErrors] = useState<DiscoveryErrors>({
        contexts: null,
        namespaces: null,
        resources: null,
    });

    // Status
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [pathActionError, setPathActionError] = useState<string | null>(null);
    const [isActionPending, setIsActionPending] = useState(false);
    const actionSequenceRef = useRef(0);
    const activeActionRef = useRef<number | null>(null);

    const beginFormAction = useCallback((): number | null => {
        if (activeActionRef.current !== null) return null;

        const actionId = ++actionSequenceRef.current;
        activeActionRef.current = actionId;
        setIsActionPending(true);
        return actionId;
    }, []);

    const finishFormAction = useCallback((actionId: number) => {
        if (activeActionRef.current !== actionId) return;
        activeActionRef.current = null;
        setIsActionPending(false);
    }, []);

    const cancelFormAction = useCallback(() => {
        actionSequenceRef.current += 1;
        activeActionRef.current = null;
        setIsActionPending(false);
    }, []);

    const setDiscoveryError = useCallback((source: DiscoverySource, error: string | null) => {
        setDiscoveryErrors((previous) =>
            previous[source] === error ? previous : {...previous, [source]: error},
        );
    }, []);

    const invalidateFormRequests = useCallback(() => {
        invalidate('k8s-contexts');
        invalidate('k8s-namespaces');
        invalidate('k8s-resources');
        invalidate('k8s-ports');
        invalidate('k8s-test');
    }, [invalidate]);

    const invalidateConnectionTest = useCallback(() => {
        invalidate('k8s-test');
        setTestStatus('idle');
        setTestMessage('');
    }, [invalidate]);

    const loadContexts = useCallback(
        async (options: K8sCommandOptions) => {
            const result = await run('k8s-contexts', () => getK8sContexts(options));
            if (result.status === 'success') {
                setContexts(result.value);
                setDiscoveryError('contexts', null);
            } else if (result.status === 'error') {
                setContexts([]);
                setDiscoveryError('contexts', toErrorMessage(result.error));
            }
        },
        [run, setDiscoveryError],
    );

    const loadNamespaces = useCallback(
        async (selectedContext: string, options: K8sCommandOptions) => {
            const result = await run('k8s-namespaces', () =>
                getK8sNamespaces(selectedContext, options),
            );
            if (result.status === 'success') {
                setNamespaces(result.value);
                setDiscoveryError('namespaces', null);
            } else if (result.status === 'error') {
                setNamespaces([]);
                setDiscoveryError('namespaces', toErrorMessage(result.error));
            }
        },
        [run, setDiscoveryError],
    );

    const loadResources = useCallback(
        async (
            selectedContext: string,
            selectedNamespace: string,
            selectedResourceType: string,
            options: K8sCommandOptions,
        ) => {
            const result = await run('k8s-resources', () =>
                getK8sResources(selectedContext, selectedNamespace, selectedResourceType, options),
            );
            if (result.status === 'success') {
                setResources(result.value);
                setDiscoveryError('resources', null);
            } else if (result.status === 'error') {
                setResources([]);
                setDiscoveryError('resources', toErrorMessage(result.error));
            }
        },
        [run, setDiscoveryError],
    );

    const loadResourcePorts = useCallback(
        async (
            selectedContext: string,
            selectedNamespace: string,
            selectedResourceType: string,
            selectedResourceName: string,
            options: K8sCommandOptions,
        ) => {
            const result = await run('k8s-ports', () =>
                getK8sResourcePorts(
                    selectedContext,
                    selectedNamespace,
                    selectedResourceType,
                    selectedResourceName,
                    options,
                ),
            );
            if (result.status === 'success' && result.value.length === 1) {
                setPort((previous) => (previous === result.value[0] ? previous : result.value[0]));
            }
        },
        [run],
    );

    const handlePathsApplied = useCallback(
        (options: K8sCommandOptions) => {
            invalidateFormRequests();
            setContext('');
            setNamespace('');
            setResourceType('service');
            setResourceName('');
            setPort(undefined);
            setIsPortOverridden(false);
            setContexts([]);
            setNamespaces([]);
            setResources([]);
            setDiscoveryErrors({contexts: null, namespaces: null, resources: null});
            setTestStatus('idle');
            setTestMessage('');
            setPathActionError(null);
            void loadContexts(options);
        },
        [invalidateFormRequests, loadContexts],
    );

    const pathOverrides = useK8sPathOverrides({
        onApplied: handlePathsApplied,
        onDraftChanged: invalidateConnectionTest,
    });
    const {
        appliedOptions,
        ensureApplied,
        cancelPending: cancelPathValidation,
        initialize: initializePathOverrides,
        reset: resetPathOverrides,
    } = pathOverrides;

    const actionSnapshot = useMemo(
        () => ({
            name,
            context,
            namespace,
            resourceType,
            resourceName,
            port,
            effectivePort,
            isPortOverridden,
            editingId,
            isCreating,
            kubectlPath: pathOverrides.kubectlPath,
            kubeconfigPath: pathOverrides.kubeconfigPath,
            appliedOptions,
        }),
        [
            appliedOptions,
            context,
            editingId,
            effectivePort,
            isCreating,
            isPortOverridden,
            name,
            namespace,
            pathOverrides.kubeconfigPath,
            pathOverrides.kubectlPath,
            port,
            resourceName,
            resourceType,
        ],
    );
    const actionSnapshotRef = useRef(actionSnapshot);
    useLayoutEffect(() => {
        actionSnapshotRef.current = actionSnapshot;
    }, [actionSnapshot]);

    useEffect(() => {
        if (!isOpen) {
            invalidateFormRequests();
            cancelPathValidation();
            actionSequenceRef.current += 1;
            activeActionRef.current = null;
            queueMicrotask(() => {
                setIsActionPending(false);
                setTestStatus('idle');
                setTestMessage('');
            });
            return;
        }
    }, [cancelPathValidation, invalidateFormRequests, isOpen]);

    const resetForm = useCallback(
        (options: K8sCommandOptions = {}) => {
            cancelFormAction();
            invalidateFormRequests();
            resetPathOverrides(options);
            setName('');
            setContext('');
            setNamespace('');
            setResourceType('service');
            setResourceName('');
            setPort(undefined);
            setIsPortOverridden(false);
            setContexts([]);
            setNamespaces([]);
            setResources([]);
            setDiscoveryErrors({contexts: null, namespaces: null, resources: null});
            setTestStatus('idle');
            setTestMessage('');
            setValidationError(null);
            setPathActionError(null);
        },
        [cancelFormAction, invalidateFormRequests, resetPathOverrides],
    );

    const handleCreate = useCallback(() => {
        resetForm();
        setIsCreating(true);
        setEditingId(null);
        void loadContexts({});
    }, [loadContexts, resetForm]);

    const handleEdit = useCallback(
        (connection: K8sConnection) => {
            cancelFormAction();
            const options: K8sCommandOptions = {
                kubectl_path: connection.kubectl_path,
                kubeconfig_path: connection.kubeconfig_path,
            };
            invalidateFormRequests();
            initializePathOverrides(options);
            setName(connection.name);
            setContext(connection.context);
            setNamespace(connection.namespace);
            setResourceType(connection.resource_type);
            setResourceName(connection.resource_name);
            setPort(connection.port);
            setIsPortOverridden(true);
            setContexts([]);
            setNamespaces([]);
            setResources([]);
            setDiscoveryErrors({contexts: null, namespaces: null, resources: null});
            setEditingId(connection.id);
            setIsCreating(false);
            setTestStatus('idle');
            setTestMessage('');
            setValidationError(null);
            setPathActionError(null);
            void loadContexts(options);
            void loadNamespaces(connection.context, options);
            void loadResources(
                connection.context,
                connection.namespace,
                connection.resource_type,
                options,
            );
        },
        [
            cancelFormAction,
            initializePathOverrides,
            invalidateFormRequests,
            loadContexts,
            loadNamespaces,
            loadResources,
        ],
    );

    // Each opening starts from the given connection, or an empty form; once per opening.
    const initializedForRef = useRef<string | null>(null);
    useEffect(() => {
        if (!isOpen) {
            initializedForRef.current = null;
            return;
        }
        const key = connection?.id ?? 'new';
        if (initializedForRef.current === key) return;
        initializedForRef.current = key;
        queueMicrotask(() => (connection ? handleEdit(connection) : handleCreate()));
    }, [connection, handleCreate, handleEdit, isOpen]);

    const handleCancel = useCallback(() => {
        resetForm();
        setEditingId(null);
        setIsCreating(false);
    }, [resetForm]);

    const handleClose = useCallback(() => {
        handleCancel();
        onClose();
    }, [handleCancel, onClose]);

    const resetPortSelection = useCallback(() => {
        if (!isPortOverridden) setPort(undefined);
    }, [isPortOverridden]);

    const handleContextChange = useCallback(
        (value: string) => {
            invalidate('k8s-namespaces');
            invalidate('k8s-resources');
            invalidate('k8s-ports');
            invalidateConnectionTest();
            setContext(value);
            setNamespace('');
            setResourceName('');
            resetPortSelection();
            setNamespaces([]);
            setResources([]);
            setDiscoveryError('namespaces', null);
            setDiscoveryError('resources', null);
            setPathActionError(null);

            if (!value) return;
            void loadNamespaces(value, appliedOptions);
        },
        [
            appliedOptions,
            invalidate,
            invalidateConnectionTest,
            loadNamespaces,
            resetPortSelection,
            setDiscoveryError,
        ],
    );

    const handleNamespaceChange = useCallback(
        (value: string) => {
            invalidate('k8s-resources');
            invalidate('k8s-ports');
            invalidateConnectionTest();
            setNamespace(value);
            setResourceName('');
            resetPortSelection();
            setResources([]);
            setDiscoveryError('resources', null);

            if (!context || !value || !resourceType) return;
            void loadResources(context, value, resourceType, appliedOptions);
        },
        [
            appliedOptions,
            context,
            invalidate,
            invalidateConnectionTest,
            loadResources,
            resetPortSelection,
            resourceType,
            setDiscoveryError,
        ],
    );

    const handleResourceTypeChange = useCallback(
        (value: string) => {
            invalidate('k8s-resources');
            invalidate('k8s-ports');
            setResourceType(value);
            setResourceName('');
            resetPortSelection();
            setResources([]);
            setDiscoveryError('resources', null);

            if (!context || !namespace || !value) return;
            void loadResources(context, namespace, value, appliedOptions);
        },
        [
            appliedOptions,
            context,
            invalidate,
            loadResources,
            namespace,
            resetPortSelection,
            setDiscoveryError,
        ],
    );

    const handleResourceNameChange = useCallback(
        (value: string) => {
            invalidate('k8s-ports');
            setResourceName(value);
            resetPortSelection();

            if (
                !context ||
                !namespace ||
                resourceType !== 'service' ||
                !value ||
                isPortOverridden
            ) {
                return;
            }

            void loadResourcePorts(context, namespace, resourceType, value, appliedOptions);
        },
        [
            appliedOptions,
            context,
            invalidate,
            isPortOverridden,
            loadResourcePorts,
            namespace,
            resetPortSelection,
            resourceType,
        ],
    );

    const handlePortChange = useCallback(
        (value: number | undefined) => {
            invalidate('k8s-ports');
            setIsPortOverridden(value != null);
            setPort(value);

            if (
                value === undefined &&
                context &&
                namespace &&
                resourceType === 'service' &&
                resourceName
            ) {
                void loadResourcePorts(
                    context,
                    namespace,
                    resourceType,
                    resourceName,
                    appliedOptions,
                );
            }
        },
        [
            appliedOptions,
            context,
            invalidate,
            loadResourcePorts,
            namespace,
            resourceName,
            resourceType,
        ],
    );

    const handleSave = useCallback(async () => {
        const actionId = beginFormAction();
        if (actionId === null) return;
        const startingSnapshot = actionSnapshotRef.current;

        try {
            const paths = await ensureApplied();
            if (activeActionRef.current !== actionId) return;
            if (paths.status === 'applied') {
                setPathActionError(t('k8sConnections.pathSelectionReset'));
                return;
            }
            if (actionSnapshotRef.current !== startingSnapshot) return;
            if (paths.status === 'invalid') {
                setPathActionError(t('k8sConnections.pathValidationFailed'));
                return;
            }
            setPathActionError(null);

            const validation = validateK8sConnection({
                name,
                context,
                namespace,
                resource_type: resourceType,
                resource_name: resourceName,
                port: effectivePort,
                ...paths.options,
            });
            if (!validation.isValid) {
                setValidationError(t(validation.errorKey));
                return;
            }
            const input: K8sConnectionInput = validation.value;

            try {
                if (
                    activeActionRef.current !== actionId ||
                    actionSnapshotRef.current !== startingSnapshot
                ) {
                    return;
                }
                let saved: K8sConnection | undefined;
                if (isCreating) {
                    saved = await saveK8sConnection(input);
                } else if (editingId) {
                    saved = await updateK8sConnection(editingId, input);
                }
                if (
                    activeActionRef.current !== actionId ||
                    actionSnapshotRef.current !== startingSnapshot
                ) {
                    return;
                }
                if (saved) onSaved?.(saved);
                handleClose();
            } catch (error) {
                if (
                    activeActionRef.current === actionId &&
                    actionSnapshotRef.current === startingSnapshot
                ) {
                    setValidationError(toErrorMessage(error));
                }
            }
        } finally {
            finishFormAction(actionId);
        }
    }, [
        beginFormAction,
        context,
        editingId,
        effectivePort,
        ensureApplied,
        finishFormAction,
        handleClose,
        isCreating,
        name,
        namespace,
        onSaved,
        resourceName,
        resourceType,
        t,
    ]);

    const handleDelete = useCallback(async () => {
        if (!editingId) return;
        try {
            await deleteK8sConnection(editingId);
            onDeleted?.(editingId);
            handleClose();
        } catch (error) {
            console.error('Failed to delete K8s connection:', error);
            setValidationError(toErrorMessage(error));
        }
    }, [editingId, handleClose, onDeleted]);

    const handleTest = useCallback(async () => {
        const actionId = beginFormAction();
        if (actionId === null) return;
        const startingSnapshot = actionSnapshotRef.current;

        try {
            const paths = await ensureApplied();
            if (activeActionRef.current !== actionId) return;
            if (paths.status === 'applied') {
                setPathActionError(t('k8sConnections.pathSelectionReset'));
                return;
            }
            if (actionSnapshotRef.current !== startingSnapshot) return;
            if (paths.status === 'invalid') {
                setPathActionError(t('k8sConnections.pathValidationFailed'));
                return;
            }
            setPathActionError(null);
            if (!context || !namespace) return;

            setTestStatus('testing');
            setTestMessage('');
            const result = await run('k8s-test', () =>
                testK8sConnection(context, namespace, paths.options),
            );
            if (
                activeActionRef.current !== actionId ||
                actionSnapshotRef.current !== startingSnapshot
            ) {
                if (activeActionRef.current === actionId) {
                    setTestStatus('idle');
                    setTestMessage('');
                }
                return;
            }
            if (result.status === 'success') {
                setTestStatus('success');
                setTestMessage(result.value);
            } else if (result.status === 'error') {
                setTestStatus('error');
                setTestMessage(toErrorMessage(result.error));
            }
        } finally {
            finishFormAction(actionId);
        }
    }, [beginFormAction, context, ensureApplied, finishFormAction, namespace, run, t]);

    const editFormProps = {
        name,
        setName,
        context,
        onContextChange: handleContextChange,
        namespace,
        onNamespaceChange: handleNamespaceChange,
        resourceType,
        onResourceTypeChange: handleResourceTypeChange,
        resourceName,
        onResourceNameChange: handleResourceNameChange,
        port: effectivePort,
        onPortChange: handlePortChange,
        defaultPort: effectiveDefaultPort,
        contexts,
        namespaces,
        resources,
        discoveryErrors,
        pathOverrides,
        validationError,
        pathActionError,
        testStatus,
        testMessage,
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={
                connection
                    ? t('k8sConnections.editTitle', {defaultValue: 'Edit Kubernetes connection'})
                    : t('k8sConnections.newTitle', {defaultValue: 'New Kubernetes connection'})
            }
            icon={Boxes}
            iconTone="accent"
            size="md"
            zIndex={zIndex}
            busy={isActionPending}
            bodyClassName="flex flex-col"
            footerStart={
                <>
                    {connection && (
                        <Button
                            variant="ghost"
                            className="-ml-1.5 hover:text-tint-danger-fg"
                            icon={<Trash2 size={16} />}
                            onClick={() => void handleDelete()}
                            disabled={isActionPending}
                        >
                            {t('common.delete')}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleTest()}
                        disabled={!context || !namespace || isActionPending}
                        icon={
                            testStatus === 'testing' ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Zap size={14} />
                            )
                        }
                    >
                        {t('k8sConnections.test')}
                    </Button>
                </>
            }
            footer={
                <>
                    <Button variant="outline" onClick={handleClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={() => void handleSave()} disabled={isActionPending}>
                        {t('common.save')}
                    </Button>
                </>
            }
        >
            <EditForm {...editFormProps} />
        </Modal>
    );
}

interface EditFormProps {
    name: string;
    setName: (value: string) => void;
    context: string;
    onContextChange: (value: string) => void;
    namespace: string;
    onNamespaceChange: (value: string) => void;
    resourceType: string;
    onResourceTypeChange: (value: string) => void;
    resourceName: string;
    onResourceNameChange: (value: string) => void;
    port: number | undefined;
    onPortChange: (value: number | undefined) => void;
    defaultPort?: number;
    contexts: string[];
    namespaces: string[];
    resources: string[];
    discoveryErrors: DiscoveryErrors;
    pathOverrides: ReturnType<typeof useK8sPathOverrides>;
    validationError: string | null;
    pathActionError: string | null;
    testStatus: 'idle' | 'testing' | 'success' | 'error';
    testMessage: string;
}

function EditForm({
    name,
    setName,
    context,
    onContextChange,
    namespace,
    onNamespaceChange,
    resourceType,
    onResourceTypeChange,
    resourceName,
    onResourceNameChange,
    port,
    onPortChange,
    defaultPort,
    contexts,
    namespaces,
    resources,
    discoveryErrors,
    pathOverrides,
    validationError,
    pathActionError,
    testStatus,
    testMessage,
}: EditFormProps) {
    const {t} = useTranslation();
    const formError = validationError ?? pathActionError;

    return (
        <div className="flex flex-col gap-4">
            <Field label={t('k8sConnections.name')}>
                <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t('k8sConnections.namePlaceholder')}
                    autoFocus
                />
            </Field>

            <div className="grid grid-cols-2 gap-3">
                <Field label={t('k8sConnections.context')} error={discoveryErrors.contexts}>
                    <Select
                        value={context || null}
                        options={contexts}
                        onChange={onContextChange}
                        placeholder={
                            contexts.length === 0
                                ? t('k8sConnections.noContexts')
                                : t('k8sConnections.chooseContext')
                        }
                        searchPlaceholder={t('common.search')}
                        noResultsLabel={t('common.noResults')}
                    />
                </Field>
                <Field label={t('k8sConnections.namespace')} error={discoveryErrors.namespaces}>
                    <Select
                        value={namespace || null}
                        options={namespaces}
                        onChange={onNamespaceChange}
                        placeholder={
                            namespaces.length === 0
                                ? t('k8sConnections.noNamespaces')
                                : t('k8sConnections.chooseNamespace')
                        }
                        searchPlaceholder={t('common.search')}
                        noResultsLabel={t('common.noResults')}
                    />
                </Field>
            </div>

            <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-secondary">
                    {t('k8sConnections.resourceType')}
                </span>
                <SegmentedControl
                    ariaLabel={t('k8sConnections.resourceType')}
                    value={resourceType}
                    onChange={onResourceTypeChange}
                    options={[
                        {value: 'service', label: t('k8sConnections.resourceTypeService')},
                        {value: 'pod', label: t('k8sConnections.resourceTypePod')},
                    ]}
                />
            </div>

            <div className="grid grid-cols-[1fr_120px] gap-3">
                <Field label={t('k8sConnections.resourceName')} error={discoveryErrors.resources}>
                    <Select
                        value={resourceName || null}
                        options={resources}
                        onChange={onResourceNameChange}
                        placeholder={
                            resources.length === 0
                                ? t('k8sConnections.noResources')
                                : t('k8sConnections.chooseResource')
                        }
                        searchPlaceholder={t('common.search')}
                        noResultsLabel={t('common.noResults')}
                    />
                </Field>
                <Field label={t('k8sConnections.port')}>
                    <Input
                        type="number"
                        value={port ?? ''}
                        onChange={(event) =>
                            onPortChange(
                                event.target.value === '' ? undefined : Number(event.target.value),
                            )
                        }
                        placeholder={defaultPort != null ? String(defaultPort) : undefined}
                    />
                </Field>
            </div>

            <K8sAdvancedSettings pathOverrides={pathOverrides} />

            {(testStatus === 'success' || testStatus === 'error') && (
                <InlineBanner
                    tone={testStatus === 'success' ? 'green' : 'red'}
                    role={testStatus === 'success' ? 'status' : 'alert'}
                    icon={
                        testStatus === 'success' ? <Check size={14} /> : <AlertCircle size={14} />
                    }
                >
                    {testMessage}
                </InlineBanner>
            )}
            {formError && (
                <InlineBanner tone="red" role="alert" icon={<AlertCircle size={14} />}>
                    {formError}
                </InlineBanner>
            )}
        </div>
    );
}
