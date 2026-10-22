import {useTranslation} from 'react-i18next';
import type {SavedConnection} from '@/contexts/DatabaseContext';
import type {PluginManifest} from '@/types/plugins';
import {useDatabase} from '@/hooks/useDatabase';
import {getCapabilitiesForDriver} from '@/utils/driverCapabilities';
import {connectionSubtitle} from '@/utils/connections';

/** What a saved connection's card or row shows: driver, subtitle and live state. */
export function useConnectionDisplay(
    conn: SavedConnection,
    connectingId: string | null,
    allDrivers: PluginManifest[],
    enabledDrivers: PluginManifest[],
) {
    const {t} = useTranslation();
    const {activeConnectionId, isConnectionOpenAnywhere} = useDatabase();
    const capabilities = getCapabilitiesForDriver(conn.params.driver, allDrivers);

    return {
        manifest: allDrivers.find((d) => d.id === conn.params.driver),
        isDriverEnabled: enabledDrivers.some((d) => d.id === conn.params.driver),
        isActive: activeConnectionId === conn.id,
        // Open here or in another window.
        isOpen: isConnectionOpenAnywhere(conn.id),
        isConnecting: connectingId === conn.id,
        subtitle: connectionSubtitle(conn, capabilities, {
            allDatabases: t('newConnection.allDatabases'),
            databaseCount: (count) =>
                t('connections.databaseCount', {count, defaultValue: '{{count}} databases'}),
        }),
    };
}
