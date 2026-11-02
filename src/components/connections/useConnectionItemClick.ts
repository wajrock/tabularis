import {useRef, type MouseEvent} from 'react';

interface Options {
    /** Opens the connection; called on a plain click. */
    connect: () => void;
    /** Toggles the selection; called on Cmd/Ctrl + click. */
    onToggleSelect?: () => void;
    /** The item's own mousedown handler (drag to reorder). */
    onMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
}

/** Past this distance (px) the press was a drag, not a click. */
const DRAG_THRESHOLD = 5;

/**
 * Click handling of a connection card or row: one click opens it, Cmd/Ctrl + click
 * selects it. Ignored after a drag and for clicks bubbling from a menu rendered in
 * a portal (the "…" menu), which React still routes through the item.
 */
export function useConnectionItemClick({connect, onToggleSelect, onMouseDown}: Options) {
    const pressAt = useRef<{x: number; y: number} | null>(null);

    return {
        onMouseDown: (e: MouseEvent<HTMLDivElement>) => {
            pressAt.current = {x: e.clientX, y: e.clientY};
            onMouseDown?.(e);
        },
        onClick: (e: MouseEvent<HTMLDivElement>) => {
            if ((e.metaKey || e.ctrlKey) && onToggleSelect) {
                e.preventDefault();
                onToggleSelect();
                return;
            }
            if (!e.currentTarget.contains(e.target as Node)) return;
            const start = pressAt.current;
            pressAt.current = null;
            if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD)
                return;
            connect();
        },
    };
}
