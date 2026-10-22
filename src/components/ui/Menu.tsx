import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ElementType,
    type KeyboardEvent,
    type ReactNode,
    type RefObject,
} from 'react';
import {createPortal} from 'react-dom';
import clsx from 'clsx';
import {ChevronRight} from 'lucide-react';

export interface MenuItem {
    label: string;
    icon?: ElementType;
    onSelect?: () => void;
    disabled?: boolean;
    danger?: boolean;
    /** Extra content at the end of the row, e.g. a badge. */
    trailing?: ReactNode;
    /** Opens a submenu to the side instead of running an action. */
    submenu?: MenuEntry[];
    /** Nesting depth in tree-like submenus (group folders). */
    indent?: number;
}

export type MenuEntry = MenuItem | 'separator';

interface MenuProps {
    /** Viewport point the menu hangs from. */
    x: number;
    y: number;
    /** `end`: `x` is the menu's right edge (menus opened from a button on the right). */
    align?: 'start' | 'end';
    /** Bottom edge used when there is no room below `y` (a button's top); defaults to `y`. */
    yAbove?: number;
    items: MenuEntry[];
    /** `restoreFocus` is true when the user closed it from the keyboard. */
    onClose: (restoreFocus: boolean) => void;
    id?: string;
    /** Set on submenus: ArrowLeft closes them. */
    isSubmenu?: boolean;
    /** The button that opened the menu: pressing it toggles instead of closing then reopening. */
    anchorRef?: RefObject<HTMLElement | null>;
}

const EDGE = 8;
const ROWS = '[role="menuitem"]:not(:disabled)';

/** Floating menu at a point: arrow keys, Escape, outside clicks and submenus. */
export function Menu({
    x,
    y,
    align = 'start',
    yAbove,
    items,
    onClose,
    id,
    isSubmenu = false,
    anchorRef,
}: MenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{top: number; left: number} | null>(null);
    const [openSubmenu, setOpenSubmenu] = useState<{index: number; rect: DOMRect} | null>(null);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const {width, height} = el.getBoundingClientRect();
        const left = align === 'end' ? x - width : x;
        // Flip above the point when there is no room below.
        const top =
            y + height > window.innerHeight - EDGE ? Math.max(EDGE, (yAbove ?? y) - height) : y;
        setPosition({
            top,
            left: Math.max(EDGE, Math.min(left, window.innerWidth - width - EDGE)),
        });
        // Focus the menu, not a row: nothing is highlighted until the user moves.
        el.focus();
    }, [x, y, yAbove, align]);

    useEffect(() => {
        const onPointerDown = (e: MouseEvent) => {
            const target = e.target as Element;
            if (anchorRef?.current?.contains(target)) return;
            if (!target.closest?.('[data-menu]')) onClose(false);
        };
        const onViewportChange = () => onClose(false);
        document.addEventListener('mousedown', onPointerDown);
        window.addEventListener('resize', onViewportChange);
        window.addEventListener('blur', onViewportChange);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('blur', onViewportChange);
        };
    }, [onClose, anchorRef]);

    const rows = () => Array.from(ref.current?.querySelectorAll<HTMLButtonElement>(ROWS) ?? []);
    const focusRow = (index: number) => {
        const list = rows();
        if (list.length) list[(index + list.length) % list.length].focus();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        // Keys pressed inside an open submenu are handled by the submenu.
        if (!ref.current?.contains(e.target as Node)) return;
        const list = rows();
        const current = list.indexOf(document.activeElement as HTMLButtonElement);
        if (e.key === 'ArrowDown') focusRow(current + 1);
        else if (e.key === 'ArrowUp') focusRow(current === -1 ? list.length - 1 : current - 1);
        else if (e.key === 'Home') focusRow(0);
        else if (e.key === 'End') focusRow(list.length - 1);
        else if (e.key === 'Escape' || (e.key === 'ArrowLeft' && isSubmenu)) onClose(true);
        else if (e.key === 'Tab') onClose(false);
        else if (e.key === 'ArrowRight' && current !== -1) list[current].click();
        else return;
        e.preventDefault();
        e.stopPropagation();
    };

    const submenuEntry =
        openSubmenu && items[openSubmenu.index] !== 'separator'
            ? (items[openSubmenu.index] as MenuItem)
            : null;

    return createPortal(
        <>
            <div
                ref={ref}
                id={id}
                data-menu
                role="menu"
                tabIndex={-1}
                onKeyDown={onKeyDown}
                style={position ?? {top: y, left: x, visibility: 'hidden'}}
                className="fixed z-[201] flex w-max min-w-[200px] max-w-[320px] flex-col rounded-lg border border-default bg-base p-1.5 shadow-menu focus:outline-none"
            >
                {items.map((entry, index) =>
                    entry === 'separator' ? (
                        <div
                            key={`separator-${index}`}
                            role="separator"
                            className="my-1 h-px shrink-0 bg-default"
                        />
                    ) : (
                        <button
                            key={`${entry.label}-${index}`}
                            type="button"
                            role="menuitem"
                            disabled={entry.disabled}
                            aria-haspopup={entry.submenu ? 'menu' : undefined}
                            aria-expanded={entry.submenu ? openSubmenu?.index === index : undefined}
                            onMouseEnter={(e) => {
                                if (entry.submenu && !entry.disabled) {
                                    setOpenSubmenu({
                                        index,
                                        rect: e.currentTarget.getBoundingClientRect(),
                                    });
                                } else {
                                    setOpenSubmenu(null);
                                }
                            }}
                            onClick={(e) => {
                                if (entry.submenu) {
                                    setOpenSubmenu({
                                        index,
                                        rect: e.currentTarget.getBoundingClientRect(),
                                    });
                                    return;
                                }
                                onClose(false);
                                entry.onSelect?.();
                            }}
                            style={entry.indent ? {paddingLeft: 10 + entry.indent * 16} : undefined}
                            className={clsx(
                                'flex w-full shrink-0 items-center gap-2.5 rounded-md p-2.5 text-left text-sm leading-4 transition-colors',
                                'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                                entry.danger
                                    ? 'text-tint-danger-fg hover:bg-tint-danger-bg focus:bg-tint-danger-bg'
                                    : 'text-primary hover:bg-surface-hover focus:bg-surface-hover',
                                openSubmenu?.index === index && 'bg-surface-hover',
                            )}
                        >
                            {entry.icon && (
                                <entry.icon
                                    size={16}
                                    className={clsx('shrink-0', !entry.danger && 'text-secondary')}
                                />
                            )}
                            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                            {entry.trailing}
                            {entry.submenu && (
                                <ChevronRight size={14} className="shrink-0 text-secondary" />
                            )}
                        </button>
                    ),
                )}
            </div>
            {submenuEntry?.submenu && openSubmenu && (
                <Menu
                    isSubmenu
                    x={openSubmenu.rect.right + 4}
                    y={openSubmenu.rect.top - 7}
                    items={submenuEntry.submenu}
                    onClose={(restoreFocus) => {
                        if (restoreFocus) {
                            // Escape in the submenu goes back to its parent row.
                            setOpenSubmenu(null);
                            focusRow(
                                rows().findIndex((row) => row.textContent === submenuEntry.label),
                            );
                        } else {
                            onClose(false);
                        }
                    }}
                />
            )}
        </>,
        document.body,
    );
}
