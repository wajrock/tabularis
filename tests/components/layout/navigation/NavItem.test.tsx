import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import {Database} from 'lucide-react';
import {NavItem} from '@/components/layout/navigation/NavItem';
import {Badge} from '@/components/ui/Badge';

vi.mock('lucide-react', async () => await vi.importActual('lucide-react'));

const renderItem = (variant: 'expanded' | 'rail', path = '/other', extra = {}) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <NavItem to="/plugins" icon={Database} label="Plugins" variant={variant} {...extra} />
        </MemoryRouter>,
    );

describe('NavItem', () => {
    it('shows its label when expanded', () => {
        renderItem('expanded');
        expect(screen.getByRole('link', {name: 'Plugins'})).toHaveTextContent('Plugins');
    });

    it('keeps an accessible name on the rail without visible text', () => {
        renderItem('rail');
        const link = screen.getByRole('link', {name: 'Plugins'});
        expect(link).not.toHaveTextContent('Plugins');
        expect(link).toHaveAttribute('title', 'Plugins');
    });

    it('marks the current route as active', () => {
        renderItem('expanded', '/plugins');
        expect(screen.getByRole('link', {name: 'Plugins'})).toHaveClass('bg-surface-secondary');
    });

    it('describes its badge in the accessible name', () => {
        renderItem('expanded', '/other', {
            badge: <Badge tone="accent">2</Badge>,
            description: '2 plugin updates available',
        });
        expect(
            screen.getByRole('link', {name: 'Plugins: 2 plugin updates available'}),
        ).toHaveTextContent('2');
    });
});
