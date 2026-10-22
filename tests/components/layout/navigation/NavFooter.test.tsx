import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {NavFooter} from '@/components/layout/navigation/NavFooter';
import {APP_VERSION} from '@/version';

vi.mock('lucide-react', async () => await vi.importActual('lucide-react'));
vi.mock('@/components/ui/SlotAnchor', () => ({SlotAnchor: () => <div data-testid="slot" />}));
vi.mock('@/hooks/useDatabase', () => ({
    useDatabase: () => ({activeConnectionId: null, activeDriver: null}),
}));
let availableUpdate: {hasUpdate: boolean; latestVersion: string} | null = null;
vi.mock('@/hooks/useUpdate', () => ({useUpdate: () => ({availableUpdate})}));

function Location() {
    const {pathname, search} = useLocation();
    return <output data-testid="location">{pathname + search}</output>;
}

const renderFooter = (props: Partial<Parameters<typeof NavFooter>[0]> = {}) => {
    const onOpenWhatsNew = vi.fn();
    render(
        <MemoryRouter initialEntries={['/connections']}>
            <NavFooter variant="expanded" onOpenWhatsNew={onOpenWhatsNew} {...props} />
            <Routes>
                <Route path="*" element={<Location />} />
            </Routes>
        </MemoryRouter>,
    );
    return onOpenWhatsNew;
};

describe('NavFooter', () => {
    beforeEach(() => {
        availableUpdate = null;
        localStorage.setItem('tabularis:discord-callout-v2-dismissed', 'true');
    });

    it('opens the changelog from the version row', () => {
        const onOpenWhatsNew = renderFooter();
        fireEvent.click(screen.getByRole('button', {name: `v${APP_VERSION} · sidebar.whatsNew`}));
        expect(onOpenWhatsNew).toHaveBeenCalledTimes(1);
    });

    it('offers the available update instead, linking to Info', () => {
        availableUpdate = {hasUpdate: true, latestVersion: '9.9.9'};
        renderFooter();
        fireEvent.click(screen.getByRole('button', {name: 'sidebar.updateAvailable'}));
        expect(screen.getByTestId('location')).toHaveTextContent('/settings?tab=info');
    });

    it('renders the plugin slot in the sidebar', () => {
        renderFooter();
        expect(screen.getByTestId('slot')).toBeInTheDocument();
    });
});
