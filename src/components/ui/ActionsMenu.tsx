import type {SyntheticEvent} from 'react';
import {useTranslation} from 'react-i18next';
import {Ellipsis} from 'lucide-react';
import {DropdownMenu} from './DropdownMenu';
import {IconButton} from './IconButton';
import type {MenuEntry} from './Menu';

interface ActionsMenuProps {
    /** Entries, built when the menu opens. */
    items: () => MenuEntry[];
    /** Accessible name; defaults to "More actions". */
    label?: string;
    className?: string;
}

const stop = (e: SyntheticEvent) => e.stopPropagation();

/**
 * "…" button opening an actions menu 4 px under it, aligned on its right edge.
 * Pointer events stay on the button, so a card or row around it neither starts
 * a drag nor activates.
 */
export function ActionsMenu({items, label, className}: ActionsMenuProps) {
    const {t} = useTranslation();
    const name = label ?? t('common.moreActions');
    return (
        <DropdownMenu
            items={items}
            trigger={(props) => (
                <IconButton
                    {...props}
                    label={name}
                    className={className}
                    onMouseDown={stop}
                    onDoubleClick={stop}
                    onClick={(e) => {
                        e.stopPropagation();
                        props.onClick();
                    }}
                >
                    <Ellipsis size={14} />
                </IconButton>
            )}
        />
    );
}
