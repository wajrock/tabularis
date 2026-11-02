import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {EnvironmentSelect} from '@/components/modals/NewConnectionModal/fields/EnvironmentSelect';

describe('EnvironmentSelect', () => {
    it('shows a colored dot next to every environment in the menu', () => {
        render(<EnvironmentSelect value="staging" onChange={vi.fn()} />);
        fireEvent.click(screen.getByRole('button', {name: 'environment.label'}));
        const rows = screen.getAllByRole('menuitem');
        expect(rows).toHaveLength(4);
        expect(rows[1].querySelector('.bg-status-success')).not.toBeNull();
        expect(rows[2].querySelector('.bg-status-warning')).not.toBeNull();
        expect(rows[3].querySelector('.bg-status-error')).not.toBeNull();
    });

    it('selects an environment from the menu', () => {
        const onChange = vi.fn();
        render(<EnvironmentSelect value="" onChange={onChange} />);
        fireEvent.click(screen.getByRole('button', {name: 'environment.label'}));
        fireEvent.click(screen.getByRole('menuitem', {name: 'environment.production'}));
        expect(onChange).toHaveBeenCalledWith('production');
    });
});
