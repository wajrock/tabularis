import {type NewConnectionModalProps} from '@/components/modals/NewConnectionModal/types';
import {useFormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import {usePluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';
import {useSshTunnel} from '@/components/modals/NewConnectionModal/hooks/useSshTunnel';
import {useKubernetes} from '@/components/modals/NewConnectionModal/hooks/useKubernetes';
import {useSsmTunnel} from '@/components/modals/NewConnectionModal/hooks/useSsmTunnel';
import {useFormActions} from '@/components/modals/NewConnectionModal/hooks/useFormActions';
import {useDatabaseList} from '@/components/modals/NewConnectionModal/hooks/useDatabaseList';
import {useConnectionString} from '@/components/modals/NewConnectionModal/hooks/useConnectionString';
import {useIconImageCleanup} from '@/components/modals/NewConnectionModal/hooks/useIconImageCleanup';
import {useFormLifecycle} from '@/components/modals/NewConnectionModal/hooks/useFormLifecycle';
import {useConnectionTest} from '@/components/modals/NewConnectionModal/hooks/useConnectionTest';
import {useSaveConnection} from '@/components/modals/NewConnectionModal/hooks/useSaveConnection';

/** State, effects and actions of the connection modal, assembled from its domain hooks. */
export function useConnectionForm(props: NewConnectionModalProps) {
    const state = useFormState(props);
    const slots = usePluginSlots({...state});
    const ssh = useSshTunnel({...state, ...slots});
    const k8s = useKubernetes({...state, ...slots, ...ssh});
    const ssm = useSsmTunnel({...state, ...slots, ...ssh, ...k8s});
    const actions = useFormActions({...state, ...slots, ...ssh, ...k8s, ...ssm});
    const databases = useDatabaseList({...state, ...slots, ...ssh, ...k8s, ...ssm, ...actions});
    const connectionStringImport = useConnectionString({
        ...state,
        ...slots,
        ...ssh,
        ...k8s,
        ...ssm,
        ...actions,
        ...databases,
    });
    const images = useIconImageCleanup({
        ...state,
        ...slots,
        ...ssh,
        ...k8s,
        ...ssm,
        ...actions,
        ...databases,
        ...connectionStringImport,
    });
    const lifecycle = useFormLifecycle({
        ...state,
        ...slots,
        ...ssh,
        ...k8s,
        ...ssm,
        ...actions,
        ...databases,
        ...connectionStringImport,
        ...images,
    });
    const test = useConnectionTest({
        ...state,
        ...slots,
        ...ssh,
        ...k8s,
        ...ssm,
        ...actions,
        ...databases,
        ...connectionStringImport,
        ...images,
        ...lifecycle,
    });
    const save = useSaveConnection({
        ...state,
        ...slots,
        ...ssh,
        ...k8s,
        ...ssm,
        ...actions,
        ...databases,
        ...connectionStringImport,
        ...images,
        ...lifecycle,
        ...test,
    });
    return {
        ...state,
        ...slots,
        ...ssh,
        ...k8s,
        ...ssm,
        ...actions,
        ...databases,
        ...connectionStringImport,
        ...images,
        ...lifecycle,
        ...test,
        ...save,
    };
}
