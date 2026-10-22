import {useState, type MouseEvent} from 'react';
import {useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {
    AppWindow,
    Check,
    Columns2,
    Copy,
    Loader2,
    Power,
    Rows2,
    Shield,
    SquarePlus,
    Terminal,
    X,
} from 'lucide-react';
import type {ConnectionStatus} from '@/hooks/useConnectionManager';
import {useDatabase} from '@/hooks/useDatabase';
import {useDrivers} from '@/hooks/useDrivers';
import {useHomeDir} from '@/hooks/useHomeDir';
import {useConnectionLayoutContext} from '@/hooks/useConnectionLayoutContext';
import {ContextMenu, type ContextMenuItem} from '@/components/ui/ContextMenu';
import {canActivateSplit, canAddToSplit} from '@/utils/connectionLayout';
import {connectionMeta} from '@/utils/connections';
import {getCapabilitiesForDriver} from '@/utils/driverCapabilities';
import type {DropPosition} from '@/utils/connectionManager';
import {ConnectionTile} from '@/components/connections/ConnectionTile';
import {TREE_GUTTER, TreeElbow} from './TreeElbow';
import {FOCUS_RING, FOCUS_RING_INSET} from '@/components/ui/focusRing';
import {rowStateClass} from './rowState';

interface OpenConnectionRowProps {
    connection: ConnectionStatus;
    variant: 'expanded' | 'rail';
    /** Last child of its branch: the tree line stops at its elbow. */
    isLast?: boolean;
    /** Extra left indent (px) for connections inside a folder. */
    indent?: number;
    shortcutIndex?: number;
    showShortcutHint: boolean;
    dropIndicator: DropPosition | null;
    onSwitch: () => void;
    onOpenInEditor: () => void;
    onOpenInWindow: () => void;
    onDisconnect: () => void;
    /** Starts the pointer drag (reorder, or drop onto the split group). */
    onDragStart?: (e: MouseEvent) => void;
    itemRef?: (el: HTMLElement | null) => void;
}

export function OpenConnectionRow({
    connection,
    variant,
    isLast = false,
    indent = 0,
    shortcutIndex,
    showShortcutHint,
    dropIndicator,
    onSwitch,
    onOpenInEditor,
    onOpenInWindow,
    onDisconnect,
    onDragStart,
    itemRef,
}: OpenConnectionRowProps) {
    const {t} = useTranslation();
    const {pathname} = useLocation();
    const {connections} = useDatabase();
    const {allDrivers} = useDrivers();
    const homeDir = useHomeDir();
    const {selectedConnectionIds, toggleSelection, activateSplit, splitView, addConnectionToSplit} =
        useConnectionLayoutContext();
    const [menu, setMenu] = useState<{x: number; y: number} | null>(null);

    const {id, name, isActive, isConnecting, error} = connection;
    const saved = connections.find((c) => c.id === id);
    const manifest = allDrivers.find((d) => d.id === connection.driver);
    const isProduction = saved?.environment === 'production';
    const isSelected = selectedConnectionIds.has(id);
    // A connection owns the "current view" only in the editor; elsewhere the nav item does.
    const isCurrentView = isActive && pathname === '/editor';
    const hasTunnel = connection.sshEnabled || connection.k8sEnabled || connection.ssmEnabled;
    const meta = saved
        ? connectionMeta(saved, getCapabilitiesForDriver(connection.driver, allDrivers), homeDir)
        : connection.database;
    const hint = showShortcutHint && shortcutIndex !== undefined && shortcutIndex <= 9;

    const handleClick = (e: MouseEvent) => {
        if (e.ctrlKey || e.metaKey) toggleSelection(id, true);
        else onSwitch();
    };

    const menuItems: ContextMenuItem[] = [
        ...(canActivateSplit(selectedConnectionIds)
            ? [
                  {
                      label: t('sidebar.splitVertical'),
                      icon: Columns2,
                      action: () => activateSplit('vertical'),
                  },
                  {
                      label: t('sidebar.splitHorizontal'),
                      icon: Rows2,
                      action: () => activateSplit('horizontal'),
                  },
                  {separator: true as const},
              ]
            : []),
        ...(canAddToSplit(splitView, id)
            ? [
                  {
                      label: t('sidebar.addToSplitGroup'),
                      icon: SquarePlus,
                      action: () => addConnectionToSplit(id),
                  },
                  {separator: true as const},
              ]
            : []),
        {label: t('sidebar.openInEditor'), icon: Terminal, action: onOpenInEditor},
        {label: t('sidebar.openInNewWindow'), icon: AppWindow, action: onOpenInWindow},
        {label: t('sidebar.setAsActive'), icon: Check, action: onSwitch, disabled: isActive},
        {separator: true as const},
        {
            label: t('sidebar.copyName'),
            icon: Copy,
            action: () => void navigator.clipboard.writeText(name),
        },
        {separator: true as const},
        {label: t('connections.disconnect'), icon: Power, action: onDisconnect, danger: true},
    ];

    const status = isConnecting ? (
        <Loader2 size={12} className="animate-spin text-status-warning" />
    ) : (
        <span
            className={clsx(
                'h-2 w-2 rounded-full',
                error ? 'bg-status-error' : 'bg-status-success',
            )}
        />
    );

    const dropLine = (position: DropPosition) =>
        dropIndicator === position && (
            <span
                aria-hidden="true"
                className={clsx(
                    'pointer-events-none absolute left-2 right-2 z-10 h-0.5 rounded-full bg-accent-primary',
                    position === 'above' ? '-top-px' : '-bottom-px',
                )}
            />
        );

    const label = [name, meta, error].filter(Boolean).join('\n');

    if (variant === 'rail') {
        return (
            <div ref={itemRef} className="group relative flex justify-center">
                {dropLine('above')}
                <button
                    type="button"
                    onClick={handleClick}
                    onMouseDown={onDragStart}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setMenu({x: e.clientX, y: e.clientY});
                    }}
                    aria-label={label}
                    aria-current={isCurrentView ? 'page' : undefined}
                    className={clsx(
                        'relative flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                        FOCUS_RING,
                        rowStateClass({isSelected, isCurrent: isCurrentView}),
                    )}
                >
                    <ConnectionTile
                        connection={saved}
                        manifest={manifest}
                        size={24}
                        isProduction={isProduction}
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-elevated">
                        {status}
                    </span>
                    {hint && (
                        <span className="absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 font-mono text-[10px] text-inverse">
                            {shortcutIndex}
                        </span>
                    )}
                </button>
                {dropLine('below')}
                {menu && (
                    <ContextMenu
                        x={menu.x}
                        y={menu.y}
                        items={menuItems}
                        onClose={() => setMenu(null)}
                    />
                )}
            </div>
        );
    }

    return (
        <div ref={itemRef} className="group relative" style={{paddingLeft: TREE_GUTTER + indent}}>
            <TreeElbow isLast={isLast} indent={indent} />
            {dropLine('above')}
            <button
                type="button"
                onClick={handleClick}
                onMouseDown={onDragStart}
                onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({x: e.clientX, y: e.clientY});
                }}
                title={label}
                aria-current={isCurrentView ? 'page' : undefined}
                className={clsx(
                    'flex h-11 w-full items-center gap-2 rounded-md pl-1.5 pr-9 text-left transition-colors',
                    FOCUS_RING_INSET,
                    rowStateClass({isSelected, isCurrent: isCurrentView}),
                )}
            >
                <ConnectionTile
                    connection={saved}
                    manifest={manifest}
                    size={28}
                    isProduction={isProduction}
                />
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="truncate text-sm font-medium leading-4 text-primary">
                        {name}
                    </span>
                    <span
                        className={clsx(
                            'truncate text-[11px] leading-[13px]',
                            error ? 'text-tint-danger-fg' : 'text-muted',
                        )}
                    >
                        {error ?? meta}
                    </span>
                </span>
            </button>
            {/* Trailing slot: shortcut number, or status dot swapped for "disconnect" on hover. */}
            <div className="absolute inset-y-0 right-1.5 flex items-center gap-1.5">
                {hasTunnel && !hint && (
                    <Shield size={12} className="text-muted" aria-label={t('sidebar.tunnel')} />
                )}
                {hint ? (
                    <span className="w-4 text-center font-mono text-[11px] text-muted">
                        {shortcutIndex}
                    </span>
                ) : (
                    <span className="relative flex h-5 w-5 items-center justify-center">
                        <span className="flex items-center justify-center group-hover:opacity-0 group-focus-within:opacity-0">
                            {status}
                        </span>
                        <button
                            type="button"
                            onClick={onDisconnect}
                            aria-label={t('connections.disconnect')}
                            title={t('connections.disconnect')}
                            className={clsx(
                                'absolute inset-0 flex items-center justify-center rounded-md text-secondary opacity-0 transition-colors',
                                'hover:bg-surface-secondary hover:text-primary group-hover:opacity-100 focus-visible:opacity-100',
                                FOCUS_RING,
                            )}
                        >
                            <X size={12} />
                        </button>
                    </span>
                )}
            </div>
            {dropLine('below')}
            {menu && (
                <ContextMenu
                    x={menu.x}
                    y={menu.y}
                    items={menuItems}
                    onClose={() => setMenu(null)}
                />
            )}
        </div>
    );
}
