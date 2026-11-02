import {useEffect, useCallback, useRef} from 'react';
import {invoke} from '@tauri-apps/api/core';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import type {PluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';
import type {SshTunnel} from '@/components/modals/NewConnectionModal/hooks/useSshTunnel';
import type {Kubernetes} from '@/components/modals/NewConnectionModal/hooks/useKubernetes';
import type {SsmTunnel} from '@/components/modals/NewConnectionModal/hooks/useSsmTunnel';
import type {FormActions} from '@/components/modals/NewConnectionModal/hooks/useFormActions';
import type {DatabaseList} from '@/components/modals/NewConnectionModal/hooks/useDatabaseList';
import type {ConnectionStringImport} from '@/components/modals/NewConnectionModal/hooks/useConnectionString';

/** Removes icon images uploaded during a session that ends without saving them. */
export function useIconImageCleanup(
    form: FormState &
        PluginSlots &
        SshTunnel &
        Kubernetes &
        SsmTunnel &
        FormActions &
        DatabaseList &
        ConnectionStringImport,
) {
    const {appearance, persistenceActionRef, initialConnection, isOpen} = form;
    // ── orphan-icon cleanup on cancel ──
    // Mirror appearance into a ref so the unmount cleanup can read the latest value
    // without being re-registered on every render (empty-deps effect).
    const appearanceRef = useRef(appearance);
    useEffect(() => {
        appearanceRef.current = appearance;
    }, [appearance]);

    // Track whether the modal was successfully saved; if not, delete any
    // images that were uploaded during this session but not committed.
    const wasSavedRef = useRef(false);
    const originalImagePath = useRef<string | null>(
        initialConnection?.appearance?.icon?.type === 'image'
            ? initialConnection.appearance.icon.path
            : null,
    );
    // All icon paths uploaded during this modal session (may include superseded picks).
    const uploadedPathsRef = useRef<string[]>([]);

    const handleImageUploaded = useCallback((path: string) => {
        uploadedPathsRef.current.push(path);
    }, []);

    useEffect(() => {
        // Reset on each open so re-opening the modal starts fresh.
        wasSavedRef.current = false;
        uploadedPathsRef.current = [];
        originalImagePath.current =
            initialConnection?.appearance?.icon?.type === 'image'
                ? initialConnection.appearance.icon.path
                : null;

        return () => {
            // Reads the save in progress at close time on purpose (not the one at open).
            // eslint-disable-next-line react-hooks/exhaustive-deps
            if (wasSavedRef.current || persistenceActionRef.current !== null) {
                return;
            }
            // On cancel: delete EVERY path uploaded this session except the original
            // (the one the modal opened with). Handles "pick A then B then C then cancel".
            const original = originalImagePath.current;
            const toDelete = uploadedPathsRef.current.filter((p) => p !== original);
            toDelete.forEach((p) =>
                invoke('delete_connection_icon', {relativePath: p}).catch(() => {}),
            );
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    return {
        appearanceRef,
        wasSavedRef,
        originalImagePath,
        uploadedPathsRef,
        handleImageUploaded,
    };
}

export type IconImageCleanup = ReturnType<typeof useIconImageCleanup>;
