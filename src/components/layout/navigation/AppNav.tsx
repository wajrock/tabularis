import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Cpu, Puzzle, Shield} from 'lucide-react';
import {Badge} from '@/components/ui/Badge';
import {WhatsNewModal} from '@/components/modals/WhatsNewModal';
import {useAvailableUpdates} from '@/hooks/useAvailableUpdates';
import {usePendingApprovals} from '@/hooks/useAiActivity';
import {useChangelog} from '@/hooks/useChangelog';
import {useOpenConnections} from '@/hooks/useOpenConnections';
import {useShortcutHints} from '@/hooks/useShortcutHints';
import {useSidebarMode} from '@/hooks/useSidebarMode';
import {ConnectionsNav} from './ConnectionsNav';
import {NavFooter} from './NavFooter';
import {NavHeader} from './NavHeader';
import {NavItem} from './NavItem';

function SectionTitle({children}: {children: string}) {
    return (
        <h2 className="mb-0.5 pb-1 pl-3 pt-4 text-[10px] font-semibold uppercase leading-3 tracking-[0.6px] text-muted first:pt-2">
            {children}
        </h2>
    );
}

function RailSeparator() {
    return <div aria-hidden="true" className="mx-auto my-1 h-px w-8 bg-default" />;
}

/** The app's left navigation: expanded (240 px) or rail (64 px), as the user chose. */
export function AppNav() {
    const {t} = useTranslation();
    const updates = useAvailableUpdates();
    const {pending} = usePendingApprovals();
    const model = useOpenConnections();
    const showShortcutHints = useShortcutHints();
    const {isCollapsed, toggle} = useSidebarMode();
    const variant = isCollapsed ? 'rail' : 'expanded';

    const [isConnectionListOpen, setIsConnectionListOpen] = useState(true);
    const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
    const {entries: changelogEntries, isLoading: isChangelogLoading} = useChangelog(isWhatsNewOpen);

    const pluginBadge =
        updates.pluginCount > 0 ? (
            <Badge tone="accent" aria-label={updates.pluginsTooltip}>
                {updates.pluginCount}
            </Badge>
        ) : undefined;
    const approvalsLabel = t('sidebar.pendingApprovals', {count: pending.length});
    const approvalsBadge =
        pending.length > 0 ? (
            <Badge tone="warning" aria-label={approvalsLabel}>
                {pending.length}
            </Badge>
        ) : undefined;

    return (
        <aside
            className={clsx(
                'flex h-full min-h-0 shrink-0 flex-col border-r border-default bg-elevated px-3 py-4',
                isCollapsed ? 'w-16' : 'w-60',
            )}
        >
            <NavHeader variant={variant} onToggle={toggle} />

            <div aria-hidden="true" className="my-4 h-px shrink-0 bg-default" />

            <nav
                aria-label={t('sidebar.navigation')}
                className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden pb-4"
            >
                {!isCollapsed && <SectionTitle>{t('sidebar.sections.databases')}</SectionTitle>}
                <ConnectionsNav
                    model={model}
                    variant={variant}
                    isListOpen={isConnectionListOpen}
                    onToggleList={() => setIsConnectionListOpen((open) => !open)}
                    showShortcutHints={showShortcutHints}
                />
                <NavItem
                    to="/plugins"
                    icon={Puzzle}
                    label={t('sidebar.plugins')}
                    variant={variant}
                    badge={pluginBadge}
                    description={updates.pluginCount > 0 ? updates.pluginsTooltip : undefined}
                />

                {isCollapsed ? (
                    <RailSeparator />
                ) : (
                    <SectionTitle>{t('sidebar.sections.ai')}</SectionTitle>
                )}
                <NavItem to="/mcp" icon={Cpu} label={t('sidebar.mcpServer')} variant={variant} />
                <NavItem
                    to="/ai-activity"
                    icon={Shield}
                    label={t('sidebar.aiActivity')}
                    variant={variant}
                    badge={approvalsBadge}
                    description={pending.length > 0 ? approvalsLabel : undefined}
                />
            </nav>

            <NavFooter variant={variant} onOpenWhatsNew={() => setIsWhatsNewOpen(true)} />

            <WhatsNewModal
                isOpen={isWhatsNewOpen}
                onClose={() => setIsWhatsNewOpen(false)}
                entries={changelogEntries}
                isLoading={isChangelogLoading}
            />
        </aside>
    );
}
