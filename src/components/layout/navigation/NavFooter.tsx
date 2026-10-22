import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Github, Settings} from 'lucide-react';
import {openUrl} from '@tauri-apps/plugin-opener';
import {DiscordIcon} from '@/components/icons/DiscordIcon';
import {IconButton} from '@/components/ui/IconButton';
import {SlotAnchor} from '@/components/ui/SlotAnchor';
import {DISCORD_URL, GITHUB_URL} from '@/config/links';
import {useDatabase} from '@/hooks/useDatabase';
import {useUpdate} from '@/hooks/useUpdate';
import {APP_VERSION} from '@/version';
import {DiscordCommunityCallout} from './DiscordCommunityCallout';
import {NavItem} from './NavItem';
import {FOCUS_RING} from '@/components/ui/focusRing';

interface NavFooterProps {
    variant: 'expanded' | 'rail';
    onOpenWhatsNew: () => void;
}

export function NavFooter({variant, onOpenWhatsNew}: NavFooterProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {availableUpdate} = useUpdate();
    const {activeConnectionId, activeDriver} = useDatabase();
    const latestVersion = availableUpdate?.hasUpdate ? availableUpdate.latestVersion : null;

    const discord = (
        <div className="relative">
            <IconButton
                label={t('sidebar.discord')}
                size={variant === 'rail' ? 'lg' : 'sm'}
                onClick={() => void openUrl(DISCORD_URL)}
            >
                <DiscordIcon size={variant === 'rail' ? 16 : 14} />
            </IconButton>
            <DiscordCommunityCallout />
        </div>
    );
    const pluginActions = (
        <SlotAnchor
            name="sidebar.footer.actions"
            context={{connectionId: activeConnectionId, driver: activeDriver}}
            className={clsx('flex gap-1', variant === 'rail' ? 'flex-col items-center' : 'px-3')}
        />
    );

    if (variant === 'rail') {
        return (
            <div className="flex flex-col items-center gap-1 border-t border-default pt-2">
                <NavItem
                    to="/settings"
                    icon={Settings}
                    label={t('sidebar.settings')}
                    variant="rail"
                />
                {discord}
                {pluginActions}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 border-t border-default pt-3">
            <NavItem
                to="/settings"
                icon={Settings}
                label={t('sidebar.settings')}
                variant="expanded"
            />
            {pluginActions}
            <div className="flex h-4 items-center gap-1 px-3">
                {latestVersion ? (
                    <button
                        type="button"
                        onClick={() => navigate('/settings?tab=info')}
                        className={clsx(
                            'truncate rounded-md bg-tint-accent-bg px-1.5 py-0.5 text-xs font-medium text-tint-accent-fg',
                            FOCUS_RING,
                        )}
                    >
                        {t('sidebar.updateAvailable', {version: latestVersion})}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onOpenWhatsNew}
                        className={clsx(
                            'group/whatsnew truncate rounded-md text-xs font-medium text-secondary',
                            FOCUS_RING,
                        )}
                    >
                        <span className="text-muted">v{APP_VERSION} ·</span>{' '}
                        <span className="transition-colors group-hover/whatsnew:text-primary">
                            {t('sidebar.whatsNew')}
                        </span>
                    </button>
                )}
                <div className="-my-1.5 -mr-1.5 ml-auto flex items-center">
                    {discord}
                    <IconButton
                        label={t('sidebar.github')}
                        onClick={() => void openUrl(GITHUB_URL)}
                    >
                        <Github size={14} />
                    </IconButton>
                </div>
            </div>
        </div>
    );
}
