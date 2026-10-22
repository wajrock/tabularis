import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Check, FolderPlus, LayoutGrid, List, X} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {IconButton} from '@/components/ui/IconButton';
import {SearchBar} from '@/components/ui/SearchBar';
import {FOCUS_RING_INSET} from '@/components/ui/focusRing';

export type ConnectionsViewMode = 'grid' | 'list';

interface ConnectionsToolbarProps {
    search: string;
    onSearchChange: (value: string) => void;
    /** The new group name while the inline field is open, null otherwise. */
    newGroupName: string | null;
    onNewGroupNameChange: (value: string | null) => void;
    onCreateGroup: () => void;
    viewMode: ConnectionsViewMode;
    onViewModeChange: (mode: ConnectionsViewMode) => void;
}

const fieldClass =
    'flex h-9 items-center gap-2 rounded-md border border-strong bg-base px-3.5 focus-within:border-focus';
const inputClass =
    'min-w-0 flex-1 bg-transparent text-sm font-medium text-primary placeholder:text-muted focus:outline-none';
const noAutofix = {
    autoCorrect: 'off',
    autoCapitalize: 'off',
    autoComplete: 'off',
    spellCheck: false,
} as const;

export function ConnectionsToolbar({
    search,
    onSearchChange,
    newGroupName,
    onNewGroupNameChange,
    onCreateGroup,
    viewMode,
    onViewModeChange,
}: ConnectionsToolbarProps) {
    const {t} = useTranslation();
    const views = [
        {mode: 'grid' as const, icon: LayoutGrid, label: t('connections.gridView')},
        {mode: 'list' as const, icon: List, label: t('connections.listView')},
    ];

    return (
        <div className="flex items-center justify-between gap-3">
            <SearchBar
                value={search}
                onChange={onSearchChange}
                placeholder={t('connections.searchPlaceholder')}
                className="w-full max-w-[430px]"
            />

            <div className="flex shrink-0 items-center gap-3">
                {newGroupName === null ? (
                    <Button
                        variant="outline"
                        icon={<FolderPlus size={16} className="text-secondary" />}
                        onClick={() => onNewGroupNameChange('')}
                    >
                        {t('groups.newGroup')}
                    </Button>
                ) : (
                    <div className="flex items-center gap-1">
                        <div className={clsx(fieldClass, 'w-56')}>
                            <FolderPlus size={16} className="shrink-0 text-muted" />
                            <input
                                {...noAutofix}
                                type="text"
                                value={newGroupName}
                                onChange={(e) => onNewGroupNameChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onCreateGroup();
                                    if (e.key === 'Escape') onNewGroupNameChange(null);
                                }}
                                placeholder={t('groups.groupName', {
                                    defaultValue: 'Group name (use / for nested)',
                                })}
                                aria-label={t('groups.newGroup')}
                                autoFocus
                                className={inputClass}
                            />
                        </div>
                        <IconButton
                            label={t('groups.newGroup')}
                            size="lg"
                            onClick={onCreateGroup}
                            disabled={!newGroupName.trim()}
                        >
                            <Check size={16} />
                        </IconButton>
                        <IconButton
                            label={t('common.cancel')}
                            size="lg"
                            onClick={() => onNewGroupNameChange(null)}
                        >
                            <X size={16} />
                        </IconButton>
                    </div>
                )}

                <div
                    role="group"
                    aria-label={t('connections.viewMode')}
                    className="flex h-9 gap-1 rounded-md bg-surface-primary p-[3px]"
                >
                    {views.map(({mode, icon: Icon, label}) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => onViewModeChange(mode)}
                            aria-pressed={viewMode === mode}
                            aria-label={label}
                            title={label}
                            className={clsx(
                                'flex w-[34px] items-center justify-center rounded-md transition-colors',
                                FOCUS_RING_INSET,
                                viewMode === mode
                                    ? 'bg-base text-primary shadow-card'
                                    : 'text-secondary hover:text-primary',
                            )}
                        >
                            <Icon size={16} />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
