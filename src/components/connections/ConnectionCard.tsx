import type {MouseEvent} from 'react';
import clsx from 'clsx';
import type {SavedConnection} from '@/contexts/DatabaseContext';
import type {PluginManifest} from '@/types/plugins';
import type {ConnectionTag} from '@/types/tags';
import type {MenuEntry} from '@/components/ui/Menu';
import {FOCUS_RING} from '@/components/ui/focusRing';
import {useConnectionDisplay} from '@/hooks/useConnectionDisplay';
import {onActivationKey} from '@/utils/keyboardEvents';
import type {ConnectionDropPosition} from '@/utils/connections';
import {ConnectionActions} from './ConnectionActions';
import {ConnectionChips} from './ConnectionChips';
import {ConnectionTile} from './ConnectionTile';
import {connectionItemStateClass} from './connectionItemState';
import {StatusBadge} from './StatusBadge';
import {useConnectionItemClick} from './useConnectionItemClick';

export interface ConnectionCardProps {
    conn: SavedConnection;
    connectingId: string | null;
    allDrivers: PluginManifest[];
    enabledDrivers: PluginManifest[];
    /** All known connection tags, for resolving the card's tag chips. */
    tags?: ConnectionTag[];
    onConnect: () => void;
    onEdit: () => void;
    /** Entries of the "…" menu (the same as the right-click menu). */
    menuItems: () => MenuEntry[];
    onContextMenu: (e: MouseEvent<HTMLDivElement>) => void;
    onMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
    /** Whether this connection is checked in multi-select mode. */
    selected?: boolean;
    dropPosition?: ConnectionDropPosition | null;
    dropAxis?: 'x' | 'y';
    /** Toggles this connection's selection (Cmd/Ctrl + click). */
    onToggleSelect?: () => void;
}

export const ConnectionCard = ({
    conn,
    connectingId,
    allDrivers,
    enabledDrivers,
    tags = [],
    onConnect,
    onEdit,
    menuItems,
    onContextMenu,
    onMouseDown,
    selected = false,
    dropPosition = null,
    dropAxis = 'x',
    onToggleSelect,
}: ConnectionCardProps) => {
    const {manifest, isDriverEnabled, isActive, isOpen, isConnecting, subtitle} =
        useConnectionDisplay(conn, connectingId, allDrivers, enabledDrivers);
    const connectIfPossible = () => {
        if (isDriverEnabled && !isConnecting) onConnect();
    };
    const clickHandlers = useConnectionItemClick({
        connect: connectIfPossible,
        onToggleSelect,
        onMouseDown,
    });

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={conn.name}
            aria-disabled={!isDriverEnabled || undefined}
            {...clickHandlers}
            onKeyDown={onActivationKey(connectIfPossible)}
            onContextMenu={onContextMenu}
            data-connection-id={conn.id}
            className={clsx(
                'group relative flex cursor-pointer select-none flex-col gap-4 rounded-lg border border-default p-4 transition-shadow hover:shadow-card',
                FOCUS_RING,
                isConnecting && 'pointer-events-none',
                connectionItemStateClass({variant: 'card', selected, isActive, isDriverEnabled}),
            )}
        >
            {dropPosition && (
                <div
                    data-testid={`connection-drop-${dropPosition}`}
                    className={clsx(
                        'pointer-events-none absolute z-20 rounded-full bg-accent-primary',
                        dropAxis === 'x' ? 'bottom-3 top-3 w-1' : 'left-3 right-3 h-1',
                        dropAxis === 'x'
                            ? dropPosition === 'before'
                                ? '-left-1.5'
                                : '-right-1.5'
                            : dropPosition === 'before'
                              ? '-top-1.5'
                              : '-bottom-1.5',
                    )}
                />
            )}

            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <ConnectionTile connection={conn} manifest={manifest} size={32} />
                    <div className="flex min-w-0 flex-col gap-px">
                        <span className="truncate text-sm font-medium text-primary">
                            {conn.name}
                        </span>
                        <span className="truncate text-xs text-muted">{subtitle}</span>
                    </div>
                </div>
                <ConnectionActions
                    canEdit={isDriverEnabled}
                    onEdit={onEdit}
                    menuItems={menuItems}
                    className="-mr-1.5 -mt-1.5"
                />
            </div>

            <div className="flex items-end justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <ConnectionChips
                        conn={conn}
                        driverManifest={manifest}
                        isDriverEnabled={isDriverEnabled}
                        tags={tags}
                    />
                </div>
                <div className="shrink-0">
                    <StatusBadge isActive={isActive} isOpen={isOpen} isConnecting={isConnecting} />
                </div>
            </div>
        </div>
    );
};
