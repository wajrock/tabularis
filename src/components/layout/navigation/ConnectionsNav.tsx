import {useTranslation} from 'react-i18next';
import {useLocation} from 'react-router-dom';
import clsx from 'clsx';
import {ChevronDown, Unplug} from 'lucide-react';
import type {ConnectionStatus} from '@/hooks/useConnectionManager';
import {useConnectionLayoutContext} from '@/hooks/useConnectionLayoutContext';
import {Badge} from '@/components/ui/Badge';
import {IconButton} from '@/components/ui/IconButton';
import type {OpenConnectionsModel} from '@/hooks/useOpenConnections';
import {ConnectionFolderRow} from './ConnectionFolderRow';
import {OpenConnectionRow} from './OpenConnectionRow';
import {NavItem} from './NavItem';
import {SplitGroupRow} from './SplitGroupRow';

interface ConnectionsNavProps {
    model: OpenConnectionsModel;
    variant: 'expanded' | 'rail';
    isListOpen: boolean;
    onToggleList: () => void;
    showShortcutHints: boolean;
}

/** Folder children are indented so their branch hangs just left of the folder icon. */
const FOLDER_INDENT = 18;

export function ConnectionsNav({
    model,
    variant,
    isListOpen,
    onToggleList,
    showShortcutHints,
}: ConnectionsNavProps) {
    const {t} = useTranslation();
    const {pathname} = useLocation();
    const {splitView} = useConnectionLayoutContext();
    const {openConnections, splitConnections, sortedConnections, folders, drag, actions} = model;
    const count = openConnections.length;
    const showList = count > 0 && (variant === 'rail' || isListOpen);

    const renderConnection = (conn: ConnectionStatus, isLast: boolean, indent = 0) => (
        <OpenConnectionRow
            key={conn.id}
            connection={conn}
            variant={variant}
            isLast={isLast}
            indent={indent}
            shortcutIndex={model.shortcutIndex.get(conn.id)}
            showShortcutHint={showShortcutHints}
            dropIndicator={drag.dropTarget?.id === conn.id ? drag.dropTarget.position : null}
            onSwitch={() => actions.switchTo(conn.id)}
            onOpenInEditor={() => actions.openInEditor(conn.id)}
            onOpenInWindow={() => actions.openInWindow(conn.id)}
            onDisconnect={() => void actions.disconnect(conn.id)}
            onDragStart={(e) => drag.startDrag(conn, e)}
            itemRef={drag.registerItem(conn.id)}
        />
    );

    const visibleFolders =
        folders?.folders.filter(
            (folder) => !folder.ancestorIds.some((id) => model.collapsedFolders.has(id)),
        ) ?? [];
    const ungrouped = folders ? folders.ungrouped : sortedConnections;
    const childCount = (splitView ? 1 : 0) + visibleFolders.length + ungrouped.length;
    let position = 0;
    const nextIsLast = () => ++position === childCount;

    return (
        // The only part of the navigation that shrinks: many connections scroll here, not the whole nav.
        <div className="flex min-h-0 flex-col gap-1.5">
            <NavItem
                to="/connections"
                icon={Unplug}
                label={t('sidebar.connections')}
                variant={variant}
                badge={count > 0 && variant === 'expanded' ? <Badge>{count}</Badge> : undefined}
                showTrailing={!isListOpen}
                trailing={
                    count > 0 && variant === 'expanded' ? (
                        <IconButton
                            label={
                                isListOpen
                                    ? t('sidebar.hideOpenConnections')
                                    : t('sidebar.showOpenConnections')
                            }
                            aria-expanded={isListOpen}
                            onClick={onToggleList}
                        >
                            <ChevronDown
                                size={16}
                                className={clsx(
                                    'transition-transform',
                                    !isListOpen && '-rotate-90',
                                )}
                            />
                        </IconButton>
                    ) : undefined
                }
            />

            {showList && (
                <div
                    className={clsx(
                        'flex min-h-0 flex-col overflow-y-auto overflow-x-hidden',
                        // The padding keeps the first tree elbow, which rises 6 px, inside the scroll area.
                        variant === 'expanded' && '-mt-1.5 gap-1.5 pt-1.5',
                        // On the rail, a framed group shows the connections belong to the item above.
                        variant === 'rail' &&
                            '-mt-0.5 items-center gap-0.5 rounded-lg border border-default py-1',
                    )}
                >
                    {splitView && (
                        <SplitGroupRow
                            ref={drag.groupRef}
                            connections={splitConnections}
                            mode={splitView.mode}
                            variant={variant}
                            isLast={nextIsLast()}
                            isDropTarget={drag.isGroupDropTarget}
                        />
                    )}
                    {visibleFolders.map((folder) => (
                        <ConnectionFolderRow
                            key={folder.group.id}
                            name={folder.group.name}
                            path={folder.path}
                            count={folder.connections.length}
                            isCollapsed={model.collapsedFolders.has(folder.group.id)}
                            hasActiveConnection={
                                pathname === '/editor' && folder.connections.some((c) => c.isActive)
                            }
                            onToggle={() => model.toggleFolder(folder.group.id)}
                            variant={variant}
                            isLast={nextIsLast()}
                        >
                            {folder.connections.map((conn, i) =>
                                renderConnection(
                                    conn,
                                    i === folder.connections.length - 1,
                                    FOLDER_INDENT,
                                ),
                            )}
                        </ConnectionFolderRow>
                    ))}
                    {ungrouped.map((conn) => renderConnection(conn, nextIsLast()))}
                </div>
            )}
        </div>
    );
}
