import {useNavigate} from 'react-router-dom';
import {PluginsTab} from '@/components/settings/PluginsTab';
import {useDrivers} from '@/hooks/useDrivers';

/** Plugin center, a top-level page since the sidebar redesign (was a Settings tab). */
export const PluginsPage = () => {
    const navigate = useNavigate();
    const {refresh: refreshDrivers} = useDrivers();

    return (
        <div className="h-full overflow-auto bg-base">
            <div className="mx-auto max-w-5xl p-8">
                <PluginsTab
                    onOpenPluginSettings={(pluginId) =>
                        navigate(`/settings?tab=plugin:${pluginId}`)
                    }
                    onPluginsChanged={() => refreshDrivers()}
                />
            </div>
        </div>
    );
};
