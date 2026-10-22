import {useEffect, useState} from 'react';
import {useKeybindings} from '@/hooks/useKeybindings';

/** True while Cmd/Ctrl+Shift is held, to reveal the connection shortcut numbers. */
export function useShortcutHints(): boolean {
    const {isMac} = useKeybindings();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const modifierHeld = isMac ? e.metaKey || e.ctrlKey : e.ctrlKey;
            if (modifierHeld && e.shiftKey) setVisible(true);
        };
        const hide = () => setVisible(false);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', hide);
        window.addEventListener('blur', hide);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', hide);
            window.removeEventListener('blur', hide);
        };
    }, [isMac]);

    return visible;
}
