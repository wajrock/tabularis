import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type ReactNode,
    type Ref,
} from 'react';
import {createPortal} from 'react-dom';
import {useEscapeKey} from '@/hooks/useEscapeKey';

export interface PopoverTriggerProps {
    ref: Ref<HTMLButtonElement>;
    onClick: () => void;
    'aria-haspopup': 'dialog';
    'aria-expanded': boolean;
    'aria-controls': string | undefined;
}

interface PopoverProps {
    /** Renders the button that opens the panel; spread the given props on it. */
    trigger: (props: PopoverTriggerProps, isOpen: boolean) => ReactNode;
    /** Accessible name of the panel. */
    label: string;
    children: ReactNode;
}

const GAP = 4;
const EDGE = 8;

/**
 * Floating panel opened from a button, styled like the menus: 4 px under the
 * button (above it near the bottom of the window); Escape and outside clicks close it.
 */
export function Popover({trigger, label, children}: PopoverProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<{top: number; left: number} | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const panelId = useId();

    const close = useCallback((restoreFocus: boolean) => {
        setIsOpen(false);
        setPosition(null);
        if (restoreFocus) triggerRef.current?.focus();
    }, []);

    useLayoutEffect(() => {
        if (!isOpen || !triggerRef.current || !panelRef.current) return;
        const anchor = triggerRef.current.getBoundingClientRect();
        const {width, height} = panelRef.current.getBoundingClientRect();
        const below = anchor.bottom + GAP;
        const top = below + height > window.innerHeight - EDGE ? anchor.top - GAP - height : below;
        setPosition({
            top: Math.max(EDGE, top),
            left: Math.max(EDGE, Math.min(anchor.left, window.innerWidth - width - EDGE)),
        });
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onPointerDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
            close(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [isOpen, close]);

    // Joins the Escape stack: closes the panel, not the modal it is in.
    const closeFromKeyboard = useCallback(() => close(true), [close]);
    useEscapeKey(isOpen, closeFromKeyboard);

    return (
        <>
            {trigger(
                {
                    ref: triggerRef,
                    onClick: () => (isOpen ? close(false) : setIsOpen(true)),
                    'aria-haspopup': 'dialog',
                    'aria-expanded': isOpen,
                    'aria-controls': isOpen ? panelId : undefined,
                },
                isOpen,
            )}
            {isOpen &&
                createPortal(
                    <div
                        ref={panelRef}
                        id={panelId}
                        role="dialog"
                        aria-label={label}
                        style={position ?? {top: 0, left: 0, visibility: 'hidden'}}
                        className="fixed z-[201] rounded-lg border border-default bg-base p-3 shadow-menu"
                    >
                        {children}
                    </div>,
                    document.body,
                )}
        </>
    );
}
