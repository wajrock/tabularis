import type {RefObject} from 'react';
import {useTranslation} from 'react-i18next';
import {ChevronDown, Folder, FolderOpen, GripVertical, Plus} from 'lucide-react';
import clsx from 'clsx';
import type {ConnectionGroup} from '@/contexts/DatabaseContext';
import type {GroupDropPosition} from '@/utils/connections';
import {onActivationKey} from '@/utils/keyboardEvents';
import {ActionsMenu} from '@/components/ui/ActionsMenu';
import {IconButton} from '@/components/ui/IconButton';
import type {MenuEntry} from '@/components/ui/Menu';
import {FOCUS_RING} from '@/components/ui/focusRing';

export interface GroupHeaderProps {
    group: ConnectionGroup;
    connCount: number;
    isCollapsed: boolean;
    editingGroupId: string | null;
    editGroupName: string;
    isRenameCancelledRef: RefObject<boolean>;
    onToggleCollapse: () => void;
    onOpenContextMenu: (x: number, y: number, groupId: string) => void;
    setEditGroupName: (name: string) => void;
    setEditingGroupId: (id: string | null) => void;
    onRenameConfirm: (groupId: string) => void;
    onGripMouseDown?: (e: React.MouseEvent) => void;
    isDragOver?: boolean;
    dropPosition?: GroupDropPosition | null;
    onCreateSubgroup?: (groupId: string) => void;
    /** Entries of the "…" menu (the same as the right-click menu). */
    menuItems: () => MenuEntry[];
    depth?: number;
}

export const GroupHeader = ({
    group,
    connCount,
    isCollapsed,
    editingGroupId,
    editGroupName,
    isRenameCancelledRef,
    onToggleCollapse,
    onOpenContextMenu,
    setEditGroupName,
    setEditingGroupId,
    onRenameConfirm,
    onGripMouseDown,
    isDragOver,
    dropPosition = null,
    onCreateSubgroup,
    menuItems,
    depth = 0,
}: GroupHeaderProps) => {
    const {t} = useTranslation();
    return (
        <div
            role="button"
            tabIndex={0}
            aria-expanded={!isCollapsed}
            className={clsx(
                'group relative flex h-9 cursor-pointer items-center gap-2 rounded-md pr-2.5',
                FOCUS_RING,
                isDragOver && 'bg-accent-primary/5 ring-1 ring-accent-primary',
                dropPosition === 'inside' && 'bg-accent-primary/10 ring-2 ring-accent-primary',
            )}
            data-group-header-id={group.id}
            style={{marginLeft: depth > 0 ? Math.min(depth, 6) * 20 : 0}}
            onClick={(e) => {
                // Clicks on the drag grip start a drag, they must not toggle the group.
                if ((e.target as HTMLElement).closest('[data-group-grip]')) return;
                onToggleCollapse();
            }}
            onKeyDown={onActivationKey(onToggleCollapse)}
            onContextMenu={(e) => {
                e.preventDefault();
                onOpenContextMenu(e.clientX, e.clientY, group.id);
            }}
        >
            {(dropPosition === 'before' || dropPosition === 'after') && (
                <div
                    data-testid={`group-drop-${dropPosition}`}
                    className={clsx(
                        'pointer-events-none absolute left-0 right-0 h-0.5 rounded-full bg-accent-primary',
                        dropPosition === 'before' ? '-top-1.5' : '-bottom-1.5',
                    )}
                />
            )}
            {onGripMouseDown && (
                <div
                    data-group-grip
                    aria-hidden="true"
                    onMouseDown={onGripMouseDown}
                    className="absolute -left-4 cursor-grab select-none text-muted opacity-0 hover:text-secondary group-hover:opacity-100"
                >
                    <GripVertical size={12} />
                </div>
            )}
            <ChevronDown
                size={14}
                className={clsx(
                    'shrink-0 text-secondary transition-transform',
                    isCollapsed && '-rotate-90',
                )}
            />
            {isCollapsed ? (
                <Folder size={16} className="shrink-0 text-secondary" />
            ) : (
                <FolderOpen size={16} className="shrink-0 text-secondary" />
            )}
            {editingGroupId === group.id ? (
                <input
                    autoCorrect="off"
                    autoCapitalize="off"
                    autoComplete="off"
                    spellCheck={false}
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    onBlur={() => {
                        if (!isRenameCancelledRef.current) onRenameConfirm(group.id);
                        isRenameCancelledRef.current = false;
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onRenameConfirm(group.id);
                        if (e.key === 'Escape') {
                            isRenameCancelledRef.current = true;
                            setEditingGroupId(null);
                        }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                    className="h-7 rounded-md border border-strong bg-base px-2 text-sm font-semibold text-primary focus:border-focus focus:outline-none"
                />
            ) : (
                <span className="text-sm font-semibold text-primary">{group.name}</span>
            )}
            <span className="text-sm font-semibold text-muted">{connCount}</span>
            <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
                {onCreateSubgroup && (
                    <IconButton
                        label={t('groups.addSubgroup')}
                        onClick={(e) => {
                            e.stopPropagation();
                            onCreateSubgroup(group.id);
                        }}
                    >
                        <Plus size={14} />
                    </IconButton>
                )}
                <ActionsMenu items={menuItems} />
            </div>
        </div>
    );
};
