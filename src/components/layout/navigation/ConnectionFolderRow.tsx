import type {ReactNode} from 'react';
import clsx from 'clsx';
import {ChevronRight, Folder, FolderOpen} from 'lucide-react';
import {Badge} from '@/components/ui/Badge';
import {rowStateClass} from './rowState';
import {TREE_GUTTER, TreeElbow} from './TreeElbow';
import {FOCUS_RING, FOCUS_RING_INSET} from '@/components/ui/focusRing';

interface ConnectionFolderRowProps {
    name: string;
    /** Full folder path, used as the accessible name. */
    path: string;
    count: number;
    isCollapsed: boolean;
    /** The connection of the current editor view is inside: highlighted while collapsed. */
    hasActiveConnection: boolean;
    onToggle: () => void;
    variant: 'expanded' | 'rail';
    isLast?: boolean;
    children: ReactNode;
}

/** Connection group folder ("group sidebar connections by folder" setting). */
export function ConnectionFolderRow({
    name,
    path,
    count,
    isCollapsed,
    hasActiveConnection,
    onToggle,
    variant,
    isLast = false,
    children,
}: ConnectionFolderRowProps) {
    const isMarked = isCollapsed && hasActiveConnection;
    const FolderIcon = isCollapsed ? Folder : FolderOpen;

    if (variant === 'rail') {
        return (
            <div className="flex flex-col items-center gap-0.5">
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={!isCollapsed}
                    aria-label={path}
                    title={path}
                    className={clsx(
                        'relative flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors',
                        FOCUS_RING,
                        rowStateClass({isCurrent: isMarked}),
                        isMarked && 'text-primary',
                    )}
                >
                    <FolderIcon size={16} />
                    <Badge className="absolute -bottom-0.5 -right-0.5">{count}</Badge>
                </button>
                {!isCollapsed && (
                    <div className="flex flex-col items-center gap-0.5">{children}</div>
                )}
            </div>
        );
    }

    return (
        <div className="relative">
            {/* The branch line runs past the whole folder unless it is the last child. */}
            {!isLast && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 top-0 border-l border-strong"
                    style={{left: 9}}
                />
            )}
            <div className="relative" style={{paddingLeft: TREE_GUTTER}}>
                <TreeElbow isLast />
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={!isCollapsed}
                    aria-label={path}
                    title={path}
                    className={clsx(
                        'flex h-9 w-full items-center gap-2 rounded-md pl-1.5 pr-3 text-left text-sm font-medium transition-colors',
                        FOCUS_RING_INSET,
                        rowStateClass({isCurrent: isMarked}),
                        isMarked ? 'text-primary' : 'text-secondary hover:text-primary',
                    )}
                >
                    <FolderIcon size={16} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{name}</span>
                    <Badge>{count}</Badge>
                    <ChevronRight
                        size={14}
                        className={clsx(
                            'shrink-0 text-muted transition-transform',
                            !isCollapsed && 'rotate-90',
                        )}
                    />
                </button>
            </div>
            {!isCollapsed && <div className="mt-1.5 flex flex-col gap-1.5">{children}</div>}
        </div>
    );
}
