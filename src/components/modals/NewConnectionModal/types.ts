import {type ConnectionAppearance} from '@/contexts/DatabaseContext';
import {type ProxyOverride} from '@/types/proxy';
import {type K8sCommandOptions} from '@/utils/k8s';

// Accent colors per data paradigm, used for driver chips in the configure header.
export const PARADIGM_ACCENT: Record<string, string> = {
    sql: '#3b82f6',
    relational: '#3b82f6',
    nosql: '#10b981',
    document: '#10b981',
    'key-value': '#14b8a6',
    vector: '#a855f7',
    graph: '#f59e0b',
    timeseries: '#ec4899',
    search: '#6366f1',
};

export const paradigmAccent = (p: string): string => PARADIGM_ACCENT[p] ?? '#64748b';

export interface ConnectionParams {
    driver: string;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    /** Raw driver-specific connection URI, stored in the OS keychain, never in connections.json. */
    connection_uri?: string;
    /** True when the URI can be restored from the OS keychain. */
    connection_uri_in_keychain?: boolean;
    database: string | string[];
    ssl_mode?: string;
    ssl_ca?: string;
    ssl_cert?: string;
    ssl_key?: string;
    // MySQL/MariaDB: mysql_clear_password (cleartext) auth plugin (TLS required)
    enable_cleartext_plugin?: boolean;
    // MySQL: force PIPES_AS_CONCAT / NO_ENGINE_SUBSTITUTION sql_mode on connect.
    // Defaults to true; disable for Vitess/PlanetScale which reject altering sql_mode.
    pipes_as_concat?: boolean;
    // When true, the password field is an RDS auth token (mysql only).
    use_iam_auth?: boolean;
    // SSH
    ssh_enabled?: boolean;
    ssh_connection_id?: string;
    // Legacy SSH fields (for backward compatibility)
    ssh_host?: string;
    ssh_port?: number;
    ssh_user?: string;
    ssh_password?: string;
    ssh_key_file?: string;
    ssh_key_passphrase?: string;
    ssh_allow_passphrase_prompt?: boolean;
    save_in_keychain?: boolean;
    // K8s
    k8s_enabled?: boolean;
    k8s_connection_id?: string;
    k8s_context?: string;
    k8s_namespace?: string;
    k8s_resource_type?: string;
    k8s_resource_name?: string;
    k8s_port?: number;
    k8s_kubectl_path?: string;
    k8s_kubeconfig_path?: string;
    // AWS SSM - forwards to host/port through the managed node
    ssm_enabled?: boolean;
    ssm_target?: string;
    ssm_profile?: string;
    ssm_region?: string;
    // SQL run on every new connection (e.g. SET / set_config)
    startup_script?: string;
    /** Connection pooler mode for PgBouncer / transaction-mode poolers. */
    pooler_mode?: string;
    // Opaque plugin-specific connection fields, forwarded verbatim to the
    // driver/plugin and persisted as-is in connections.json.
    extra?: Record<string, string>;
    /** Optional proxy override (inherit / custom / disabled). */
    proxy?: ProxyOverride;
}

export interface SavedConnection {
    id: string;
    name: string;
    params: ConnectionParams;
    plugin_secret_keys?: string[];
    detect_json_in_text_columns?: boolean;
    appearance?: ConnectionAppearance;
    tag_ids?: string[];
    environment?: 'development' | 'staging' | 'production';
}

export interface NewConnectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
    initialConnection?: SavedConnection | null;
}

export interface K8sDiscoveryErrors {
    contexts: string | null;
    namespaces: string | null;
    resources: string | null;
}

export type K8sDiscoverySource = keyof K8sDiscoveryErrors;

export type InlineK8sPathCheck =
    {allowed: true; options?: K8sCommandOptions} | {allowed: false; reason: 'invalid' | 'applied'};

export function hasK8sCommandOverrides(options: K8sCommandOptions): boolean {
    return options.kubectl_path !== undefined || options.kubeconfig_path !== undefined;
}
