import type {SyntheticEvent} from 'react';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Pencil} from 'lucide-react';
import {ActionsMenu} from '@/components/ui/ActionsMenu';
import {IconButton} from '@/components/ui/IconButton';
import type {MenuEntry} from '@/components/ui/Menu';

interface ConnectionActionsProps {
    canEdit: boolean;
    onEdit: () => void;
    /** Entries of the "…" menu (the same as the right-click menu). */
    menuItems: () => MenuEntry[];
    className?: string;
}

const stop = (e: SyntheticEvent) => e.stopPropagation();

/** Edit and "…" buttons of a connection card or row, shown on hover or focus. */
export function ConnectionActions({canEdit, onEdit, menuItems, className}: ConnectionActionsProps) {
    const {t} = useTranslation();
    return (
        <div
            className={clsx(
                'flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100',
                // Keep the buttons visible while the menu is open.
                'has-[[aria-expanded=true]]:opacity-100',
                className,
            )}
        >
            <IconButton
                label={t('connections.edit')}
                disabled={!canEdit}
                onMouseDown={stop}
                onDoubleClick={stop}
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                }}
            >
                <Pencil size={14} />
            </IconButton>
            <ActionsMenu items={menuItems} />
        </div>
    );
}
