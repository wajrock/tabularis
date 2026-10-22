import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {OpenConnectionRow} from '@/components/layout/navigation/OpenConnectionRow';
import type {ConnectionStatus} from '@/hooks/useConnectionManager';

vi.mock('lucide-react', async () => await vi.importActual('lucide-react'));

const layout = {
    selectedConnectionIds: new Set<string>(),
    toggleSelection: vi.fn(),
    activateSplit: vi.fn(),
    splitView: null,
    addConnectionToSplit: vi.fn(),
};
vi.mock('@/hooks/useConnectionLayoutContext', () => ({
    useConnectionLayoutContext: () => layout,
}));
const saved = {
    id: 'c1',
    name: 'crm-production',
    environment: 'production',
    params: {driver: 'postgres', host: 'db.internal', port: 5432, database: 'app_db'},
};
vi.mock('@/hooks/useDatabase', () => ({useDatabase: () => ({connections: [saved]})}));
vi.mock('@/hooks/useDrivers', () => ({useDrivers: () => ({allDrivers: []})}));
vi.mock('@/hooks/useHomeDir', () => ({useHomeDir: () => '/Users/me'}));

const connection: ConnectionStatus = {
    id: 'c1',
    name: 'crm-production',
    driver: 'postgres',
    database: 'app_db',
    sshEnabled: true,
    k8sEnabled: false,
    ssmEnabled: false,
    isOpen: true,
    isActive: false,
    isConnecting: false,
    isConnected: true,
};

const handlers = () => ({
    onSwitch: vi.fn(),
    onOpenInEditor: vi.fn(),
    onOpenInWindow: vi.fn(),
    onDisconnect: vi.fn(),
});

const renderRow = (props: Partial<Parameters<typeof OpenConnectionRow>[0]> = {}) => {
    const h = handlers();
    render(
        <MemoryRouter initialEntries={['/editor']}>
            <OpenConnectionRow
                connection={connection}
                variant="expanded"
                shortcutIndex={2}
                showShortcutHint={false}
                dropIndicator={null}
                {...h}
                {...props}
            />
        </MemoryRouter>,
    );
    return h;
};

describe('OpenConnectionRow', () => {
    beforeEach(() => vi.clearAllMocks());

    it('shows the name and the database and address', () => {
        renderRow();
        expect(screen.getByText('crm-production')).toBeInTheDocument();
        expect(screen.getByText('app_db · db.internal:5432')).toBeInTheDocument();
    });

    it('switches on click and toggles the selection on Cmd/Ctrl+click', () => {
        const h = renderRow();
        const row = screen.getByTitle(/^crm-production/);
        fireEvent.click(row);
        expect(h.onSwitch).toHaveBeenCalledTimes(1);
        fireEvent.click(row, {metaKey: true});
        expect(layout.toggleSelection).toHaveBeenCalledWith('c1', true);
        expect(h.onSwitch).toHaveBeenCalledTimes(1);
    });

    it('disconnects from the trailing button', () => {
        const h = renderRow();
        fireEvent.click(screen.getByRole('button', {name: 'connections.disconnect'}));
        expect(h.onDisconnect).toHaveBeenCalledTimes(1);
        expect(h.onSwitch).not.toHaveBeenCalled();
    });

    it('shows the shortcut number while Cmd/Ctrl+Shift is held', () => {
        renderRow({showShortcutHint: true});
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'connections.disconnect'})).toBeNull();
    });

    it('marks tunnels and production connections', () => {
        const {container} = render(
            <MemoryRouter>
                <OpenConnectionRow
                    connection={connection}
                    variant="rail"
                    showShortcutHint={false}
                    dropIndicator={null}
                    {...handlers()}
                />
            </MemoryRouter>,
        );
        expect(container.querySelector('.outline-status-error')).toBeInTheDocument();
        renderRow();
        expect(screen.getByLabelText('sidebar.tunnel')).toBeInTheDocument();
    });

    it('opens the context menu with the connection actions', () => {
        const h = renderRow();
        fireEvent.contextMenu(screen.getByTitle(/^crm-production/));
        fireEvent.click(screen.getByText('sidebar.openInNewWindow'));
        expect(h.onOpenInWindow).toHaveBeenCalledTimes(1);
    });

    it('marks the current editor view', () => {
        renderRow({connection: {...connection, isActive: true}});
        expect(screen.getByTitle(/^crm-production/)).toHaveAttribute('aria-current', 'page');
    });
});
