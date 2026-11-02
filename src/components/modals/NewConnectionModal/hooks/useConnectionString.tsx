import {useState} from 'react';
import {isSchemaBasedMultiDbCapable, hasOptedIntoDatabaseSelection} from '@/utils/database';
import {parseConnectionString, toConnectionParams} from '@/utils/connectionStringParser';
import {type ConnectionParams} from '@/components/modals/NewConnectionModal/types';
import type {FormState} from '@/components/modals/NewConnectionModal/hooks/useFormState';
import type {PluginSlots} from '@/components/modals/NewConnectionModal/hooks/usePluginSlots';
import type {SshTunnel} from '@/components/modals/NewConnectionModal/hooks/useSshTunnel';
import type {Kubernetes} from '@/components/modals/NewConnectionModal/hooks/useKubernetes';
import type {SsmTunnel} from '@/components/modals/NewConnectionModal/hooks/useSsmTunnel';
import type {FormActions} from '@/components/modals/NewConnectionModal/hooks/useFormActions';
import type {DatabaseList} from '@/components/modals/NewConnectionModal/hooks/useDatabaseList';

/** Connection string field: parsing it into the form fields and its examples. */
export function useConnectionString(
    form: FormState & PluginSlots & SshTunnel & Kubernetes & SsmTunnel & FormActions & DatabaseList,
) {
    const {
        activeDriver,
        credentialFieldsHidden,
        driver,
        drivers,
        loadDatabases,
        setCredentialFieldsHiddenState,
        setDriver,
        setFormData,
        setLoadAllDatabases,
        setOptedIntoSchemaMultiDb,
        setPluginSecretChanges,
        setSelectedDatabasesState,
        t,
    } = form;
    const [connectionString, setConnectionString] = useState('');
    const [connectionStringError, setConnectionStringError] = useState<string | null>(null);

    const connectionStringEnabled =
        activeDriver?.capabilities?.connection_string ??
        activeDriver?.capabilities?.connectionString ??
        true;
    const connectionStringPlaceholder =
        activeDriver?.capabilities?.connection_string_example?.trim() ||
        activeDriver?.capabilities?.connectionStringExample?.trim() ||
        t('newConnection.connectionStringPlaceholder', {
            defaultValue: 'e.g. mysql://user:pass@localhost:3306/db',
        });
    const connectionStringExamples =
        activeDriver?.capabilities?.connection_string_examples ??
        activeDriver?.capabilities?.connectionStringExamples ??
        [];
    const selectedConnectionStringExample = connectionStringExamples.find(
        (example) => example.value === connectionString,
    );
    // ── connection string import ──
    const handleConnectionStringChange = (value: string) => {
        setConnectionString(value);
        setConnectionStringError(null);

        if (!value.trim()) {
            setFormData((prev) => ({
                ...prev,
                connection_uri: undefined,
                connection_uri_in_keychain: false,
            }));
            return;
        }

        const parserDrivers = drivers.map((item) => ({
            id: item.id,
            capabilities: item.capabilities,
        }));

        const result = parseConnectionString(value, parserDrivers);
        if (result.success) {
            const parsed = toConnectionParams(result.params);
            const newDriver = parsed.driver || driver;
            const parsedDriver = drivers.find((item) => item.id === newDriver);
            const parsedIsMultiDb = hasOptedIntoDatabaseSelection(
                parsedDriver?.capabilities,
                parsed.database ?? '',
            );

            const driverChanged = newDriver !== driver;
            const parsedFields: Partial<ConnectionParams> = {
                driver: newDriver,
                host: parsed.host || 'localhost',
                port: parsed.port,
                // Keep the user's TLS mode if the URL does not specify one.
                // A driver switch must not retain the prior driver's TLS mode.
                ...(parsed.ssl_mode !== undefined || driverChanged
                    ? {ssl_mode: parsed.ssl_mode ?? ''}
                    : {}),
                database: parsed.database || '',
                connection_uri: parsed.connection_uri,
                connection_uri_in_keychain: false,
            };

            const importingMysql =
                newDriver === 'mysql' ||
                newDriver === 'mariadb' ||
                parsedDriver?.capabilities?.sql_dialect === 'mysql';
            const tlsDisabled =
                parsed.ssl_mode !== undefined &&
                !['required', 'verify_ca', 'verify_identity'].includes(parsed.ssl_mode);
            // The MySQL cleartext login and IAM login require enforced TLS.
            if ((importingMysql && tlsDisabled) || (driverChanged && !importingMysql)) {
                parsedFields.enable_cleartext_plugin = false;
                parsedFields.use_iam_auth = false;
            }

            // Plugin-owned extra fields belong to the driver that produced them, so
            // an import that switches driver drops them like the catalogue does.
            if (driverChanged) {
                parsedFields.extra = undefined;
            }

            // While a plugin hides the host login inputs, an imported login would sit
            // in invisible fields and reach a driver that rejects it, so the
            // username/password of the string are ignored. A driver switch resets
            // that flag, so the login is applied as usual.
            if (driverChanged || !credentialFieldsHidden) {
                parsedFields.username = parsed.username || '';
                // A passthrough URI carries its own credentials, so the password field
                // is left untouched rather than blanked — writing "" here would
                // overwrite the password already stored for this connection.
                if (!parsed.connection_uri) {
                    parsedFields.password = parsed.password || '';
                }
            }

            if (parsedIsMultiDb) {
                // A URI without a database means "browse everything": switch to
                // all-databases mode instead of keeping whatever the form held before.
                if (parsed.database) {
                    setSelectedDatabasesState([parsed.database]);
                    setLoadAllDatabases(false);
                } else {
                    setSelectedDatabasesState([]);
                    setLoadAllDatabases(true);
                }
            }
            // Sync the schema-based opt-in checkbox to the parsed URI's inferred
            // state. A Postgres URI without a database (postgresql://host) means
            // "browse everything" → opt in; one with a database (postgresql://host/db)
            // means single-database → opt out. Use the PARSED driver's capability,
            // not the closure's activeDriver, since the import may have switched
            // drivers.
            if (isSchemaBasedMultiDbCapable(parsedDriver?.capabilities)) {
                setOptedIntoSchemaMultiDb(parsedIsMultiDb);
            }

            if (driverChanged) {
                setDriver(newDriver);
                setCredentialFieldsHiddenState(false);
                setPluginSecretChanges({});
            }

            setFormData((prev) => ({
                ...prev,
                ...parsedFields,
            }));

            // In all-databases mode there is no picker to fill, and the fetch can
            // spawn SSH/K8s tunnels — same reasoning as the edit-dialog init above.
            if (!parsedIsMultiDb || parsed.database) {
                void loadDatabases(parsedFields);
            }
        } else {
            setConnectionStringError(result.error);
        }
    };

    const handleClearConnectionString = () => {
        setConnectionString('');
        setConnectionStringError(null);
        // Drop the imported URI too, so clearing the field also clears the secret
        // instead of leaving a stale keychain entry behind.
        setFormData((prev) => ({
            ...prev,
            connection_uri: undefined,
            connection_uri_in_keychain: false,
        }));
    };

    // ── rendered general tab content ──

    return {
        connectionString,
        setConnectionString,
        connectionStringError,
        setConnectionStringError,
        connectionStringEnabled,
        connectionStringPlaceholder,
        connectionStringExamples,
        selectedConnectionStringExample,
        handleConnectionStringChange,
        handleClearConnectionString,
    };
}

export type ConnectionStringImport = ReturnType<typeof useConnectionString>;
