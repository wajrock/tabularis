import {useCallback, useState} from 'react';

const COLLAPSED_STORAGE_KEY = 'tabularis:sidebar-collapsed';

function readCollapsed(): boolean {
    try {
        return localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

/** Open (240 px) or collapsed (64 px rail) navigation; the choice is remembered. */
export function useSidebarMode() {
    const [isCollapsed, setIsCollapsed] = useState(readCollapsed);

    const toggle = useCallback(() => {
        const next = !isCollapsed;
        setIsCollapsed(next);
        try {
            localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next));
        } catch {
            // Private mode or blocked storage: the choice only lasts for this session.
        }
    }, [isCollapsed]);

    return {isCollapsed, toggle};
}
