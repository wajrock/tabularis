import {
    useCallback,
    useId,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactNode,
    type Ref,
} from 'react';
import {Menu, type MenuEntry} from './Menu';

export interface DropdownTriggerProps {
    ref: Ref<HTMLButtonElement>;
    onClick: () => void;
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
    'aria-haspopup': 'menu';
    'aria-expanded': boolean;
    'aria-controls': string | undefined;
}

interface DropdownMenuProps {
    /** Renders the button that opens the menu; spread the given props on it. */
    trigger: (props: DropdownTriggerProps, isOpen: boolean) => ReactNode;
    /** Entries, or a function building them when the menu opens. */
    items: MenuEntry[] | (() => MenuEntry[]);
    /** Edge of the trigger the menu lines up with. */
    align?: 'start' | 'end';
}

const GAP = 4;

/** Menu opened from a button, 4 px under it (or above it near the bottom of the window). */
export function DropdownMenu({trigger, items, align = 'end'}: DropdownMenuProps) {
    const [anchor, setAnchor] = useState<{x: number; y: number; yAbove: number} | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuId = useId();

    const open = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) {
            setAnchor({
                x: align === 'end' ? rect.right : rect.left,
                y: rect.bottom + GAP,
                yAbove: rect.top - GAP,
            });
        }
    };
    const close = useCallback((restoreFocus: boolean) => {
        setAnchor(null);
        if (restoreFocus) triggerRef.current?.focus();
    }, []);

    return (
        <>
            {trigger(
                {
                    ref: triggerRef,
                    onClick: () => (anchor ? close(false) : open()),
                    onKeyDown: (e) => {
                        if (e.key === 'ArrowDown' && !anchor) {
                            e.preventDefault();
                            open();
                        }
                    },
                    'aria-haspopup': 'menu',
                    'aria-expanded': !!anchor,
                    'aria-controls': anchor ? menuId : undefined,
                },
                !!anchor,
            )}
            {anchor && (
                <Menu
                    id={menuId}
                    x={anchor.x}
                    y={anchor.y}
                    yAbove={anchor.yAbove}
                    align={align}
                    items={typeof items === 'function' ? items() : items}
                    onClose={close}
                    anchorRef={triggerRef}
                />
            )}
        </>
    );
}
