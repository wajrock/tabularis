import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {ConnectionCard, type ConnectionCardProps} from '@/components/connections/ConnectionCard';
import {usePluginRegistry} from '@/hooks/usePluginRegistry';
import type {PluginManifest, RegistryPluginWithStatus} from '@/types/plugins';

vi.mock('lucide-react', async () => await vi.importActual('lucide-react'));
vi.mock('@/hooks/usePluginRegistry', () => ({usePluginRegistry: vi.fn()}));
vi.mock('@/hooks/useDatabase', () => ({
    useDatabase: () => ({activeConnectionId: null, isConnectionOpenAnywhere: () => false}),
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
const driver: PluginManifest = {
    id: 'postgresql',
    name: 'PostgreSQL',
    version: '1.0.0',
    description: '',
    default_port: 5432,
    capabilities: {
        schemas: true,
        views: true,
        routines: true,
        file_based: false,
        folder_based: false,
        identifier_quote: '"',
        alter_primary_key: true,
    },
};
const props: ConnectionCardProps = {
    conn: {id: 'one', name: 'Production', params: {driver: 'postgresql', database: 'db'}},
    connectingId: null,
    allDrivers: [driver],
    enabledDrivers: [driver],
    onConnect: vi.fn(),
    onEdit: vi.fn(),
    onOpenMenu: vi.fn(),
    onContextMenu: vi.fn(),
    onMouseDown: vi.fn(),
};

function Cards() {
    return (
        <MemoryRouter initialEntries={['/connections']}>
            <Routes>
                <Route
                    path="/connections"
                    element={
                        <>
                            <ConnectionCard {...props} />
                            <ConnectionCard
                                {...props}
                                conn={{...props.conn, id: 'two', name: 'Staging'}}
                            />
                        </>
                    }
                />
                <Route path="/plugins" element={<div>Plugin center</div>} />
            </Routes>
        </MemoryRouter>
    );
}

describe('ConnectionCard driver updates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(usePluginRegistry).mockReturnValue({
            plugins: [plugin],
            updates: [plugin],
            loading: false,
            error: null,
            refresh: vi.fn(),
        });
    });

    it('shows a static update pill with the target version on every connection sharing the plugin', () => {
        render(<Cards />);
        const links = screen.getAllByRole('link', {name: 'update.badges.driverUpdate'});
        expect(links).toHaveLength(2);
        for (const link of links) {
            expect(link).toHaveAttribute('href', '/plugins?filter=updates');
            expect(link.textContent).toBe('v2.0.0');
            const pill = link.firstElementChild as HTMLElement;
            expect(pill).toHaveClass('rounded-full');
            expect(pill.style.backgroundColor).toContain('--accent-primary');
            expect(pill.querySelector('.lucide-arrow-up')).not.toBeNull();
            expect(link.querySelector("[class*='animate-']")).toBeNull();
        }
        fireEvent.focus(links[0]);
        expect(screen.getByRole('tooltip')).toHaveTextContent('update.badges.driverTooltip');
        expect(links[0]).toHaveAttribute('aria-describedby', screen.getByRole('tooltip').id);
    });

    it('only navigates to plugin updates; pointer events do not activate the connection card', () => {
        render(<Cards />);
        const link = screen.getAllByRole('link')[0];
        fireEvent.mouseDown(link);
        fireEvent.doubleClick(link);
        fireEvent.contextMenu(link);
        expect(props.onMouseDown).not.toHaveBeenCalled();
        expect(props.onConnect).not.toHaveBeenCalled();
        expect(props.onContextMenu).not.toHaveBeenCalled();
        fireEvent.click(link);
        expect(screen.getByText('Plugin center')).toBeInTheDocument();
        expect(props.onConnect).not.toHaveBeenCalled();
    });

    it('preserves connection activation, selection and custom appearance with the shared layout', () => {
        const toggle = vi.fn();
        const {container} = render(
            <MemoryRouter>
                <ConnectionCard
                    {...props}
                    conn={{
                        ...props.conn,
                        appearance: {accentColor: '#ff0000', icon: {type: 'emoji', value: '💉'}},
                    }}
                    selected
                    onToggleSelect={toggle}
                />
            </MemoryRouter>,
        );
        const root = container.querySelector('.group');
        expect(root).toHaveClass('outline-accent-primary');
        expect(container.querySelector('.h-8.w-8')).toHaveStyle({backgroundColor: '#ff0000'});
        expect(screen.getByText('💉')).toBeInTheDocument();
        const card = screen.getByRole('button', {name: 'Production'});
        fireEvent.click(card);
        expect(toggle).not.toHaveBeenCalled();
        fireEvent.click(card, {metaKey: true});
        fireEvent.click(card, {ctrlKey: true});
        expect(toggle).toHaveBeenCalledTimes(2);
        expect(props.onConnect).not.toHaveBeenCalled();
        fireEvent.doubleClick(screen.getByText('Production'));
        expect(props.onConnect).toHaveBeenCalledOnce();
    });

    it('removes all shared indicators when the registry no longer reports the update', () => {
        const app = render(<Cards />);
        vi.mocked(usePluginRegistry).mockReturnValue({...usePluginRegistry(), updates: []});
        app.rerender(<Cards />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it("does not flag a different driver, including a built-in replacement's old id", () => {
        vi.mocked(usePluginRegistry).mockReturnValue({
            ...usePluginRegistry(),
            updates: [{...plugin, id: 'postgres'}],
        });
        render(<Cards />);
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
