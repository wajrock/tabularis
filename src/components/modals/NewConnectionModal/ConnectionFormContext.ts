import {createContext, useContext} from 'react';
import type {useConnectionForm} from '@/components/modals/NewConnectionModal/hooks/useConnectionForm';

export type ConnectionForm = ReturnType<typeof useConnectionForm>;

/** The connection modal's form state, read by its sections. */
export const ConnectionFormContext = createContext<ConnectionForm | null>(null);

export function useConnectionFormContext(): ConnectionForm {
    const form = useContext(ConnectionFormContext);
    if (!form) throw new Error('useConnectionFormContext must be used inside NewConnectionModal');
    return form;
}
