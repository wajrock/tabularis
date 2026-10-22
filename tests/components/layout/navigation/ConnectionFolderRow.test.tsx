import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ConnectionFolderRow} from '@/components/layout/navigation/ConnectionFolderRow';

vi.mock('lucide-react', async () => await vi.importActual('lucide-react'));

const renderFolder = (overrides: Partial<Parameters<typeof ConnectionFolderRow>[0]> = {}) =>
    render(
        <ConnectionFolderRow
            name="PG-PROD"
            path="PG / PG-PROD"
            count={2}
            isCollapsed={false}
            hasActiveConnection={false}
            onToggle={vi.fn()}
            variant="expanded"
            {...overrides}
        >
            <span>child connection</span>
        </ConnectionFolderRow>,
    );

describe('ConnectionFolderRow', () => {
    it.each(['expanded', 'rail'] as const)('shows its connections when open (%s)', (variant) => {
        renderFolder({variant});
        expect(screen.getByText('child connection')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'PG / PG-PROD'})).toHaveAttribute(
            'aria-expanded',
            'true',
        );
    });

    it('hides its connections when collapsed', () => {
        renderFolder({isCollapsed: true});
        expect(screen.queryByText('child connection')).not.toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'PG / PG-PROD'})).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    it('toggles on click', () => {
        const onToggle = vi.fn();
        renderFolder({onToggle});
        fireEvent.click(screen.getByRole('button', {name: 'PG / PG-PROD'}));
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('highlights a collapsed folder that hides the current connection', () => {
        renderFolder({isCollapsed: true, hasActiveConnection: true});
        expect(screen.getByRole('button', {name: 'PG / PG-PROD'})).toHaveClass(
            'bg-surface-secondary',
        );
    });

    it('leaves the highlight to the connection itself while open', () => {
        renderFolder({hasActiveConnection: true});
        expect(screen.getByRole('button', {name: 'PG / PG-PROD'})).not.toHaveClass(
            'bg-surface-secondary',
        );
    });

    it('shows the connection count', () => {
        renderFolder();
        expect(screen.getByText('2')).toBeInTheDocument();
    });
});
