import {useState, useMemo, useCallback} from 'react';
import {type PluginSecretFieldState} from '@/types/pluginSlots';
import {usePluginSlotRegistry} from '@/hooks/usePluginSlotRegistry';
import {updateExtraField} from '@/utils/connections';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';

/** Contexts handed to driver plugins that add their own connection fields. */
export function usePluginSlots(form: FormState) {
    const {
        driver,
        formData,
        name,
        noConnectionRequired,
        pluginSecretChanges,
        setFormData,
        setPluginSecretChanges,
        initialConnection,
    } = form;
    // ── plugin slot: connection-modal.connection_content ──
    const slotRegistry = usePluginSlotRegistry();
    const onDatabaseChange = useCallback(
        (value: string) => {
            setFormData((prev) => ({...prev, database: value}));
        },
        [setFormData],
    );
    const dbFieldSlotContext = useMemo(
        () => ({
            driver,
            database: typeof formData.database === 'string' ? formData.database : '',
            onDatabaseChange,
            connectionName: name,
        }),
        [driver, formData.database, onDatabaseChange, name],
    );
    const hasConnectionContentSlot =
        noConnectionRequired &&
        slotRegistry.getSlotContributions('connection-modal.connection_content', dbFieldSlotContext)
            .length > 0;

    // ── plugin slot: connection-modal.extra_fields ──
    // Plugins render their own connection fields (e.g. an AWS region select)
    // and write them into the opaque `extra` map via `setExtraField`.
    const setExtraField = useCallback(
        (key: string, value: string) => {
            setFormData((prev) => ({
                ...prev,
                extra: updateExtraField(prev.extra, key, value),
            }));
        },
        [setFormData],
    );
    // A plugin whose driver authenticates without a database login (Windows
    // integrated authentication, IAM, ...) can ask the host to hide its
    // username/password inputs. Hiding also clears both values so a stale
    // login never reaches the driver. The flag is reset on driver change and
    // whenever the modal is re-initialised, so it never leaks between drivers.
    const [credentialFieldsHidden, setCredentialFieldsHiddenState] = useState(false);
    const setCredentialFieldsHidden = useCallback(
        (hidden: boolean) => {
            setCredentialFieldsHiddenState(hidden);
            if (hidden) {
                setFormData((prev) => ({...prev, username: '', password: ''}));
            }
        },
        [setFormData],
    );
    const setSecretField = useCallback(
        (key: string, value: string) => {
            const normalizedKey = key.trim();
            if (!normalizedKey) return;
            setPluginSecretChanges((previous) => ({
                ...previous,
                [normalizedKey]: value === '' ? null : value,
            }));
        },
        [setPluginSecretChanges],
    );
    const secretFields = useMemo(() => {
        const storedKeys =
            initialConnection?.params.driver === driver
                ? (initialConnection.plugin_secret_keys ?? [])
                : [];
        const keys = new Set([...storedKeys, ...Object.keys(pluginSecretChanges)]);
        return Object.fromEntries(
            Array.from(keys).map((key): [string, PluginSecretFieldState] => {
                const pendingValue = pluginSecretChanges[key];
                return [
                    key,
                    {
                        value: typeof pendingValue === 'string' ? pendingValue : '',
                        hasStoredValue: storedKeys.includes(key),
                        dirty: Object.hasOwn(pluginSecretChanges, key),
                    },
                ];
            }),
        );
    }, [driver, initialConnection, pluginSecretChanges]);
    const extraFieldsSlotContext = useMemo(
        () => ({
            driver,
            extra: formData.extra ?? {},
            setExtraField,
            credentialFieldsHidden,
            setCredentialFieldsHidden,
            secretFields,
            setSecretField,
        }),
        [
            driver,
            formData.extra,
            setExtraField,
            credentialFieldsHidden,
            setCredentialFieldsHidden,
            secretFields,
            setSecretField,
        ],
    );

    return {
        slotRegistry,
        onDatabaseChange,
        dbFieldSlotContext,
        hasConnectionContentSlot,
        setExtraField,
        credentialFieldsHidden,
        setCredentialFieldsHiddenState,
        setCredentialFieldsHidden,
        setSecretField,
        secretFields,
        extraFieldsSlotContext,
    };
}

export type PluginSlots = ReturnType<typeof usePluginSlots>;
