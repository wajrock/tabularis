import {useState, useEffect, useCallback, useRef} from 'react';
import {
    loadK8sConnections,
    getK8sContexts,
    getK8sNamespaces,
    getK8sResources,
    getK8sResourcePorts,
    type K8sCommandOptions,
    type K8sConnection,
} from '@/utils/k8s';
import {useK8sPathOverrides} from '@/hooks/useK8sPathOverrides';
import {toErrorMessage} from '@/utils/errors';
import {
    type ConnectionParams,
    type InlineK8sPathCheck,
    type K8sDiscoveryErrors,
    type K8sDiscoverySource,
    hasK8sCommandOverrides,
} from '@/components/modals/NewConnectionModal/types';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import type {PluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';
import type {SshTunnel} from '@/components/modals/NewConnectionModal/hooks/useSshTunnel';

/** Kubernetes port-forward: saved or inline target, cluster discovery, kubectl paths. */

/** Port-forwards usually target a Service; a Pod is the exception. */
const DEFAULT_K8S_RESOURCE_TYPE = 'service';

export function useKubernetes(form: FormState & PluginSlots & SshTunnel) {
    const {
        activeDriver,
        formData,
        invalidateK8sAsync,
        runK8sAsync,
        setActiveTab,
        setErrorFeedback,
        setFormData,
        setMessage,
        setStatus,
        setTestResult,

        t,
        isOpen,
    } = form;
    // ── K8s ──
    const [k8sConnections, setK8sConnections] = useState<K8sConnection[]>([]);
    const [k8sMode, setK8sMode] = useState<'existing' | 'inline'>('existing');
    const [k8sAutoPort, setK8sAutoPort] = useState<{
        context: string;
        namespace: string;
        resourceType: string;
        resourceName: string;
        port: number;
    } | null>(null);
    const [k8sContexts, setK8sContexts] = useState<string[]>([]);
    const [k8sNamespaces, setK8sNamespaces] = useState<string[]>([]);
    const [k8sResources, setK8sResources] = useState<string[]>([]);
    const [k8sDiscoveryErrors, setK8sDiscoveryErrors] = useState<K8sDiscoveryErrors>({
        contexts: null,
        namespaces: null,
        resources: null,
    });
    const [k8sPathActionError, setK8sPathActionError] = useState<string | null>(null);
    const [k8sSelectionError, setK8sSelectionError] = useState<string | null>(null);
    const inlineK8sActiveRef = useRef(false);
    const inlineK8sTestActiveRef = useRef(false);
    const inlineK8sTestSequenceRef = useRef(0);

    const k8sDefaultPort = activeDriver?.default_port ?? undefined;
    // Derive K8s ports instead of seeding formData so edit flows with no saved port are covered.
    const getK8sAutoPort = (params: Partial<ConnectionParams>) =>
        k8sAutoPort &&
        params.k8s_context === k8sAutoPort.context &&
        params.k8s_namespace === k8sAutoPort.namespace &&
        params.k8s_resource_type === k8sAutoPort.resourceType &&
        params.k8s_resource_name === k8sAutoPort.resourceName
            ? k8sAutoPort.port
            : undefined;
    const resolveK8sPort = (params: Partial<ConnectionParams>) =>
        params.k8s_enabled && k8sMode === 'inline'
            ? (params.k8s_port ?? getK8sAutoPort(params) ?? k8sDefaultPort)
            : params.k8s_port;
    const effectiveK8sPort = resolveK8sPort(formData);
    const loadK8sConnectionsList = async () => {
        const result = await loadK8sConnections();
        setK8sConnections(result);
    };

    const setK8sDiscoveryError = useCallback((source: K8sDiscoverySource, error: string | null) => {
        setK8sDiscoveryErrors((previous) =>
            previous[source] === error ? previous : {...previous, [source]: error},
        );
    }, []);

    const invalidateK8sDiscovery = useCallback(() => {
        invalidateK8sAsync('new-k8s-contexts');
        invalidateK8sAsync('new-k8s-namespaces');
        invalidateK8sAsync('new-k8s-resources');
        invalidateK8sAsync('new-k8s-ports');
    }, [invalidateK8sAsync]);

    const invalidateInlineK8sTest = useCallback(() => {
        invalidateK8sAsync('new-k8s-test');
        inlineK8sTestSequenceRef.current += 1;
        if (!inlineK8sTestActiveRef.current) return;

        inlineK8sTestActiveRef.current = false;
        setStatus('idle');
        setMessage('');
        setErrorFeedback(null);
        setTestResult(null);
    }, [invalidateK8sAsync, setErrorFeedback, setMessage, setStatus, setTestResult]);

    useEffect(() => {
        inlineK8sActiveRef.current =
            isOpen && formData.k8s_enabled === true && k8sMode === 'inline';
    }, [formData.k8s_enabled, isOpen, k8sMode]);

    const loadK8sContextsList = useCallback(
        async (options: K8sCommandOptions) => {
            const result = await runK8sAsync('new-k8s-contexts', () =>
                hasK8sCommandOverrides(options) ? getK8sContexts(options) : getK8sContexts(),
            );
            if (result.status === 'success') {
                setK8sContexts(result.value);
                setK8sDiscoveryError('contexts', null);
            } else if (result.status === 'error') {
                setK8sContexts([]);
                setK8sDiscoveryError('contexts', toErrorMessage(result.error));
            }
        },
        [runK8sAsync, setK8sDiscoveryError],
    );

    const loadK8sNamespacesList = useCallback(
        async (context: string, options: K8sCommandOptions) => {
            const result = await runK8sAsync('new-k8s-namespaces', () =>
                hasK8sCommandOverrides(options)
                    ? getK8sNamespaces(context, options)
                    : getK8sNamespaces(context),
            );
            if (result.status === 'success') {
                setK8sNamespaces(result.value);
                setK8sDiscoveryError('namespaces', null);
            } else if (result.status === 'error') {
                setK8sNamespaces([]);
                setK8sDiscoveryError('namespaces', toErrorMessage(result.error));
            }
        },
        [runK8sAsync, setK8sDiscoveryError],
    );

    const loadK8sResourcesList = useCallback(
        async (
            context: string,
            namespace: string,
            resourceType: string,
            options: K8sCommandOptions,
        ) => {
            const result = await runK8sAsync('new-k8s-resources', () =>
                hasK8sCommandOverrides(options)
                    ? getK8sResources(context, namespace, resourceType, options)
                    : getK8sResources(context, namespace, resourceType),
            );
            if (result.status === 'success') {
                setK8sResources(result.value);
                setK8sDiscoveryError('resources', null);
            } else if (result.status === 'error') {
                setK8sResources([]);
                setK8sDiscoveryError('resources', toErrorMessage(result.error));
            }
        },
        [runK8sAsync, setK8sDiscoveryError],
    );

    const loadK8sResourcePorts = useCallback(
        async (
            context: string,
            namespace: string,
            resourceType: string,
            resourceName: string,
            options: K8sCommandOptions,
        ) => {
            const result = await runK8sAsync('new-k8s-ports', () =>
                hasK8sCommandOverrides(options)
                    ? getK8sResourcePorts(context, namespace, resourceType, resourceName, options)
                    : getK8sResourcePorts(context, namespace, resourceType, resourceName),
            );
            if (result.status === 'success') {
                setK8sAutoPort(
                    result.value.length === 1
                        ? {
                              context,
                              namespace,
                              resourceType,
                              resourceName,
                              port: result.value[0],
                          }
                        : null,
                );
            }
        },
        [runK8sAsync],
    );

    const handleInlinePathsApplied = useCallback(
        (options: K8sCommandOptions) => {
            invalidateK8sDiscovery();
            invalidateInlineK8sTest();
            setFormData((previous) => ({
                ...previous,
                k8s_kubectl_path: options.kubectl_path,
                k8s_kubeconfig_path: options.kubeconfig_path,
                k8s_context: undefined,
                k8s_namespace: undefined,
                k8s_resource_type: DEFAULT_K8S_RESOURCE_TYPE,
                k8s_resource_name: undefined,
                k8s_port: undefined,
            }));
            setK8sAutoPort(null);
            setK8sContexts([]);
            setK8sNamespaces([]);
            setK8sResources([]);
            setK8sDiscoveryErrors({contexts: null, namespaces: null, resources: null});
            setK8sPathActionError(null);
            setK8sSelectionError(null);
            if (inlineK8sActiveRef.current) {
                void loadK8sContextsList(options);
            }
        },
        [invalidateInlineK8sTest, invalidateK8sDiscovery, loadK8sContextsList, setFormData],
    );

    const pathOverrides = useK8sPathOverrides({
        onApplied: handleInlinePathsApplied,
        onDraftChanged: invalidateInlineK8sTest,
    });
    const {
        appliedOptions: appliedK8sOptions,
        ensureApplied: ensureK8sPathsApplied,
        cancelPending: cancelK8sPathValidation,
        initialize: initializeK8sPathOverrides,
        reset: resetK8sPathOverrides,
    } = pathOverrides;

    const ensureInlineK8sPaths = useCallback(async (): Promise<InlineK8sPathCheck> => {
        if (k8sMode !== 'inline') {
            return {allowed: true};
        }
        if (!formData.k8s_enabled) {
            return {allowed: true, options: appliedK8sOptions};
        }

        const result = await ensureK8sPathsApplied();
        if (result.status === 'invalid') {
            return {allowed: false, reason: 'invalid'};
        }
        if (result.status === 'applied') {
            return {allowed: false, reason: 'applied'};
        }

        return {allowed: true, options: result.options};
    }, [appliedK8sOptions, ensureK8sPathsApplied, formData.k8s_enabled, k8sMode]);

    const withInlineK8sPaths = useCallback(
        (
            params: Partial<ConnectionParams>,
            options?: K8sCommandOptions,
        ): Partial<ConnectionParams> => {
            const next = {...params};
            if (k8sMode === 'inline') {
                next.k8s_kubectl_path = options?.kubectl_path;
                next.k8s_kubeconfig_path = options?.kubeconfig_path;
            } else {
                delete next.k8s_kubectl_path;
                delete next.k8s_kubeconfig_path;
            }
            return next;
        },
        [k8sMode],
    );

    const validateInlineK8sSelection = useCallback((): boolean => {
        if (!formData.k8s_enabled || k8sMode !== 'inline') {
            setK8sSelectionError(null);
            return true;
        }

        let errorKey: string | null = null;
        if (!formData.k8s_context) {
            errorKey = 'k8sConnections.errors.contextRequired';
        } else if (!formData.k8s_namespace) {
            errorKey = 'k8sConnections.errors.namespaceRequired';
        } else if (
            formData.k8s_resource_type !== 'service' &&
            formData.k8s_resource_type !== 'pod'
        ) {
            errorKey = 'k8sConnections.errors.resourceTypeInvalid';
        } else if (!formData.k8s_resource_name) {
            errorKey = 'k8sConnections.errors.resourceNameRequired';
        } else if (
            effectiveK8sPort == null ||
            !Number.isInteger(effectiveK8sPort) ||
            effectiveK8sPort < 1 ||
            effectiveK8sPort > 65535
        ) {
            errorKey = 'k8sConnections.errors.portInvalid';
        }

        if (errorKey) {
            setK8sSelectionError(t(errorKey));
            setActiveTab('k8s');
            return false;
        }

        setK8sSelectionError(null);
        return true;
    }, [
        effectiveK8sPort,
        formData.k8s_context,
        formData.k8s_enabled,
        formData.k8s_namespace,
        formData.k8s_resource_name,
        formData.k8s_resource_type,
        k8sMode,
        t,
        setActiveTab,
    ]);

    const handleInlineContextChange = useCallback(
        (value: string) => {
            invalidateK8sAsync('new-k8s-namespaces');
            invalidateK8sAsync('new-k8s-resources');
            invalidateK8sAsync('new-k8s-ports');
            invalidateInlineK8sTest();
            setK8sSelectionError(null);
            setFormData((previous) => ({
                ...previous,
                k8s_context: value || undefined,
                k8s_namespace: undefined,
                k8s_resource_name: undefined,
            }));
            setK8sNamespaces([]);
            setK8sResources([]);
            setK8sAutoPort(null);
            setK8sDiscoveryError('namespaces', null);
            setK8sDiscoveryError('resources', null);
            setK8sPathActionError(null);
            if (value) {
                void loadK8sNamespacesList(value, appliedK8sOptions);
            }
        },
        [
            appliedK8sOptions,
            invalidateInlineK8sTest,
            invalidateK8sAsync,
            loadK8sNamespacesList,
            setK8sDiscoveryError,
            setFormData,
        ],
    );

    const handleInlineNamespaceChange = useCallback(
        (value: string) => {
            invalidateK8sAsync('new-k8s-resources');
            invalidateK8sAsync('new-k8s-ports');
            invalidateInlineK8sTest();
            setK8sSelectionError(null);
            setFormData((previous) => ({
                ...previous,
                k8s_namespace: value || undefined,
                k8s_resource_name: undefined,
            }));
            setK8sResources([]);
            setK8sAutoPort(null);
            setK8sDiscoveryError('resources', null);
            if (formData.k8s_context && value && formData.k8s_resource_type) {
                void loadK8sResourcesList(
                    formData.k8s_context,
                    value,
                    formData.k8s_resource_type,
                    appliedK8sOptions,
                );
            }
        },
        [
            appliedK8sOptions,
            formData.k8s_context,
            formData.k8s_resource_type,
            invalidateInlineK8sTest,
            invalidateK8sAsync,
            loadK8sResourcesList,
            setK8sDiscoveryError,
            setFormData,
        ],
    );

    const handleInlineResourceTypeChange = useCallback(
        (value: string) => {
            invalidateK8sAsync('new-k8s-resources');
            invalidateK8sAsync('new-k8s-ports');
            invalidateInlineK8sTest();
            setK8sSelectionError(null);
            setFormData((previous) => ({
                ...previous,
                k8s_resource_type: value || undefined,
                k8s_resource_name: undefined,
            }));
            setK8sResources([]);
            setK8sAutoPort(null);
            setK8sDiscoveryError('resources', null);
            if (formData.k8s_context && formData.k8s_namespace && value) {
                void loadK8sResourcesList(
                    formData.k8s_context,
                    formData.k8s_namespace,
                    value,
                    appliedK8sOptions,
                );
            }
        },
        [
            appliedK8sOptions,
            formData.k8s_context,
            formData.k8s_namespace,
            invalidateInlineK8sTest,
            invalidateK8sAsync,
            loadK8sResourcesList,
            setK8sDiscoveryError,
            setFormData,
        ],
    );

    const handleInlineResourceNameChange = useCallback(
        (value: string) => {
            invalidateK8sAsync('new-k8s-ports');
            invalidateInlineK8sTest();
            setK8sSelectionError(null);
            setFormData((previous) => ({
                ...previous,
                k8s_resource_name: value || undefined,
            }));
            setK8sAutoPort(null);
            if (
                formData.k8s_context &&
                formData.k8s_namespace &&
                formData.k8s_resource_type === 'service' &&
                value &&
                formData.k8s_port == null
            ) {
                void loadK8sResourcePorts(
                    formData.k8s_context,
                    formData.k8s_namespace,
                    formData.k8s_resource_type,
                    value,
                    appliedK8sOptions,
                );
            }
        },
        [
            appliedK8sOptions,
            formData.k8s_context,
            formData.k8s_namespace,
            formData.k8s_port,
            formData.k8s_resource_type,
            invalidateInlineK8sTest,
            invalidateK8sAsync,
            loadK8sResourcePorts,
            setFormData,
        ],
    );

    const handleInlinePortChange = useCallback(
        (value: string) => {
            invalidateK8sAsync('new-k8s-ports');
            invalidateInlineK8sTest();
            setK8sSelectionError(null);
            const isManual = value !== '';
            setFormData((previous) => ({
                ...previous,
                k8s_port: isManual ? Number(value) : undefined,
            }));
            setK8sAutoPort(null);
            if (
                !isManual &&
                formData.k8s_context &&
                formData.k8s_namespace &&
                formData.k8s_resource_type === 'service' &&
                formData.k8s_resource_name
            ) {
                void loadK8sResourcePorts(
                    formData.k8s_context,
                    formData.k8s_namespace,
                    formData.k8s_resource_type,
                    formData.k8s_resource_name,
                    appliedK8sOptions,
                );
            }
        },
        [
            appliedK8sOptions,
            formData.k8s_context,
            formData.k8s_namespace,
            formData.k8s_resource_name,
            formData.k8s_resource_type,
            invalidateInlineK8sTest,
            invalidateK8sAsync,
            loadK8sResourcePorts,
            setFormData,
        ],
    );

    const handleK8sModeChange = useCallback(
        (mode: 'existing' | 'inline') => {
            invalidateK8sDiscovery();
            invalidateInlineK8sTest();
            setK8sMode(mode);
            setK8sContexts([]);
            setK8sNamespaces([]);
            setK8sResources([]);
            setK8sAutoPort(null);
            setK8sDiscoveryErrors({contexts: null, namespaces: null, resources: null});
            setK8sPathActionError(null);
            setK8sSelectionError(null);

            if (mode === 'existing') {
                resetK8sPathOverrides();
                setFormData((previous) => ({
                    ...previous,
                    k8s_context: undefined,
                    k8s_namespace: undefined,
                    k8s_resource_type: undefined,
                    k8s_resource_name: undefined,
                    k8s_port: undefined,
                    k8s_kubectl_path: undefined,
                    k8s_kubeconfig_path: undefined,
                }));
                return;
            }

            const options: K8sCommandOptions = {
                kubectl_path: formData.k8s_kubectl_path,
                kubeconfig_path: formData.k8s_kubeconfig_path,
            };
            initializeK8sPathOverrides(options);
            setFormData((previous) => ({
                ...previous,
                k8s_connection_id: undefined,
                k8s_resource_type: previous.k8s_resource_type ?? DEFAULT_K8S_RESOURCE_TYPE,
            }));
            if (isOpen && formData.k8s_enabled) {
                void loadK8sContextsList(options);
            }
        },
        [
            formData.k8s_enabled,
            formData.k8s_kubeconfig_path,
            formData.k8s_kubectl_path,
            initializeK8sPathOverrides,
            invalidateInlineK8sTest,
            invalidateK8sDiscovery,
            isOpen,
            loadK8sContextsList,
            resetK8sPathOverrides,
            setFormData,
        ],
    );

    const handleK8sEnabledChange = useCallback(
        (enabled: boolean) => {
            setK8sSelectionError(null);
            setFormData((previous) => ({
                ...previous,
                k8s_enabled: enabled,
                ssh_enabled: enabled ? false : previous.ssh_enabled,
                ssm_enabled: enabled ? false : previous.ssm_enabled,
                k8s_resource_type:
                    enabled && k8sMode === 'inline'
                        ? (previous.k8s_resource_type ?? DEFAULT_K8S_RESOURCE_TYPE)
                        : previous.k8s_resource_type,
            }));
            if (!enabled) {
                invalidateK8sDiscovery();
                invalidateInlineK8sTest();
                return;
            }
            if (isOpen && k8sMode === 'inline') {
                void loadK8sContextsList(appliedK8sOptions);
            }
        },
        [
            appliedK8sOptions,
            invalidateInlineK8sTest,
            invalidateK8sDiscovery,
            isOpen,
            k8sMode,
            loadK8sContextsList,
            setFormData,
        ],
    );

    const handleSavedK8sConnectionChange = useCallback(
        (value: string) => {
            invalidateInlineK8sTest();
            setFormData((previous) => ({
                ...previous,
                k8s_connection_id: value || undefined,
            }));
        },
        [invalidateInlineK8sTest, setFormData],
    );

    return {
        k8sConnections,
        setK8sConnections,
        k8sMode,
        setK8sMode,
        k8sAutoPort,
        setK8sAutoPort,
        k8sContexts,
        setK8sContexts,
        k8sNamespaces,
        setK8sNamespaces,
        k8sResources,
        setK8sResources,
        k8sDiscoveryErrors,
        setK8sDiscoveryErrors,
        k8sPathActionError,
        setK8sPathActionError,
        k8sSelectionError,
        setK8sSelectionError,
        inlineK8sActiveRef,
        inlineK8sTestActiveRef,
        inlineK8sTestSequenceRef,
        k8sDefaultPort,
        getK8sAutoPort,
        resolveK8sPort,
        effectiveK8sPort,
        loadK8sConnectionsList,
        setK8sDiscoveryError,
        invalidateK8sDiscovery,
        invalidateInlineK8sTest,
        loadK8sContextsList,
        loadK8sNamespacesList,
        loadK8sResourcesList,
        loadK8sResourcePorts,
        handleInlinePathsApplied,
        pathOverrides,
        appliedK8sOptions,
        ensureK8sPathsApplied,
        cancelK8sPathValidation,
        initializeK8sPathOverrides,
        resetK8sPathOverrides,
        ensureInlineK8sPaths,
        withInlineK8sPaths,
        validateInlineK8sSelection,
        handleInlineContextChange,
        handleInlineNamespaceChange,
        handleInlineResourceTypeChange,
        handleInlineResourceNameChange,
        handleInlinePortChange,
        handleK8sModeChange,
        handleK8sEnabledChange,
        handleSavedK8sConnectionChange,
    };
}

export type Kubernetes = ReturnType<typeof useKubernetes>;
