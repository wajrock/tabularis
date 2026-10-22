import {useMemo} from 'react';
import {useKeybindings} from '@/hooks/useKeybindings';
import {compactShortcutLabel, formatShortcut} from '@/utils/keybindings';

/** Compact label of a shortcut ("⌘⇧N", "Ctrl⇧N"), following the user's overrides. */
export function useShortcutLabel(shortcutId: string): string | undefined {
    const {shortcuts, overrides, isMac} = useKeybindings();
    return useMemo(() => {
        const def = shortcuts.find((shortcut) => shortcut.id === shortcutId);
        return def ? compactShortcutLabel(formatShortcut(def, overrides, isMac)) : undefined;
    }, [shortcuts, overrides, isMac, shortcutId]);
}
