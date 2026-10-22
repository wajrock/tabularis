import {restoreSession} from '@/utils/restoreSession';
import {getCurrentWindow} from '@tauri-apps/api/window';
import {lazy, Suspense, useState, useEffect, useMemo, useRef, useCallback} from 'react';
import {useNavigate, useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {LoadingState} from '@/components/ui/LoadingState';
import {ConfirmModal} from '@/components/modals/ConfirmModal';
import {ExportConnectionsModal, type ExportMode} from '@/components/modals/ExportConnectionsModal';
import {invoke} from '@tauri-apps/api/core';
import {save} from '@tauri-apps/plugin-dialog';
import {writeTextFile} from '@tauri-apps/plugin-fs';
import {
    Plus,
    Pencil,
    Play,
    AppWindowMac,
    FolderSymlink,
    FolderMinus,
    Power,
    Copy,
    Trash2,
    X,
    FolderPlus,
    Folder,
    ArrowLeftRight,
} from 'lucide-react';
import {useDatabase} from '@/hooks/useDatabase';
import {useDrivers} from '@/hooks/useDrivers';
import {useSettings} from '@/hooks/useSettings';
import {Menu, type MenuEntry} from '@/components/ui/Menu';
import type {SavedConnection} from '@/contexts/DatabaseContext';
import {flattenGroupTree} from '@/utils/groupTree';
import {toErrorMessage} from '@/utils/errors';
import {
    connectionOrderAfterMove,
    planGroupDrop,
    connectionDropZone,
    groupDropZone,
    type ConnectionDropPosition,
    type GroupDropPosition,
    migrationDirectionForDriver,
} from '@/utils/connections';
import clsx from 'clsx';
import {fuzzyFilter} from '@/utils/fuzzy';
import {createDragGhost, type DragGhost} from '@/utils/pointerDrag';
import {useOpenConnectionInNewWindow} from '@/hooks/useOpenConnectionInNewWindow';
import {useConnectionTags} from '@/hooks/useConnectionTags';
import {GroupHeader} from '@/components/connections/GroupHeader';
import {ConnectionCard} from '@/components/connections/ConnectionCard';
import {ConnectionListItem} from '@/components/connections/ConnectionListItem';
import {ConnectionsEmptyState} from '@/components/connections/ConnectionsEmptyState';
import {ConnectionsHeader} from '@/components/connections/ConnectionsHeader';
import {ConnectionsNoResults} from '@/components/connections/ConnectionsNoResults';
import {ConnectionsSelectionBar} from '@/components/connections/ConnectionsSelectionBar';
import {GroupDropZone} from '@/components/connections/GroupDropZone';
import {UngroupedHeader} from '@/components/connections/UngroupedHeader';
import {ConnectionsToolbar} from '@/components/connections/ConnectionsToolbar';
import {ConnectionErrorBanner} from '@/components/ConnectionErrorBanner';
import {PostgresPluginMigrationBanner} from '@/components/banners/PostgresPluginMigrationBanner';
import {useCreateSqliteDatabase} from '@/hooks/useCreateSqliteDatabase';
import {
    useBuiltinPostgresMigration,
    type MigrationOutcome,
} from '@/hooks/useBuiltinDriverMigration';
import {useConnectionCatalogue} from '@/hooks/useConnectionCatalogue';
import {useToast} from '@/hooks/useToast';
import {useEscapeKey} from '@/hooks/useEscapeKey';
import {buildPluginIssueUrl, resolvePluginRepoUrl} from '@/utils/pluginIssueReport';
import {openUrl} from '@tauri-apps/plugin-opener';
import {APP_VERSION} from '@/version';

/** Drop target id of the "Ungrouped" section (connections outside any group). */
const UNGROUPED_DROP_ID = '__ungrouped__';

const NewConnectionModal = lazy(() =>
    import('@/components/modals/NewConnectionModal').then((m) => ({
        default: m.NewConnectionModal,
    })),
);
const ImportFromAppModal = lazy(() =>
    import('@/components/modals/ImportFromAppModal').then((m) => ({
        default: m.ImportFromAppModal,
    })),
);
const MigrationChecklistModal = lazy(() =>
    import('@/components/modals/MigrationChecklistModal').then((m) => ({
        default: m.MigrationChecklistModal,
    })),
);

const windowLabel = getCurrentWindow().label;
let autoConnectAttempted = false;

export const Connections = () => {
    const {t} = useTranslation();
    const {settings, isLoading: isSettingsLoading} = useSettings();
    const navigate = useNavigate();
    const location = useLocation();
    const {
        connect,
        disconnect,
        isConnectionOpen,
        isConnectionOpenAnywhere,
        switchConnection,
        connectionGroups,
        createGroupPath,
        updateGroup,
        moveGroupToParent,
        deleteGroup,
        moveConnectionToGroup,
        reorderConnectionsInGroup,
        reorderGroups,
        toggleGroupCollapsed,
        loadConnections,
        connections: contextConnections,
    } = useDatabase();
    const {drivers, allDrivers, installedPlugins} = useDrivers();
    const {tags, refresh: refreshTags} = useConnectionTags();
    const openConnectionInNewWindow = useOpenConnectionInNewWindow();
    const {createSqliteDatabase, isCreating: isCreatingSqliteDatabase} = useCreateSqliteDatabase();
    const migration = useBuiltinPostgresMigration();
    const {registry: catalogueRegistry} = useConnectionCatalogue(false);
    const {showToast} = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isImportAppModalOpen, setIsImportAppModalOpen] = useState(false);
    const [isMigrationChecklistOpen, setIsMigrationChecklistOpen] = useState(false);
    const [editingConnection, setEditingConnection] = useState<SavedConnection | null>(null);
    const connections = contextConnections as SavedConnection[];
    const [error, setError] = useState<string | null>(null);
    const [connectingId, setConnectingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isUngroupedCollapsed, setIsUngroupedCollapsed] = useState(false);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [groupContextMenu, setGroupContextMenu] = useState<{
        x: number;
        y: number;
        groupId: string;
    } | null>(null);
    const [connectionContextMenu, setConnectionContextMenu] = useState<{
        x: number;
        y: number;
        connId: string;
    } | null>(null);
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
    const [editGroupName, setEditGroupName] = useState('');
    const [subgroupInputFor, setSubgroupInputFor] = useState<string | null>(null);
    const [subgroupInputValue, setSubgroupInputValue] = useState('');
    const [confirmModal, setConfirmModal] = useState<{
        title: string;
        message: string;
        confirmLabel?: string;
        confirmClassName?: string;
        variant?: 'danger' | 'warning' | 'info';
        onConfirm: () => void;
    } | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportSelectionOnly, setExportSelectionOnly] = useState(false);
    const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);
    const [isDraggingGroupedConnection, setIsDraggingGroupedConnection] = useState(false);
    const [groupDrop, setGroupDrop] = useState<{
        id: string;
        position: GroupDropPosition;
    } | null>(null);
    const [connectionDrop, setConnectionDrop] = useState<{
        id: string;
        position: ConnectionDropPosition;
        axis: 'x' | 'y';
    } | null>(null);
    const isRenameCancelledRef = useRef(false);
    // Multi-select for bulk actions (delete / move to group)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        void loadConnections({ifNeeded: true});
    }, [loadConnections]);

    // Surface the migration outcome as a toast per the design's post-migration
    // spec: success gets an Undo action; failures (connection- or process-level)
    // get both Undo and Report an issue. The toast is the courtesy nudge, not
    // the only way back — the per-connection action stays bidirectional even
    // after this toast is dismissed.
    //
    // Called directly where migrateConnection resolves (in handleMigrate's
    // onConfirm below), not from a useEffect watching a "lastOutcome" piece of
    // hook state — `migrateConnection` already resolves with the outcome, so
    // routing it through state just to re-derive a toast from it on the next
    // render violated .rules/react.md #2 (no synchronous setState-in-effect)
    // for no benefit. It also meant every migrateConnection call anywhere —
    // including MigrationChecklistModal's bulk "Migrate N selected" loop,
    // which has its own per-row status UI — set that same shared state and
    // fired this toast a second time on top of the checklist's own feedback.
    const {builtinId, pluginId: defaultPluginId, undoMigration} = migration;
    const showMigrationOutcomeToast = useCallback(
        (outcome: MigrationOutcome) => {
            const handleUndo = () => {
                void undoMigration(outcome.connectionId).then((result) => {
                    if (!result.ok) {
                        showToast(
                            t('migration.toast.undoFailed', {
                                name: outcome.connectionName,
                                error: result.error ?? 'unknown error',
                            }),
                            {kind: 'error', duration: 0},
                        );
                    }
                });
            };

            const handleReportIssue = (failureMode: 'connection' | 'process') => {
                const pluginId = outcome.pluginId ?? defaultPluginId;
                const registryEntry = catalogueRegistry.find((p) => p.id === pluginId);
                const repoUrl = resolvePluginRepoUrl(pluginId, registryEntry?.repo_url);
                if (!repoUrl) {
                    // No registry entry and no known fallback — nothing to link to; the
                    // toast action simply has nowhere to send the user.
                    return;
                }
                const installed = installedPlugins.find((p) => p.id === pluginId);
                const url = buildPluginIssueUrl({
                    pluginId,
                    pluginVersion:
                        installed?.version ?? registryEntry?.installed_version ?? 'unknown',
                    repoUrl,
                    appVersion: APP_VERSION,
                    os: navigator.platform,
                    template: 'migration-failure',
                    failureMode,
                    error: outcome.error ?? outcome.startupError ?? 'unknown error',
                    migratedFromDriver: builtinId,
                });
                void openUrl(url);
            };

            if (outcome.status === 'ok') {
                showToast(t('migration.toast.success', {name: outcome.connectionName}), {
                    kind: 'success',
                    duration: 0,
                    actions: [{label: t('migration.toast.undo'), onClick: handleUndo}],
                });
            } else if (outcome.status === 'connection' && outcome.preexisting) {
                // The built-in driver couldn't reach this host either — not a
                // plugin regression, so no "Report an issue" action.
                showToast(
                    t('migration.toast.connectionFailurePreexisting', {
                        name: outcome.connectionName,
                        error: outcome.error,
                    }),
                    {
                        kind: 'warning',
                        duration: 0,
                        actions: [{label: t('migration.toast.undo'), onClick: handleUndo}],
                    },
                );
            } else if (outcome.status === 'connection') {
                showToast(
                    t('migration.toast.connectionFailure', {
                        name: outcome.connectionName,
                        error: outcome.error,
                    }),
                    {
                        kind: 'error',
                        duration: 0,
                        actions: [
                            {label: t('migration.toast.undo'), onClick: handleUndo},
                            {
                                label: t('migration.toast.reportIssue'),
                                onClick: () => handleReportIssue('connection'),
                            },
                        ],
                    },
                );
            } else if (outcome.status === 'process') {
                showToast(
                    outcome.startupError
                        ? t('migration.toast.processFailureWithError', {
                              name: outcome.connectionName,
                              error: outcome.startupError,
                          })
                        : t('migration.toast.processFailure', {name: outcome.connectionName}),
                    {
                        kind: 'error',
                        duration: 0,
                        actions: [
                            {label: t('migration.toast.undo'), onClick: handleUndo},
                            {
                                label: t('migration.toast.reportIssue'),
                                onClick: () => handleReportIssue('process'),
                            },
                        ],
                    },
                );
            } else {
                // status === "failed": something unexpected happened before the driver
                // flip could even be confirmed (e.g. the connection vanished
                // concurrently, or the write itself errored) — Undo is still offered
                // since flipping back to the built-in driver is safe either way.
                showToast(
                    t('migration.toast.failed', {
                        name: outcome.connectionName,
                        error: outcome.error ?? 'unknown error',
                    }),
                    {
                        kind: 'error',
                        duration: 0,
                        actions: [{label: t('migration.toast.undo'), onClick: handleUndo}],
                    },
                );
            }
        },
        [
            builtinId,
            defaultPluginId,
            undoMigration,
            catalogueRegistry,
            installedPlugins,
            showToast,
            t,
        ],
    );

    useEffect(() => {
        if (autoConnectAttempted) return;
        // Dedicated connection windows have their own URL-driven restore flow.
        if (windowLabel && windowLabel !== 'main') return;
        if (isSettingsLoading) return;
        if (connections.length === 0) return;
        if (settings.autoConnectLastConnection === false) return;
        autoConnectAttempted = true;
        void (async () => {
            try {
                const [openIds, activeId] = await Promise.all([
                    invoke<string[]>('get_last_open_connections'),
                    invoke<string | null>('get_last_active_connection'),
                ]);
                const toRestore = (openIds ?? []).filter(
                    (id) => connections.some((c) => c.id === id) && !isConnectionOpen(id),
                );
                if (toRestore.length === 0) return;
                await restoreSession({
                    connectionIds: toRestore,
                    activeId,
                    connect,
                    onForegroundStart: setConnectingId,
                    onForegroundReady: () => {
                        setConnectingId(null);
                        navigate('/editor');
                    },
                    onError: (id, error) =>
                        console.error(`Auto-connect to connection ${id} failed:`, error),
                });
            } catch (e) {
                console.error('Auto-connect to last connections failed:', e);
            } finally {
                setConnectingId(null);
            }
        })();
    }, [
        connections,
        settings.autoConnectLastConnection,
        isSettingsLoading,
        isConnectionOpen,
        connect,
        navigate,
    ]);

    // Initialize collapsed groups from saved state
    useEffect(() => {
        const collapsed = new Set(connectionGroups.filter((g) => g.collapsed).map((g) => g.id));
        setCollapsedGroups(collapsed);
    }, [connectionGroups]);

    // Sort groups by sort_order
    const sortedGroups = useMemo(
        () => [...connectionGroups].sort((a, b) => a.sort_order - b.sort_order),
        [connectionGroups],
    );

    // parentId -> children, with null key for top-level groups
    const groupsByParent = useMemo(() => {
        const map = new Map<string | null, typeof connectionGroups>();
        for (const g of connectionGroups) {
            const key = g.parent_id ?? null;
            const arr = map.get(key) ?? [];
            arr.push(g);
            map.set(key, arr);
        }
        for (const [, arr] of map) {
            arr.sort((a, b) => a.sort_order - b.sort_order);
        }
        return map;
    }, [connectionGroups]);

    // Organize connections by group
    const {groupedConnections, ungroupedConnections} = useMemo(() => {
        const grouped: Record<string, SavedConnection[]> = {};
        const ungrouped: SavedConnection[] = [];

        for (const conn of connections) {
            if (conn.group_id) {
                if (!grouped[conn.group_id]) {
                    grouped[conn.group_id] = [];
                }
                grouped[conn.group_id].push(conn);
            } else {
                ungrouped.push(conn);
            }
        }

        // Unordered connections (new, duplicated) go after explicitly ordered ones
        const order = (c: SavedConnection) => c.sort_order ?? Number.MAX_SAFE_INTEGER;
        for (const groupId in grouped) {
            grouped[groupId].sort((a, b) => order(a) - order(b));
        }
        ungrouped.sort((a, b) => order(a) - order(b));

        return {groupedConnections: grouped, ungroupedConnections: ungrouped};
    }, [connections]);

    // Group management functions
    const handleCreateGroup = async (parentId?: string | null) => {
        if (!newGroupName.trim()) return;
        try {
            // `/` separates nested levels: "TEST/flexways" creates `flexways`
            // inside the existing `TEST` group, or both if TEST doesn't exist.
            await createGroupPath(newGroupName.trim(), parentId ?? null);
            setNewGroupName('');
            setIsCreatingGroup(false);
            await loadConnections();
        } catch (e) {
            console.error('Failed to create group:', e);
            setError(t('groups.createError'));
        }
    };

    const handleCreateSubgroup = async (parentGroupId: string) => {
        const name = window.prompt(
            t('groups.subgroupNamePrompt', {
                defaultValue: 'Subfolder name (use / for nested levels)',
            }),
        );
        if (!name || !name.trim()) return;
        try {
            await createGroupPath(name.trim(), parentGroupId);
            await loadConnections();
        } catch (e) {
            console.error('Failed to create subgroup:', e);
            setError(t('groups.createError'));
        }
    };

    const startInlineSubgroupInput = (parentGroupId: string) => {
        setSubgroupInputFor(parentGroupId);
        setSubgroupInputValue('');
    };

    const cancelInlineSubgroupInput = () => {
        setSubgroupInputFor(null);
        setSubgroupInputValue('');
    };

    const confirmInlineSubgroupInput = async () => {
        if (!subgroupInputFor) return;
        const name = subgroupInputValue.trim();
        if (!name) {
            cancelInlineSubgroupInput();
            return;
        }
        try {
            await createGroupPath(name, subgroupInputFor);
            cancelInlineSubgroupInput();
            await loadConnections();
        } catch (e) {
            console.error('Failed to create subgroup:', e);
            setError(t('groups.createError'));
        }
    };

    const handleToggleGroupCollapsed = async (groupId: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
        await toggleGroupCollapsed(groupId);
    };

    const handleExport = async (mode: ExportMode, password?: string) => {
        try {
            const payload = await invoke('export_connections_payload', {
                includeSecrets: mode !== 'noSecrets',
                connectionIds:
                    exportSelectionOnly && selectedIds.size > 0 ? [...selectedIds] : null,
            });
            const fileContent =
                mode === 'encrypted'
                    ? await invoke('encrypt_export_payload', {payload, password})
                    : payload;
            const path = await save({
                defaultPath: 'tabularis-connections.json',
                filters: [{name: 'JSON', extensions: ['json']}],
            });
            if (path) {
                await writeTextFile(path, JSON.stringify(fileContent, null, 2));
            }
        } catch (e) {
            console.error('Export failed:', e);
            setError(toErrorMessage(e));
        }
    };

    const handleRenameGroup = async (groupId: string) => {
        if (!editGroupName.trim()) return;
        try {
            await updateGroup(groupId, {name: editGroupName.trim()});
            setEditingGroupId(null);
            await loadConnections();
        } catch (e) {
            console.error('Failed to rename group:', e);
            setError(
                t('groups.renameError', {defaultValue: 'Failed to rename group'}) +
                    `: ${toErrorMessage(e)}`,
            );
        }
    };

    const handleDeleteGroup = (groupId: string) => {
        const group = connectionGroups.find((g) => g.id === groupId);
        setConfirmModal({
            title: t('groups.deleteTitle'),
            message: t('groups.deleteConfirm', {name: group?.name}),
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    await deleteGroup(groupId);
                    await loadConnections();
                } catch (e) {
                    console.error('Failed to delete group:', e);
                    setError(
                        t('groups.deleteError', {defaultValue: 'Failed to delete group'}) +
                            `: ${toErrorMessage(e)}`,
                    );
                }
            },
        });
    };

    const nextSortOrderIn = (groupId: string | null) => {
        const siblings = groupId ? (groupedConnections[groupId] ?? []) : ungroupedConnections;
        return Math.max(-1, ...siblings.map((c) => c.sort_order ?? -1)) + 1;
    };

    const handleMoveToGroup = async (connectionId: string, groupId: string | null) => {
        try {
            await moveConnectionToGroup(connectionId, groupId, nextSortOrderIn(groupId));
            await loadConnections();
        } catch (e) {
            console.error('Failed to move connection:', e);
            setError(
                t('groups.moveError', {defaultValue: 'Failed to move connection'}) +
                    `: ${toErrorMessage(e)}`,
            );
        }
    };

    const handleDropOnConnection = async (
        connId: string,
        drop: {id: string; position: ConnectionDropPosition},
    ) => {
        const source = connections.find((c) => c.id === connId);
        const target = connections.find((c) => c.id === drop.id);
        if (!source || !target) return;
        const targetGroupId = target.group_id ?? null;
        const siblings = targetGroupId
            ? (groupedConnections[targetGroupId] ?? [])
            : ungroupedConnections;
        const orders = connectionOrderAfterMove(
            siblings.map((c) => c.id),
            connId,
            drop.id,
            drop.position,
        );
        if (!orders) return;
        try {
            if ((source.group_id ?? null) !== targetGroupId) {
                const slot = orders.find(([id]) => id === connId)?.[1];
                await moveConnectionToGroup(connId, targetGroupId, slot);
            }
            await reorderConnectionsInGroup(orders);
        } catch (e) {
            console.error('Failed to reorder connections:', e);
            setError(
                t('groups.moveError', {defaultValue: 'Failed to move connection'}) +
                    `: ${toErrorMessage(e)}`,
            );
        }
    };

    // ── Multi-select bulk actions ────────────────────────────────────────────
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());
    useEscapeKey(selectedIds.size > 0, clearSelection);

    const handleBulkDelete = () => {
        const ids = [...selectedIds];
        if (ids.length === 0) return;
        setConfirmModal({
            title: t('connections.deleteSelectedTitle'),
            message: t('connections.confirmDeleteSelected', {count: ids.length}),
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    for (const id of ids) {
                        if (isConnectionOpenAnywhere(id)) await disconnect(id);
                        await invoke('delete_connection', {id});
                    }
                } catch (e) {
                    console.error(e);
                    setError(`${t('connections.failDelete')}\n\nError: ${toErrorMessage(e)}`);
                } finally {
                    clearSelection();
                    void loadConnections();
                }
            },
        });
    };

    const handleBulkMoveToGroup = async (groupId: string | null) => {
        const ids = [...selectedIds];
        if (ids.length === 0) return;
        try {
            let sortOrder = nextSortOrderIn(groupId);
            for (const id of ids) {
                await moveConnectionToGroup(id, groupId, sortOrder++);
            }
            await loadConnections();
        } catch (e) {
            console.error('Failed to move connections:', e);
            setError(
                t('groups.moveError', {defaultValue: 'Failed to move connection'}) +
                    `: ${toErrorMessage(e)}`,
            );
        } finally {
            clearSelection();
        }
    };

    useEffect(() => {
        if ((location.state as {openNew?: boolean} | null)?.openNew) {
            setEditingConnection(null);
            setIsModalOpen(true);
        }
    }, [location.state]);

    const handleSave = () => {
        void loadConnections();
        setIsModalOpen(false);
        setEditingConnection(null);
    };

    const handleConnect = async (conn: SavedConnection) => {
        setError(null);
        if (isConnectionOpen(conn.id)) {
            switchConnection(conn.id);
            navigate('/editor');
            return;
        }
        // Open in another window: focus that window instead of opening a duplicate.
        if (isConnectionOpenAnywhere(conn.id)) {
            await openConnectionInNewWindow(conn.id, conn.name);
            return;
        }
        setConnectingId(conn.id);
        try {
            await connect(conn.id);
            navigate('/editor');
        } catch (e) {
            setError(
                `${t('connections.failConnect', {name: conn.name})}\n\nError: ${toErrorMessage(e)}`,
            );
        } finally {
            setConnectingId(null);
        }
    };

    const handleCreateSqliteDatabase = async () => {
        setError(null);
        try {
            const connection = await createSqliteDatabase();
            if (!connection) return;

            await loadConnections();
            await handleConnect(connection);
        } catch (e) {
            setError(`${t('connections.newSqliteDatabase.error')}\n\nError: ${toErrorMessage(e)}`);
        }
    };

    const handleOpenInNewWindow = async (conn: SavedConnection) => {
        setError(null);
        setConnectingId(conn.id);
        try {
            // Validates connectivity before the window is spawned; only opens on success.
            await openConnectionInNewWindow(conn.id, conn.name);
        } catch (e) {
            setError(
                `${t('connections.failConnect', {name: conn.name})}\n\nError: ${toErrorMessage(e)}`,
            );
        } finally {
            setConnectingId(null);
        }
    };

    const handleDisconnect = async (connId: string) => {
        setError(null);
        try {
            await disconnect(connId);
        } catch (e) {
            setError(`${t('connections.failDisconnect')}\n\nError: ${toErrorMessage(e)}`);
        }
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            title: t('connections.deleteTitle'),
            message: t('connections.confirmDelete'),
            onConfirm: async () => {
                setConfirmModal(null);
                try {
                    if (isConnectionOpenAnywhere(id)) await disconnect(id);
                    await invoke('delete_connection', {id});
                    void loadConnections();
                } catch (e) {
                    console.error(e);
                    setError(`${t('connections.failDelete')}\n\nError: ${toErrorMessage(e)}`);
                }
            },
        });
    };

    // Bidirectional built-in <-> plugin migration confirm. A connection-URI
    // connection gets an extra warning: the driver flip drops the stored URI
    // (by design), so re-entering it after switching is the tradeoff being
    // confirmed, not a surprise discovered after the fact.
    const handleMigrate = (conn: SavedConnection, direction: 'to-plugin' | 'to-builtin') => {
        const isUriBased = conn.params.connection_uri_in_keychain === true;
        if (direction === 'to-plugin') {
            setConfirmModal({
                title: t('migration.confirm.title'),
                message: isUriBased
                    ? t('migration.confirm.uriMessage', {name: conn.name})
                    : t('migration.confirm.message', {name: conn.name}),
                confirmLabel: isUriBased
                    ? t('migration.confirm.confirmLabelUri')
                    : t('migration.confirm.confirmLabel'),
                variant: isUriBased ? 'warning' : 'info',
                onConfirm: () => {
                    setConfirmModal(null);
                    void migration.migrateConnection(conn.id).then(showMigrationOutcomeToast);
                },
            });
        } else {
            setConfirmModal({
                title: t('migration.confirm.undoTitle'),
                message: t('migration.confirm.undoMessage', {name: conn.name}),
                confirmLabel: t('migration.confirm.undoConfirmLabel'),
                variant: 'info',
                onConfirm: () => {
                    setConfirmModal(null);
                    void migration.undoMigration(conn.id).then((result) => {
                        if (!result.ok) {
                            showToast(
                                t('migration.toast.undoFailed', {
                                    name: conn.name,
                                    error: result.error ?? 'unknown error',
                                }),
                                {kind: 'error', duration: 0},
                            );
                        }
                    });
                },
            });
        }
    };

    const openEdit = async (conn: SavedConnection) => {
        if (isConnectionOpenAnywhere(conn.id)) {
            await disconnect(conn.id);
        }
        setEditingConnection(conn);
        setIsModalOpen(true);
    };

    const handleDuplicate = async (id: string) => {
        try {
            const newConn = await invoke<SavedConnection>('duplicate_connection', {
                id,
            });
            await loadConnections();
            void openEdit(newConn);
        } catch (e) {
            console.error(e);
            setError(t('connections.failDuplicate'));
        }
    };

    // Filter grouped/ungrouped based on search. Tag names take part in the
    // match so typing a tag (e.g. "prod") narrows the list to tagged connections.
    const searchTarget = useMemo(() => {
        const tagNameById = new Map(tags.map((t) => [t.id, t.name]));
        return (c: SavedConnection) =>
            `${c.name} ${c.params.driver} ${(c.tag_ids ?? [])
                .map((id) => tagNameById.get(id) ?? '')
                .join(' ')}`;
    }, [tags]);

    const filteredGroupedConnections = useMemo(() => {
        if (!search.trim()) return groupedConnections;
        const result: Record<string, SavedConnection[]> = {};
        for (const groupId in groupedConnections) {
            const filteredConns = fuzzyFilter(groupedConnections[groupId], search, searchTarget);
            if (filteredConns.length > 0) {
                result[groupId] = filteredConns;
            }
        }
        return result;
    }, [groupedConnections, search, searchTarget]);

    const filteredUngroupedConnections = useMemo(() => {
        return fuzzyFilter(ungroupedConnections, search, searchTarget);
    }, [ungroupedConnections, search, searchTarget]);
    // Connections the current search shows, for "Select all".
    const visibleConnectionIds = [
        ...Object.values(filteredGroupedConnections).flat(),
        ...filteredUngroupedConnections,
    ].map((c) => c.id);
    const hasNoSearchResults =
        !!search.trim() &&
        filteredUngroupedConnections.length === 0 &&
        Object.keys(filteredGroupedConnections).length === 0;

    const openCount = connections.filter((c) => isConnectionOpenAnywhere(c.id)).length;
    // Connections open in THIS window — gates the "Open in New Window" action,
    // which detaches an open connection from the current window.
    const hasLocalOpenConnections = connections.some((c) => isConnectionOpen(c.id));

    // ── Shared helpers for connection card/item rendering ────────────────────────
    const handleConnContextMenu = (e: React.MouseEvent, conn: SavedConnection) => {
        e.preventDefault();
        setConnectionContextMenu({x: e.clientX, y: e.clientY, connId: conn.id});
    };

    const connectionMenuItems = (conn: SavedConnection): MenuEntry[] => {
        const currentGroupId = conn.group_id;
        // Flatten the group tree in DFS order so the menu mirrors the
        // nested sidebar structure. The group the connection already
        // lives in is skipped, but its descendants remain valid targets.
        const groupTree = flattenGroupTree(connectionGroups).filter(
            ({group}) => group.id !== currentGroupId,
        );
        const isDriverEnabled = drivers.some((d) => d.id === conn.params.driver);
        const migration = migrationDirectionForDriver(conn.params.driver, allDrivers);
        return [
            {
                label: t('connections.open'),
                icon: Play,
                disabled: !isDriverEnabled,
                onSelect: () => void handleConnect(conn),
            },
            {
                label: t('sidebar.openInNewWindow'),
                icon: AppWindowMac,
                disabled: !hasLocalOpenConnections,
                onSelect: () => void handleOpenInNewWindow(conn),
            },
            'separator',
            {
                label: t('connections.edit'),
                icon: Pencil,
                disabled: !isDriverEnabled,
                onSelect: () => void openEdit(conn),
            },
            {
                label: t('connections.duplicate'),
                icon: Copy,
                disabled: !isDriverEnabled,
                onSelect: () => void handleDuplicate(conn.id),
            },
            ...(groupTree.length > 0
                ? [
                      {
                          label: t('groups.moveToGroup'),
                          icon: FolderSymlink,
                          submenu: groupTree.map(({group, depth}) => ({
                              label: group.name,
                              icon: Folder,
                              indent: depth,
                              onSelect: () => void handleMoveToGroup(conn.id, group.id),
                          })),
                      },
                  ]
                : []),
            ...(currentGroupId
                ? [
                      {
                          label: t('groups.removeFromGroup'),
                          icon: FolderMinus,
                          onSelect: () => void handleMoveToGroup(conn.id, null),
                      },
                  ]
                : []),
            // Built-in driver deprecation window only.
            ...(migration
                ? [
                      {
                          label:
                              migration === 'to-plugin'
                                  ? t('migration.switchToPlugin')
                                  : t('migration.switchToBuiltin'),
                          icon: ArrowLeftRight,
                          onSelect: () => handleMigrate(conn, migration),
                      },
                  ]
                : []),
            ...(isConnectionOpenAnywhere(conn.id)
                ? [
                      'separator' as const,
                      {
                          label: t('connections.disconnect'),
                          icon: Power,
                          onSelect: () => void handleDisconnect(conn.id),
                      },
                  ]
                : []),
            'separator',
            {
                label: t('connections.delete'),
                icon: Trash2,
                danger: true,
                onSelect: () => void handleDelete(conn.id),
            },
        ];
    };

    const connCardProps = (conn: SavedConnection) => ({
        conn,
        connectingId,
        allDrivers,
        enabledDrivers: drivers,
        tags,
        onConnect: () => handleConnect(conn),
        onEdit: () => void openEdit(conn),
        menuItems: () => connectionMenuItems(conn),
        onContextMenu: (e: React.MouseEvent<HTMLDivElement>) => handleConnContextMenu(e, conn),
        onMouseDown: (e: React.MouseEvent<HTMLDivElement>) =>
            handleConnectionMouseDown(e, conn.id, conn.group_id),
        selected: selectedIds.has(conn.id),
        dropPosition: connectionDrop?.id === conn.id ? connectionDrop.position : null,
        dropAxis: connectionDrop?.axis ?? 'y',
        onToggleSelect: () => toggleSelect(conn.id),
    });

    const handleConnectionMouseDown = (
        e: React.MouseEvent,
        connId: string,
        currentGroupId: string | undefined,
    ) => {
        if (e.button !== 0) return;
        const startX = e.clientX;
        const startY = e.clientY;
        const source = e.currentTarget as HTMLElement;
        let isDragging = false;
        let ghost: DragGhost | null = null;

        const connectionDropAt = (
            el: Element | null,
            x: number,
            y: number,
        ): {id: string; position: ConnectionDropPosition; axis: 'x' | 'y'} | null => {
            const connEl = (el as HTMLElement)?.closest(
                '[data-connection-id]',
            ) as HTMLElement | null;
            const id = connEl?.dataset.connectionId;
            if (!connEl || !id || id === connId) return null;
            // Side by side only when the grid really has several columns (it collapses to one on narrow windows)
            const columns = connEl.parentElement
                ? getComputedStyle(connEl.parentElement).gridTemplateColumns
                : '';
            const axis =
                columns && columns !== 'none' && columns.trim().split(/\s+/).length > 1 ? 'x' : 'y';
            return {
                id,
                position: connectionDropZone(connEl.getBoundingClientRect(), x, y, axis),
                axis,
            };
        };

        const onMouseMove = (ev: MouseEvent) => {
            if (!isDragging) {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;
                if (dx * dx + dy * dy < 25) return;
                isDragging = true;
                ghost = createDragGhost(source, startX, startY);
                // Only a grouped connection can go back to "Ungrouped".
                if (currentGroupId) setIsDraggingGroupedConnection(true);
            }
            ghost?.move(ev.clientX, ev.clientY);
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const drop = connectionDropAt(el, ev.clientX, ev.clientY);
            setConnectionDrop((prev) =>
                prev?.id === drop?.id &&
                prev?.position === drop?.position &&
                prev?.axis === drop?.axis
                    ? prev
                    : drop,
            );
            const groupEl = (el as HTMLElement)?.closest('[data-group-id]') as HTMLElement | null;
            setDragOverGroupId(drop ? null : (groupEl?.dataset.groupId ?? null));
        };

        const onMouseUp = (ev: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            ghost?.remove();
            setDragOverGroupId(null);
            setConnectionDrop(null);
            setIsDraggingGroupedConnection(false);
            if (!isDragging) return;
            const el = document.elementFromPoint(ev.clientX, ev.clientY);
            const drop = connectionDropAt(el, ev.clientX, ev.clientY);
            if (drop) {
                void handleDropOnConnection(connId, drop);
                return;
            }
            const groupEl = (el as HTMLElement)?.closest('[data-group-id]') as HTMLElement | null;
            const targetGroupId = groupEl?.dataset.groupId ?? null;
            if (targetGroupId === UNGROUPED_DROP_ID) {
                if (currentGroupId) void handleMoveToGroup(connId, null);
                return;
            }
            if (!targetGroupId || targetGroupId === currentGroupId) return;
            void handleMoveToGroup(connId, targetGroupId);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const groupDropAt = (
        x: number,
        y: number,
        sourceGroupId: string,
    ): {id: string; position: GroupDropPosition} | null => {
        const header = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest(
            '[data-group-header-id]',
        ) as HTMLElement | null;
        const id = header?.dataset.groupHeaderId;
        if (!header || !id || id === sourceGroupId) return null;
        // "After" an expanded folder with content would land below its whole subtree, far from the marker
        const hasVisibleContent =
            !collapsedGroups.has(id) &&
            ((groupsByParent.get(id)?.length ?? 0) > 0 ||
                (groupedConnections[id]?.length ?? 0) > 0);
        return {
            id,
            position: groupDropZone(header.getBoundingClientRect(), y, !hasVisibleContent),
        };
    };

    const handleGripMouseDown = (e: React.MouseEvent, sourceGroupId: string) => {
        e.preventDefault();

        const onMouseMove = (ev: MouseEvent) => {
            const next = groupDropAt(ev.clientX, ev.clientY, sourceGroupId);
            setGroupDrop((prev) =>
                prev?.id === next?.id && prev?.position === next?.position ? prev : next,
            );
        };

        const onMouseUp = (ev: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            const drop = groupDropAt(ev.clientX, ev.clientY, sourceGroupId);
            setGroupDrop(null);
            if (!drop) return;

            const plan = planGroupDrop(connectionGroups, sourceGroupId, drop.id, drop.position);
            if (!plan) return;
            if (plan === 'cycle') {
                setError(
                    t('groups.cannotMoveIntoDescendant', {
                        defaultValue: 'Cannot move a group into one of its own subfolders',
                    }),
                );
                return;
            }
            const source = connectionGroups.find((g) => g.id === sourceGroupId);
            void (async () => {
                if ((source?.parent_id ?? null) !== plan.parentId) {
                    await moveGroupToParent(sourceGroupId, plan.parentId);
                }
                await reorderGroups(plan.order);
            })().catch((err) => {
                console.error('Failed to move group:', err);
                setError(String(err));
            });
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const groupMenuItems = (groupId: string): MenuEntry[] => [
        {
            label: t('groups.addSubgroup'),
            icon: FolderPlus,
            onSelect: () => void handleCreateSubgroup(groupId),
        },
        {
            label: t('groups.rename'),
            icon: Pencil,
            onSelect: () => {
                const group = connectionGroups.find((g) => g.id === groupId);
                if (group) {
                    setEditGroupName(group.name);
                    setEditingGroupId(groupId);
                }
            },
        },
        'separator',
        {
            label: t('groups.delete'),
            icon: Trash2,
            danger: true,
            onSelect: () => void handleDeleteGroup(groupId),
        },
    ];

    const groupHeaderProps = (group: (typeof sortedGroups)[number]) => ({
        group,
        isCollapsed: collapsedGroups.has(group.id),
        editingGroupId,
        editGroupName,
        isRenameCancelledRef,
        onToggleCollapse: () => void handleToggleGroupCollapsed(group.id),
        onOpenContextMenu: (x: number, y: number, groupId: string) =>
            setGroupContextMenu({x, y, groupId}),
        setEditGroupName,
        setEditingGroupId,
        onRenameConfirm: handleRenameGroup,
        onGripMouseDown: (e: React.MouseEvent) => handleGripMouseDown(e, group.id),
        isDragOver: dragOverGroupId === group.id,
        dropPosition: groupDrop?.id === group.id ? groupDrop.position : null,
        onCreateSubgroup: startInlineSubgroupInput,
        menuItems: () => groupMenuItems(group.id),
    });

    const renderConnections = (conns: SavedConnection[], mode: 'grid' | 'list') =>
        mode === 'grid' ? (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                {conns.map((conn) => (
                    <ConnectionCard key={conn.id} {...connCardProps(conn)} />
                ))}
            </div>
        ) : (
            <div className="flex flex-col divide-y divide-default overflow-hidden rounded-lg border border-default">
                {conns.map((conn) => (
                    <ConnectionListItem key={conn.id} {...connCardProps(conn)} />
                ))}
            </div>
        );

    const renderGroupTree = (
        parentId: string | null,
        mode: 'grid' | 'list',
        depth: number = 0,
    ): React.ReactNode => {
        const children = groupsByParent.get(parentId) ?? [];
        if (children.length === 0) return null;
        return children.map((group) => {
            const groupConns = filteredGroupedConnections[group.id] || [];
            const isCollapsed = collapsedGroups.has(group.id);
            if (search.trim() && !hasAnyMatchingDescendant(group.id, search)) {
                return null;
            }
            const indentPx = Math.min(depth, 6) * 20;
            const connCount = countDescendantConnections(group.id);
            return (
                <div
                    key={group.id}
                    data-group-id={group.id}
                    data-group-depth={depth}
                    className="flex flex-col gap-1.5"
                >
                    <GroupHeader {...groupHeaderProps(group)} connCount={connCount} depth={depth} />
                    {subgroupInputFor === group.id && (
                        <div
                            className="flex items-center gap-2"
                            style={{paddingLeft: 24 + indentPx}}
                        >
                            <FolderPlus size={12} className="text-accent-warning shrink-0" />
                            <input
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                                spellCheck={false}
                                type="text"
                                value={subgroupInputValue}
                                onChange={(e) => setSubgroupInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void confirmInlineSubgroupInput();
                                    if (e.key === 'Escape') cancelInlineSubgroupInput();
                                }}
                                onBlur={() => {
                                    if (subgroupInputValue.trim()) {
                                        void confirmInlineSubgroupInput();
                                    } else {
                                        cancelInlineSubgroupInput();
                                    }
                                }}
                                placeholder="Subfolder name (use / for nested)"
                                autoFocus
                                className="flex-1 px-2 py-1 bg-elevated border border-strong rounded text-sm text-primary placeholder:text-muted focus:border-accent-warning/70 focus:outline-none"
                            />
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => void confirmInlineSubgroupInput()}
                                disabled={!subgroupInputValue.trim()}
                                className="p-1 rounded bg-accent-warning hover:bg-accent-warning/90 text-on-accent-warning disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={12} />
                            </button>
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={cancelInlineSubgroupInput}
                                className="p-1 rounded text-muted hover:text-primary hover:bg-surface-secondary transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                    {!isCollapsed &&
                        (groupConns.length > 0 ? (
                            <div style={{paddingLeft: indentPx}}>
                                {renderConnections(groupConns, mode)}
                            </div>
                        ) : (
                            !search.trim() &&
                            !groupsByParent.get(group.id)?.length && (
                                <div style={{paddingLeft: indentPx}}>
                                    <GroupDropZone isDragOver={dragOverGroupId === group.id} />
                                </div>
                            )
                        ))}
                    {!isCollapsed && renderGroupTree(group.id, mode, depth + 1)}
                </div>
            );
        });
    };

    const hasAnyMatchingDescendant = (rootGroupId: string, query: string): boolean => {
        const lc = query.toLowerCase();
        const stack: string[] = [rootGroupId];
        const visited = new Set<string>();
        while (stack.length > 0) {
            const id = stack.pop()!;
            if (visited.has(id)) continue;
            visited.add(id);
            const conns = filteredGroupedConnections[id] || [];
            if (conns.length > 0) return true;
            const g = connectionGroups.find((x) => x.id === id);
            if (g && g.name.toLowerCase().includes(lc)) return true;
            const kids = groupsByParent.get(id) ?? [];
            for (const kid of kids) stack.push(kid.id);
        }
        return false;
    };

    const countDescendantConnections = (groupId: string): number => {
        let total = 0;
        const stack: string[] = [groupId];
        const visited = new Set<string>();
        while (stack.length > 0) {
            const id = stack.pop()!;
            if (visited.has(id)) continue;
            visited.add(id);
            total += (filteredGroupedConnections[id] || []).length;
            const kids = groupsByParent.get(id) ?? [];
            for (const kid of kids) stack.push(kid.id);
        }
        return total;
    };

    return (
        <div className="relative h-full flex flex-col overflow-hidden bg-base">
            <div className="flex shrink-0 flex-col gap-6 px-6 pt-6">
                <ConnectionsHeader
                    connectionCount={connections.length}
                    openCount={openCount}
                    onAddConnection={() => {
                        setEditingConnection(null);
                        setIsModalOpen(true);
                    }}
                    onCreateSqlite={() => void handleCreateSqliteDatabase()}
                    isCreatingSqlite={isCreatingSqliteDatabase}
                    onImport={() => setIsImportAppModalOpen(true)}
                    onExport={() => {
                        setExportSelectionOnly(false);
                        setIsExportModalOpen(true);
                    }}
                />
                <div aria-hidden="true" className="h-px bg-default" />
            </div>

            {/* ── Error banner ──────────────────────────────────────────────────── */}
            {error && (
                <ConnectionErrorBanner key={error} message={error} onClose={() => setError(null)} />
            )}

            {/* ── Built-in → plugin migration banner ────────────────────────────── */}
            {migration.banner?.visible && (
                <PostgresPluginMigrationBanner
                    variant={migration.banner.variant}
                    removalDate={
                        allDrivers.find((d) => d.id === migration.builtinId)?.deprecated
                            ?.removal_date
                    }
                    onDismiss={migration.dismissBanner}
                    onReview={() => setIsMigrationChecklistOpen(true)}
                />
            )}

            {/* ── Content ───────────────────────────────────────────────────────── */}
            <div
                className={clsx(
                    'flex-1 overflow-y-auto p-6',
                    // Room for the floating selection bar over the last row.
                    selectedIds.size > 0 && 'pb-24',
                )}
            >
                {connections.length === 0 ? (
                    <ConnectionsEmptyState
                        onAddConnection={() => {
                            setEditingConnection(null);
                            setIsModalOpen(true);
                        }}
                        onImport={() => setIsImportAppModalOpen(true)}
                        onCreateSqlite={() => void handleCreateSqliteDatabase()}
                        isCreatingSqlite={isCreatingSqliteDatabase}
                    />
                ) : (
                    <>
                        <ConnectionsToolbar
                            search={search}
                            onSearchChange={setSearch}
                            newGroupName={isCreatingGroup ? newGroupName : null}
                            onNewGroupNameChange={(name) => {
                                setIsCreatingGroup(name !== null);
                                setNewGroupName(name ?? '');
                            }}
                            onCreateGroup={() => void handleCreateGroup()}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />
                        <div className="mt-6">
                            {hasNoSearchResults ? (
                                <ConnectionsNoResults
                                    query={search.trim()}
                                    onClearSearch={() => setSearch('')}
                                />
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {renderGroupTree(null, viewMode)}

                                    {(filteredUngroupedConnections.length > 0 ||
                                        isDraggingGroupedConnection) && (
                                        <div
                                            data-group-id={UNGROUPED_DROP_ID}
                                            className="flex flex-col gap-1.5"
                                        >
                                            {sortedGroups.length > 0 && (
                                                <UngroupedHeader
                                                    count={filteredUngroupedConnections.length}
                                                    isCollapsed={isUngroupedCollapsed}
                                                    onToggle={() =>
                                                        setIsUngroupedCollapsed((v) => !v)
                                                    }
                                                />
                                            )}
                                            {!(sortedGroups.length > 0 && isUngroupedCollapsed) &&
                                                (filteredUngroupedConnections.length > 0 ? (
                                                    renderConnections(
                                                        filteredUngroupedConnections,
                                                        viewMode,
                                                    )
                                                ) : (
                                                    <GroupDropZone
                                                        isDragOver={
                                                            dragOverGroupId === UNGROUPED_DROP_ID
                                                        }
                                                    />
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {selectedIds.size > 0 && (
                <ConnectionsSelectionBar
                    selectedCount={selectedIds.size}
                    onSelectAll={
                        visibleConnectionIds.every((id) => selectedIds.has(id))
                            ? undefined
                            : () => setSelectedIds(new Set(visibleConnectionIds))
                    }
                    moveTargets={() => [
                        {
                            label: t('groups.ungrouped'),
                            icon: FolderMinus,
                            onSelect: () => void handleBulkMoveToGroup(null),
                        },
                        ...(connectionGroups.length > 0 ? ['separator' as const] : []),
                        ...flattenGroupTree(connectionGroups).map(({group, depth}) => ({
                            label: group.name,
                            icon: Folder,
                            indent: depth,
                            onSelect: () => void handleBulkMoveToGroup(group.id),
                        })),
                    ]}
                    onExport={() => {
                        setExportSelectionOnly(true);
                        setIsExportModalOpen(true);
                    }}
                    onDelete={handleBulkDelete}
                    onClear={clearSelection}
                />
            )}

            <Suspense fallback={<LoadingState />}>
                {isModalOpen && (
                    <NewConnectionModal
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setEditingConnection(null);
                            // Tag renames/deletions apply immediately, even when the modal is
                            // cancelled, so re-fetch for the chips and the search filter.
                            void refreshTags();
                        }}
                        onSave={handleSave}
                        initialConnection={editingConnection}
                    />
                )}
                <ExportConnectionsModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    onExport={handleExport}
                    selectedCount={exportSelectionOnly ? selectedIds.size : 0}
                />
                {isImportAppModalOpen && (
                    <ImportFromAppModal
                        isOpen={isImportAppModalOpen}
                        onClose={() => setIsImportAppModalOpen(false)}
                        onImported={() => void loadConnections()}
                    />
                )}
                {isMigrationChecklistOpen && (
                    <MigrationChecklistModal
                        isOpen={isMigrationChecklistOpen}
                        onClose={() => setIsMigrationChecklistOpen(false)}
                        connections={migration.builtinConnections}
                        manifest={allDrivers.find((d) => d.id === migration.pluginId)}
                        repoUrl={resolvePluginRepoUrl(
                            migration.pluginId,
                            catalogueRegistry.find((p) => p.id === migration.pluginId)?.repo_url,
                        )}
                        pluginVersion={
                            installedPlugins.find((p) => p.id === migration.pluginId)?.version ??
                            catalogueRegistry.find((p) => p.id === migration.pluginId)
                                ?.installed_version ??
                            'unknown'
                        }
                        migrateConnection={migration.migrateConnection}
                    />
                )}
            </Suspense>
            <ConfirmModal
                isOpen={confirmModal !== null}
                onClose={() => setConfirmModal(null)}
                title={confirmModal?.title ?? ''}
                message={confirmModal?.message ?? ''}
                confirmLabel={confirmModal?.confirmLabel}
                confirmClassName={confirmModal?.confirmClassName}
                variant={confirmModal?.variant}
                onConfirm={() => {
                    confirmModal?.onConfirm();
                    setConfirmModal(null);
                }}
            />

            {/* Group right-click menu (the header's "…" button opens the same entries) */}
            {groupContextMenu && (
                <Menu
                    x={groupContextMenu.x}
                    y={groupContextMenu.y}
                    items={groupMenuItems(groupContextMenu.groupId)}
                    onClose={() => setGroupContextMenu(null)}
                />
            )}

            {/* Connection right-click menu (the card's "…" button opens the same entries) */}
            {connectionContextMenu &&
                (() => {
                    const conn = connections.find((c) => c.id === connectionContextMenu.connId);
                    if (!conn) return null;
                    return (
                        <Menu
                            x={connectionContextMenu.x}
                            y={connectionContextMenu.y}
                            items={connectionMenuItems(conn)}
                            onClose={() => setConnectionContextMenu(null)}
                        />
                    );
                })()}

            {/* Bulk "move selected to group" menu */}
        </div>
    );
};
