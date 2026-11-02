import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Check, FolderPlus, LayoutGrid, List, X} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {IconButton} from '@/components/ui/IconButton';
import {SearchBar} from '@/components/ui/SearchBar';
import {SegmentedControl} from '@/components/ui/SegmentedControl';

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

                <SegmentedControl
                    ariaLabel={t('connections.viewMode')}
                    value={viewMode}
                    onChange={onViewModeChange}
                    options={[
                        {value: 'grid', icon: LayoutGrid, ariaLabel: t('connections.gridView')},
                        {value: 'list', icon: List, ariaLabel: t('connections.listView')},
                    ]}
                />
            </div>
        </div>
    );
}
