import {forwardRef, useRef, useState, type MouseEvent} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Columns2, Rows2, Unlink, X} from 'lucide-react';
import type {ConnectionStatus} from '@/hooks/useConnectionManager';
import {useConnectionLayoutContext} from '@/hooks/useConnectionLayoutContext';
import {useDatabase} from '@/hooks/useDatabase';
import {useDrivers} from '@/hooks/useDrivers';
import {ContextMenu, type ContextMenuItem} from '@/components/ui/ContextMenu';
import {onActivationKey} from '@/utils/keyboardEvents';
import {rectContains, startPointerDrag} from '@/utils/pointerDrag';
import {ConnectionTile} from '@/components/connections/ConnectionTile';
import {TREE_GUTTER, TreeElbow} from './TreeElbow';
import {FOCUS_RING, FOCUS_RING_INSET} from '@/components/ui/focusRing';
import {rowStateClass} from './rowState';

interface SplitGroupRowProps {
    connections: ConnectionStatus[];
    mode: 'vertical' | 'horizontal';
    variant: 'expanded' | 'rail';
    isLast?: boolean;
    /** True while a connection is dragged over the group. */
    isDropTarget: boolean;
}

/** The connections shown side by side in the editor's split view. */
export const SplitGroupRow = forwardRef<HTMLDivElement, SplitGroupRowProps>(
    ({connections, mode, variant, isLast = false, isDropTarget}, ref) => {
        const {t} = useTranslation();
        const navigate = useNavigate();
        const {pathname} = useLocation();
        const {
            splitView,
            deactivateSplit,
            showSplitView,
            isSplitVisible,
            removeConnectionFromSplit,
            swapSplitConnections,
        } = useConnectionLayoutContext();
        const {connections: savedConnections} = useDatabase();
        const {allDrivers} = useDrivers();
        const [menu, setMenu] = useState<{x: number; y: number; connectionId?: string} | null>(
            null,
        );
        const [swapTarget, setSwapTarget] = useState<string | null>(null);
        const iconRefs = useRef(new Map<string, HTMLSpanElement>());
        const swapTargetRef = useRef<string | null>(null);

        // Panes in split order, not sidebar order.
        const ordered = splitView
            ? splitView.connectionIds
                  .map((id) => connections.find((c) => c.id === id))
                  .filter((c): c is ConnectionStatus => !!c)
            : connections;
        const names = ordered.map((c) => c.name).join(' / ');
        const isCurrentView = isSplitVisible && pathname === '/editor';
        const ModeIcon = mode === 'vertical' ? Columns2 : Rows2;

        const open = () => {
            showSplitView();
            navigate('/editor');
        };

        // Pointer reorder of the mini tiles: dropping one on another swaps the panes.
        const startSwap = (conn: ConnectionStatus, e: MouseEvent) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            startPointerDrag(e.clientX, e.clientY, {
                createGhost: () => {
                    const ghost = document.createElement('div');
                    ghost.className =
                        'px-2 py-1 rounded-md text-xs bg-elevated text-primary border border-default shadow-menu';
                    ghost.textContent = conn.name;
                    return ghost;
                },
                onDragMove: (x, y) => {
                    let found: string | null = null;
                    for (const [id, el] of iconRefs.current) {
                        if (id !== conn.id && rectContains(el.getBoundingClientRect(), x, y)) {
                            found = id;
                            break;
                        }
                    }
                    swapTargetRef.current = found;
                    setSwapTarget((prev) => (prev === found ? prev : found));
                },
                onDrop: () => {
                    if (swapTargetRef.current) swapSplitConnections(conn.id, swapTargetRef.current);
                },
                onEnd: () => {
                    swapTargetRef.current = null;
                    setSwapTarget(null);
                },
            });
        };

        const separate = {
            label: t('sidebar.separateConnections'),
            icon: Unlink,
            action: deactivateSplit,
        };
        const menuItems: ContextMenuItem[] = menu?.connectionId
            ? [
                  {
                      label: t('sidebar.removeFromSplitGroup'),
                      icon: X,
                      action: () => removeConnectionFromSplit(menu.connectionId!),
                  },
                  separate,
              ]
            : [separate];

        const tiles = (
            <span
                className={clsx(
                    'grid shrink-0 grid-cols-2 gap-0.5 rounded-md p-0.5',
                    isDropTarget
                        ? 'outline outline-2 outline-accent-primary'
                        : 'bg-surface-primary',
                )}
            >
                {ordered.slice(0, 4).map((conn) => (
                    <span
                        key={conn.id}
                        ref={(el) => {
                            if (el) iconRefs.current.set(conn.id, el);
                            else iconRefs.current.delete(conn.id);
                        }}
                        // Mouse-only handle: the group's accessible name lists the connections.
                        aria-hidden="true"
                        onMouseDown={(e) => startSwap(conn, e)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenu({x: e.clientX, y: e.clientY, connectionId: conn.id});
                        }}
                        className={clsx(
                            'cursor-grab rounded active:cursor-grabbing',
                            swapTarget === conn.id && 'outline outline-2 outline-accent-primary',
                        )}
                        title={conn.name}
                    >
                        <ConnectionTile
                            connection={savedConnections.find((c) => c.id === conn.id)}
                            manifest={allDrivers.find((d) => d.id === conn.driver)}
                            size={variant === 'rail' ? 12 : 20}
                        />
                    </span>
                ))}
            </span>
        );

        const activation = {
            role: 'button' as const,
            tabIndex: 0,
            onClick: open,
            onKeyDown: onActivationKey(open),
            onContextMenu: (e: MouseEvent) => {
                e.preventDefault();
                setMenu({x: e.clientX, y: e.clientY});
            },
            'aria-label': `${t('sidebar.splitGroup')}: ${names}`,
            'aria-current': isCurrentView ? ('page' as const) : undefined,
        };

        return (
            <div
                ref={ref}
                className={clsx('relative', variant === 'rail' && 'flex justify-center')}
                style={variant === 'expanded' ? {paddingLeft: TREE_GUTTER} : undefined}
            >
                {variant === 'expanded' && <TreeElbow isLast={isLast} />}
                {variant === 'rail' ? (
                    <div
                        {...activation}
                        title={names}
                        className={clsx(
                            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors',
                            FOCUS_RING,
                            rowStateClass({isCurrent: isCurrentView}),
                        )}
                    >
                        {tiles}
                    </div>
                ) : (
                    <div
                        {...activation}
                        className={clsx(
                            'flex h-11 cursor-pointer items-center gap-2 rounded-md pl-1.5 pr-3 transition-colors',
                            FOCUS_RING_INSET,
                            rowStateClass({isCurrent: isCurrentView}),
                        )}
                    >
                        {tiles}
                        <span className="flex min-w-0 flex-1 flex-col gap-px">
                            <span className="truncate text-sm font-medium leading-4 text-primary">
                                {t('sidebar.splitGroup')}
                            </span>
                            <span className="truncate text-[11px] leading-[13px] text-muted">
                                {names}
                            </span>
                        </span>
                        <ModeIcon size={14} className="shrink-0 text-muted" aria-hidden="true" />
                    </div>
                )}
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
    },
);

SplitGroupRow.displayName = 'SplitGroupRow';
