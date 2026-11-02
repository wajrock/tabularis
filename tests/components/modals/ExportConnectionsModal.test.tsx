import {describe, it, expect, vi} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {ExportConnectionsModal} from '@/components/modals/ExportConnectionsModal';

function renderModal(props: Partial<Parameters<typeof ExportConnectionsModal>[0]> = {}) {
    const onExport = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
        <ExportConnectionsModal isOpen={true} onClose={onClose} onExport={onExport} {...props} />,
    );
    return {onExport, onClose};
}

describe('ExportConnectionsModal', () => {
    it('puts the number of exported connections in the Export button', () => {
        renderModal({totalCount: 12});
        expect(
            screen.getByRole('button', {name: 'connections.exportModal.exportCount'}),
        ).toBeInTheDocument();
    });

    it('falls back to a plain Export label without a count', () => {
        renderModal();
        expect(
            screen.getByRole('button', {name: 'connections.exportModal.export'}),
        ).toBeInTheDocument();
    });

    it('requires a password before an encrypted export', async () => {
        const {onExport} = renderModal();
        fireEvent.click(screen.getByText('connections.exportModal.export'));
        await waitFor(() => {
            expect(
                screen.getByText('connections.exportModal.passwordRequired'),
            ).toBeInTheDocument();
        });
        expect(onExport).not.toHaveBeenCalled();
    });

    it('flags a confirmation that does not match', () => {
        const {onExport} = renderModal();
        const [password, confirm] = screen.getAllByLabelText(/password/i);
        fireEvent.change(password, {target: {value: 'secret'}});
        fireEvent.change(confirm, {target: {value: 'secreT'}});
        expect(screen.getByText('connections.exportModal.passwordMismatch')).toBeInTheDocument();
        fireEvent.click(screen.getByText('connections.exportModal.export'));
        expect(onExport).not.toHaveBeenCalled();
    });

    it('exports without a password in noSecrets mode', async () => {
        const {onExport} = renderModal();
        fireEvent.click(screen.getAllByRole('radio')[1]);
        fireEvent.click(screen.getByText('connections.exportModal.export'));
        await waitFor(() => {
            expect(onExport).toHaveBeenCalledWith('noSecrets', undefined);
        });
    });
});
