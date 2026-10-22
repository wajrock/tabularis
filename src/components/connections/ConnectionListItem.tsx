import type {MouseEvent} from 'react';
import clsx from 'clsx';
import type {SavedConnection} from '@/contexts/DatabaseContext';
import type {PluginManifest} from '@/types/plugins';
import type {ConnectionTag} from '@/types/tags';
import type {MenuEntry} from '@/components/ui/Menu';
import {FOCUS_RING_INSET} from '@/components/ui/focusRing';
import {useConnectionDisplay} from '@/hooks/useConnectionDisplay';
import {onActivationKey} from '@/utils/keyboardEvents';
import type {ConnectionDropPosition} from '@/utils/connections';
import {ConnectionActions} from './ConnectionActions';
import {ConnectionChips} from './ConnectionChips';
import {ConnectionTile} from './ConnectionTile';
import {connectionItemStateClass} from './connectionItemState';
import {StatusBadge} from './StatusBadge';

export interface ConnectionListItemProps {
    conn: SavedConnection;
    connectingId: string | null;
    allDrivers: PluginManifest[];
    enabledDrivers: PluginManifest[];
    /** All known connection tags, for resolving the row's tag chips. */
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
    /** Toggles this connection's selection (Cmd/Ctrl + click). */
    onToggleSelect?: () => void;
}

/** One row of the list view; rows stack inside a bordered `ConnectionList`. */
export const ConnectionListItem = ({
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
    onToggleSelect,
}: ConnectionListItemProps) => {
    const {manifest, isDriverEnabled, isActive, isOpen, isConnecting, subtitle} =
        useConnectionDisplay(conn, connectingId, allDrivers, enabledDrivers);
    const connectIfPossible = () => {
        if (isDriverEnabled && !isConnecting) onConnect();
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={conn.name}
            aria-disabled={!isDriverEnabled || undefined}
            onClick={(e) => {
                if ((e.metaKey || e.ctrlKey) && onToggleSelect) {
                    e.preventDefault();
                    onToggleSelect();
                }
            }}
            onDoubleClick={connectIfPossible}
            onKeyDown={onActivationKey(connectIfPossible)}
            onContextMenu={onContextMenu}
            onMouseDown={onMouseDown}
            data-connection-id={conn.id}
            className={clsx(
                'group relative flex h-[52px] cursor-pointer select-none items-center gap-4 px-4 transition-colors',
                FOCUS_RING_INSET,
                isConnecting && 'pointer-events-none',
                connectionItemStateClass({variant: 'row', selected, isActive, isDriverEnabled}),
            )}
        >
            {dropPosition && (
                <div
                    data-testid={`connection-drop-${dropPosition}`}
                    className={clsx(
                        'pointer-events-none absolute left-2 right-2 z-20 h-0.5 rounded-full bg-accent-primary',
                        dropPosition === 'before' ? '-top-px' : '-bottom-px',
                    )}
                />
            )}
            <div className="flex w-[28%] min-w-0 items-center gap-3">
                <ConnectionTile connection={conn} manifest={manifest} size={28} />
                <span className="truncate text-sm font-medium text-primary">{conn.name}</span>
            </div>
            <span className="w-[22%] min-w-0 truncate text-xs text-muted">{subtitle}</span>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <ConnectionChips
                    conn={conn}
                    driverManifest={manifest}
                    isDriverEnabled={isDriverEnabled}
                    tags={tags}
                />
            </div>
            <div className="w-24 shrink-0">
                <StatusBadge isActive={isActive} isOpen={isOpen} isConnecting={isConnecting} />
            </div>
            <ConnectionActions
                canEdit={isDriverEnabled}
                onEdit={onEdit}
                menuItems={menuItems}
                className="-mr-1.5"
            />
        </div>
    );
};
