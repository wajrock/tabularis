import {useCallback, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {useDatabase} from '@/hooks/useDatabase';
import {useSettings} from '@/hooks/useSettings';
import {useConnectionManager, type ConnectionStatus} from '@/hooks/useConnectionManager';
import {useConnectionLayoutContext} from '@/hooks/useConnectionLayoutContext';
import {useOpenConnectionInNewWindow} from '@/hooks/useOpenConnectionInNewWindow';
import {canAddToSplit, isConnectionGrouped} from '@/utils/connectionLayout';
import {
    groupSidebarConnections,
    moveIdRelativeTo,
    sortByIdOrder,
    type DropPosition,
} from '@/utils/connectionManager';
import {rectContains, startPointerDrag} from '@/utils/pointerDrag';

export interface DropTarget {
    id: string;
    position: DropPosition;
}

/**
 * Open connections as the sidebar shows them, with their actions and the
 * pointer-based drag (reorder, or drop onto the split group). HTML5 drag and
 * drop is avoided on purpose: it can freeze the WebKitGTK compositor.
 */
export function useOpenConnections() {
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const {connections, connectionGroups} = useDatabase();
    const {settings} = useSettings();
    const {openConnections, handleDisconnect, handleSwitch} = useConnectionManager();
    const {splitView, hideSplitView, addConnectionToSplit} = useConnectionLayoutContext();
    const openInNewWindow = useOpenConnectionInNewWindow();

    // Sidebar-only ordering, in memory: it resets when connections close.
    const [order, setOrder] = useState<string[]>([]);
    const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(() => new Set());

    const splitConnections = useMemo(
        () => openConnections.filter((conn) => isConnectionGrouped(conn.id, splitView)),
        [openConnections, splitView],
    );
    const sortedConnections = useMemo(
        () =>
            sortByIdOrder(
                openConnections.filter((conn) => !isConnectionGrouped(conn.id, splitView)),
                order,
            ),
        [openConnections, splitView, order],
    );
    const folders = useMemo(
        () =>
            settings.groupSidebarConnectionsByFolder === true
                ? groupSidebarConnections(sortedConnections, connections, connectionGroups)
                : null,
        [
            settings.groupSidebarConnectionsByFolder,
            sortedConnections,
            connections,
            connectionGroups,
        ],
    );
    const folderOfConnection = useMemo(
        () =>
            new Map(
                folders?.folders.flatMap((f) =>
                    f.connections.map((c) => [c.id, f.group.id] as const),
                ) ?? [],
            ),
        [folders],
    );
    // Hints must match the Cmd/Ctrl+Shift+N shortcut, which switches by open order.
    const shortcutIndex = useMemo(
        () => new Map(openConnections.map((c, i) => [c.id, i + 1])),
        [openConnections],
    );

    const toggleFolder = useCallback((groupId: string) => {
        setCollapsedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    }, []);

    const switchTo = useCallback(
        (connectionId: string) => {
            if (splitView) hideSplitView();
            handleSwitch(connectionId);
            if (pathname !== '/editor') navigate('/editor');
        },
        [splitView, hideSplitView, handleSwitch, pathname, navigate],
    );

    const openInEditor = useCallback(
        (connectionId: string) => {
            handleSwitch(connectionId);
            navigate('/editor');
        },
        [handleSwitch, navigate],
    );

    const openInWindow = useCallback(
        (connectionId: string) => {
            const conn = connections.find((c) => c.id === connectionId);
            // Open connections are known-good, so this does not re-validate.
            void openInNewWindow(connectionId, conn?.name ?? null).catch((e) => {
                console.error('[Sidebar] Failed to open connection in new window:', e);
            });
        },
        [connections, openInNewWindow],
    );

    const disconnect = useCallback(
        async (connectionId: string) => {
            const isLast = openConnections.length <= 1;
            await handleDisconnect(connectionId);
            if (isLast) navigate('/');
        },
        [openConnections.length, handleDisconnect, navigate],
    );

    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [isGroupDropTarget, setIsGroupDropTarget] = useState(false);
    const itemRefs = useRef(new Map<string, HTMLElement>());
    const groupRef = useRef<HTMLDivElement | null>(null);
    const pendingDrop = useRef<DropTarget | 'group' | null>(null);

    const registerItem = useCallback(
        (id: string) => (el: HTMLElement | null) => {
            if (el) itemRefs.current.set(id, el);
            else itemRefs.current.delete(id);
        },
        [],
    );

    const startDrag = useCallback(
        (conn: ConnectionStatus, e: React.MouseEvent) => {
            if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
            startPointerDrag(e.clientX, e.clientY, {
                threshold: 5,
                createGhost: () => {
                    const ghost = document.createElement('div');
                    ghost.className =
                        'px-2 py-1 rounded-md text-xs bg-elevated text-primary border border-default shadow-menu';
                    ghost.textContent = conn.name;
                    return ghost;
                },
                onDragMove: (x, y) => {
                    const groupEl = groupRef.current;
                    if (
                        groupEl &&
                        canAddToSplit(splitView, conn.id) &&
                        rectContains(groupEl.getBoundingClientRect(), x, y)
                    ) {
                        pendingDrop.current = 'group';
                        setIsGroupDropTarget(true);
                        setDropTarget(null);
                        return;
                    }
                    let found: DropTarget | null = null;
                    for (const [id, el] of itemRefs.current) {
                        if (id === conn.id) continue;
                        if (folderOfConnection.get(id) !== folderOfConnection.get(conn.id))
                            continue;
                        const rect = el.getBoundingClientRect();
                        if (rectContains(rect, x, y)) {
                            found = {
                                id,
                                position: y < rect.top + rect.height / 2 ? 'above' : 'below',
                            };
                            break;
                        }
                    }
                    pendingDrop.current = found;
                    setIsGroupDropTarget(false);
                    setDropTarget((prev) =>
                        prev?.id === found?.id && prev?.position === found?.position ? prev : found,
                    );
                },
                onDrop: () => {
                    const target = pendingDrop.current;
                    if (target === 'group') addConnectionToSplit(conn.id);
                    else if (target)
                        setOrder(
                            moveIdRelativeTo(
                                sortedConnections.map((c) => c.id),
                                conn.id,
                                target,
                            ),
                        );
                },
                onEnd: () => {
                    pendingDrop.current = null;
                    setDropTarget(null);
                    setIsGroupDropTarget(false);
                },
            });
        },
        [splitView, folderOfConnection, addConnectionToSplit, sortedConnections],
    );

    return {
        openConnections,
        splitConnections,
        sortedConnections,
        folders,
        collapsedFolders,
        toggleFolder,
        shortcutIndex,
        actions: {switchTo, openInEditor, openInWindow, disconnect},
        drag: {dropTarget, isGroupDropTarget, registerItem, groupRef, startDrag},
    };
}

export type OpenConnectionsModel = ReturnType<typeof useOpenConnections>;
