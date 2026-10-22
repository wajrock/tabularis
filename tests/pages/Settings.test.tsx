import {StrictMode} from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useSearchParams} from 'react-router-dom';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createInstance} from 'i18next';
import en from '@/i18n/locales/en.json';
import itLocale from '@/i18n/locales/it.json';
import {Settings} from '@/pages/Settings';
import {PluginsPage} from '@/pages/PluginsPage';
import {AiActivityPage} from '@/pages/AiActivityPage';
import {PluginUpdateToast} from '@/components/plugins/PluginUpdateToast';
import {ToastProvider} from '@/contexts/ToastProvider';
import {usePluginRegistry} from '@/hooks/usePluginRegistry';
import {useUpdate} from '@/hooks/useUpdate';
import type {RegistryPluginWithStatus} from '@/types/plugins';

const i18n = createInstance();
await i18n.init({
    lng: 'it',
    fallbackLng: 'en',
    resources: {en: {translation: en}, it: {translation: itLocale}},
});
vi.mock('react-i18next', () => ({
    useTranslation: () => ({t: i18n.t.bind(i18n)}),
}));
vi.mock('lucide-react', async () => await vi.importActual('lucide-react'));
vi.mock('@/hooks/usePluginRegistry', () => ({
    usePluginRegistry: vi.fn(),
}));
vi.mock('@/hooks/useUpdate', () => ({useUpdate: vi.fn()}));
vi.mock('@/hooks/useSettings', () => ({
    useSettings: () => ({settings: {}, isLoading: false, updateSetting: vi.fn()}),
}));
vi.mock('@/hooks/useDrivers', () => ({
    useDrivers: () => ({
        allDrivers: [
            {
                id: 'mysql',
                name: 'MySQL',
                is_builtin: true,
                settings: [{key: 'pool'}],
            },
        ],
        installedPlugins: [],
        refresh: vi.fn(),
    }),
}));
vi.mock('@/components/modals/ConfigJsonModal', () => ({
    ConfigJsonModal: () => null,
}));
vi.mock('@/components/settings/PluginsTab', () => ({
    PluginsTab: () => {
        const [params] = useSearchParams();
        return <div data-testid="plugins-content">{params.get('filter') ?? 'all'}</div>;
    },
}));
vi.mock('@/components/settings/GeneralTab', () => ({
    GeneralTab: () => <div>GeneralTab</div>,
}));
vi.mock('@/components/settings/PrivacyTab', () => ({
    PrivacyTab: () => <div>PrivacyTab</div>,
}));
vi.mock('@/components/settings/AppearanceTab', () => ({
    AppearanceTab: () => <div>AppearanceTab</div>,
}));
vi.mock('@/components/settings/LocalizationTab', () => ({
    LocalizationTab: () => <div>LocalizationTab</div>,
}));
vi.mock('@/components/settings/AiTab', () => ({
    AiTab: () => <div>AiTab</div>,
}));
vi.mock('@/components/settings/LogsTab', () => ({
    LogsTab: () => <div>LogsTab</div>,
}));
vi.mock('@/components/settings/ShortcutsTab', () => ({
    ShortcutsTab: () => <div>ShortcutsTab</div>,
}));
vi.mock('@/components/settings/SshTab', () => ({
    SshTab: () => <div>SshTab</div>,
}));
vi.mock('@/components/settings/BackupTab', () => ({
    BackupTab: () => <div>BackupTab</div>,
}));
vi.mock('@/components/settings/StorageTab', () => ({
    StorageTab: () => <div>StorageTab</div>,
}));
vi.mock('@/components/settings/NetworkTab', () => ({
    NetworkTab: () => <div>NetworkTab</div>,
}));
vi.mock('@/components/settings/AiActivityPanel', () => ({
    AiActivityPanel: () => <div>AiActivityPanel</div>,
}));
vi.mock('@/components/settings/InfoTab', () => ({
    InfoTab: () => <div>InfoTab</div>,
}));
vi.mock('@/components/settings/PluginSettingsPage', () => ({
    PluginSettingsPage: () => <div>PluginSettingsPage</div>,
}));

const plugin: RegistryPluginWithStatus = {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: '',
    author: '',
    homepage: '',
    installed_version: '1.0.0',
    latest_version: '2.0.0',
    update_available: true,
    platform_supported: true,
    releases: [],
};

function renderApp(path = '/settings') {
    return render(
        <StrictMode>
            <ToastProvider>
                <MemoryRouter initialEntries={[path]}>
                    <PluginUpdateToast />
                    <Routes>
                        <Route path="/connections" element={<div>Connections</div>} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/plugins" element={<PluginsPage />} />
                        <Route path="/ai-activity" element={<AiActivityPage />} />
                    </Routes>
                </MemoryRouter>
            </ToastProvider>
        </StrictMode>,
    );
}

describe('update navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePluginRegistry).mockReturnValue({
            plugins: [],
            updates: [],
            loading: false,
            error: null,
            refresh: vi.fn(),
        });
        vi.mocked(useUpdate).mockReturnValue({
            updateInfo: null,
            availableUpdate: null,
            isChecking: false,
            isDownloading: false,
            downloadProgress: 0,
            checkForUpdates: vi.fn(),
            downloadAndInstall: vi.fn(),
            dismissUpdate: vi.fn(),
            error: null,
            isUpToDate: true,
            installationSource: null,
        });
    });

    it('lists plugin settings pages without update badges when nothing is outdated', () => {
        renderApp();
        expect(screen.getByRole('heading', {name: 'Impostazioni dei plugin'})).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'MySQL'})).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        expect(within(screen.getByRole('button', {name: 'Info'})).queryByText('1')).toBeNull();
    });

    it('no longer lists Plugins and AI Activity among the settings tabs', () => {
        renderApp();
        expect(screen.queryByRole('button', {name: /^Plugin$/})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: /^Attività/})).not.toBeInTheDocument();
    });

    it('shows the core update counter and details on Info', () => {
        vi.mocked(useUpdate).mockReturnValue({
            ...useUpdate(),
            availableUpdate: {
                hasUpdate: true,
                currentVersion: '0.24.0',
                latestVersion: '0.25.0',
                releaseNotes: '',
                releaseUrl: '',
                publishedAt: '',
                downloadUrls: [],
            },
        });
        renderApp();
        const infoButton = screen.getByRole('button', {name: /^Info/});
        expect(within(infoButton).getByText('1')).toHaveClass('rounded-full');
        fireEvent.focus(infoButton);
        expect(screen.getByRole('tooltip')).toHaveTextContent('Tabularis 0.25.0 è disponibile');
    });

    it('redirects the former tabs to their pages and keeps the filters', async () => {
        renderApp('/settings?tab=plugins&filter=updates');
        expect(await screen.findByTestId('plugins-content')).toHaveTextContent('updates');
    });

    it('redirects the former AI activity tab to its page', async () => {
        renderApp('/settings?tab=ai-activity');
        expect(await screen.findByText('AiActivityPanel')).toBeInTheDocument();
    });

    it('opens the updates filter by clicking the startup toast and does not repeat', async () => {
        vi.mocked(usePluginRegistry).mockReturnValue({
            ...usePluginRegistry(),
            updates: [plugin],
        });
        renderApp('/connections');
        const toast = screen.getByRole('status');
        expect(toast.parentElement).toHaveClass('bottom-4', 'right-4');
        fireEvent.click(
            within(toast).getByRole('button', {
                name: /Aggiornamenti dei plugin disponibili/,
            }),
        );
        expect(await screen.findByTestId('plugins-content')).toHaveTextContent('updates');
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('navigates to Plugins from the toast even when Settings is already open', async () => {
        vi.mocked(usePluginRegistry).mockReturnValue({
            ...usePluginRegistry(),
            updates: [plugin],
        });
        renderApp('/settings?tab=info');
        expect(screen.getByText('InfoTab')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Apri Plugins'}));
        expect(await screen.findByTestId('plugins-content')).toHaveTextContent('updates');
    });

    it('waits for the registry and can notify after recovery from a failed startup check', async () => {
        vi.mocked(usePluginRegistry).mockReturnValue({
            ...usePluginRegistry(),
            loading: true,
        });
        const app = renderApp();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        vi.mocked(usePluginRegistry).mockReturnValue({
            ...usePluginRegistry(),
            loading: false,
            error: 'Offline',
        });
        app.rerender(
            <ToastProvider>
                <MemoryRouter>
                    <PluginUpdateToast />
                </MemoryRouter>
            </ToastProvider>,
        );
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
        vi.mocked(usePluginRegistry).mockReturnValue({
            ...usePluginRegistry(),
            error: null,
            updates: [plugin],
        });
        await act(async () =>
            app.rerender(
                <ToastProvider>
                    <MemoryRouter>
                        <PluginUpdateToast />
                    </MemoryRouter>
                </ToastProvider>,
            ),
        );
        await waitFor(() =>
            expect(screen.getByRole('status')).toHaveTextContent(
                '1 aggiornamento plugin disponibile',
            ),
        );
    });
});
