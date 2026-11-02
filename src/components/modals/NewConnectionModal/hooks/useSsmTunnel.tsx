import {useState, useCallback} from 'react';
import {testSsmConnection} from '@/utils/ssm';
import {toErrorMessage} from '@/utils/errors';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import type {PluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';
import type {SshTunnel} from '@/components/modals/NewConnectionModal/hooks/useSshTunnel';
import type {Kubernetes} from '@/components/modals/NewConnectionModal/hooks/useKubernetes';

/** AWS SSM tunnel: settings, validation and test. */
export function useSsmTunnel(form: FormState & PluginSlots & SshTunnel & Kubernetes) {
    const {
        formData,
        invalidateInlineK8sTest,
        invalidateK8sDiscovery,
        runSsmAsync,
        setActiveTab,
        setFormData,

        t,
    } = form;
    // ── AWS SSM ──
    const [ssmTestStatus, setSsmTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>(
        'idle',
    );
    const [ssmTestMessage, setSsmTestMessage] = useState<string | null>(null);
    const [ssmSelectionError, setSsmSelectionError] = useState<string | null>(null);

    const validateInlineSsmSelection = useCallback((): boolean => {
        if (!formData.ssm_enabled) {
            setSsmSelectionError(null);
            return true;
        }

        const port = Number(formData.port);
        let errorKey: string | null = null;
        if (!formData.ssm_target?.trim()) {
            errorKey = 'newConnection.ssmTargetRequired';
        } else if (!Number.isInteger(port) || port < 1 || port > 65535) {
            errorKey = 'newConnection.ssmPortRequired';
        }

        if (errorKey) {
            setSsmSelectionError(t(errorKey));
            setActiveTab('ssm');
            return false;
        }

        setSsmSelectionError(null);
        return true;
    }, [formData.port, formData.ssm_enabled, formData.ssm_target, t, setActiveTab]);

    const handleSsmEnabledChange = useCallback(
        (enabled: boolean) => {
            setSsmTestStatus('idle');
            setSsmTestMessage(null);
            setFormData((previous) => ({
                ...previous,
                ssm_enabled: enabled,
                ssh_enabled: enabled ? false : previous.ssh_enabled,
                k8s_enabled: enabled ? false : previous.k8s_enabled,
            }));
            if (enabled && formData.k8s_enabled) {
                invalidateK8sDiscovery();
                invalidateInlineK8sTest();
            }
        },
        [formData.k8s_enabled, invalidateInlineK8sTest, invalidateK8sDiscovery, setFormData],
    );

    // Any edit invalidates a previous SSM test: a stale green check must not
    // survive a changed target, profile or region.
    const updateSsmField = useCallback(
        (field: 'ssm_target' | 'ssm_profile' | 'ssm_region', value: string) => {
            setSsmTestStatus('idle');
            setSsmTestMessage(null);
            setSsmSelectionError(null);
            setFormData((previous) => ({...previous, [field]: value}));
        },
        [setFormData],
    );

    const testSsmTunnel = useCallback(async () => {
        if (!validateInlineSsmSelection()) return;

        const target = formData.ssm_target?.trim() ?? '';
        const port = Number(formData.port);
        setSsmTestStatus('testing');
        setSsmTestMessage(null);
        const result = await runSsmAsync('new-ssm-test', () =>
            testSsmConnection({
                target,
                profile: formData.ssm_profile?.trim() || undefined,
                region: formData.ssm_region?.trim() || undefined,
                host: formData.host?.trim() || 'localhost',
                port,
            }),
        );

        if (result.status === 'stale') return;
        if (result.status === 'error') {
            setSsmTestStatus('error');
            setSsmTestMessage(toErrorMessage(result.error));
            return;
        }
        setSsmTestStatus('success');
        setSsmTestMessage(result.value);
    }, [
        formData.host,
        formData.port,
        formData.ssm_profile,
        formData.ssm_region,
        formData.ssm_target,
        runSsmAsync,
        validateInlineSsmSelection,
    ]);

    return {
        ssmTestStatus,
        setSsmTestStatus,
        ssmTestMessage,
        setSsmTestMessage,
        ssmSelectionError,
        setSsmSelectionError,
        validateInlineSsmSelection,
        handleSsmEnabledChange,
        updateSsmField,
        testSsmTunnel,
    };
}

export type SsmTunnel = ReturnType<typeof useSsmTunnel>;
