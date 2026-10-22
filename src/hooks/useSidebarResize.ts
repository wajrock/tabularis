import {useState, useRef, useEffect, useCallback} from 'react';

const MIN_WIDTH = 150;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 256;
const COLLAPSE_THRESHOLD = 100;
const STORAGE_KEY = 'tabularis_sidebar_width';

/** Width of the narrow navigation rail, the explorer's default left edge. */
const DEFAULT_LEFT_OFFSET = 64;

/** @param getLeftOffset returns the explorer's left edge in viewport pixels. */
export const useSidebarResize = (
    onCollapse?: () => void,
    getLeftOffset: () => number = () => DEFAULT_LEFT_OFFSET,
) => {
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    });
    const isDragging = useRef(false);
    const onCollapseRef = useRef(onCollapse);

    const getLeftOffsetRef = useRef(getLeftOffset);

    useEffect(() => {
        onCollapseRef.current = onCollapse;
        getLeftOffsetRef.current = getLeftOffset;
    }, [onCollapse, getLeftOffset]);

    const startResize = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = 'col-resize';

        const handleResize = (e: MouseEvent) => {
            if (!isDragging.current) return;
            const newWidth = e.clientX - getLeftOffsetRef.current();

            if (newWidth < COLLAPSE_THRESHOLD && onCollapseRef.current) {
                isDragging.current = false;
                document.body.style.cursor = 'default';
                document.removeEventListener('mousemove', handleResize);
                document.removeEventListener('mouseup', stopResize);
                onCollapseRef.current();
                return;
            }

            if (newWidth > MIN_WIDTH && newWidth < MAX_WIDTH) {
                setSidebarWidth(newWidth);
            }
        };

        const stopResize = () => {
            isDragging.current = false;
            document.body.style.cursor = 'default';
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
        };

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, sidebarWidth.toString());
    }, [sidebarWidth]);

    return {sidebarWidth, startResize};
};
