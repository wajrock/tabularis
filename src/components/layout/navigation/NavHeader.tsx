import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {Command, PanelLeftClose, PanelLeftOpen, Plus} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {IconButton} from '@/components/ui/IconButton';
import {useCommandPaletteDispatch} from '@/hooks/useCommandPalette';
import {useShortcutLabel} from '@/hooks/useShortcutLabel';
import {FOCUS_RING} from '@/components/ui/focusRing';

interface NavHeaderProps {
    variant: 'expanded' | 'rail';
    onToggle: () => void;
}

export function NavHeader({variant, onToggle}: NavHeaderProps) {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {togglePalette} = useCommandPaletteDispatch();
    const paletteShortcut = useShortcutLabel('command_palette');
    const newConnectionShortcut = useShortcutLabel('new_connection');

    const openNewConnection = () => navigate('/connections', {state: {openNew: true}});
    const paletteLabel = paletteShortcut
        ? `${t('sidebar.commandPalette')} (${paletteShortcut})`
        : t('sidebar.commandPalette');
    const newConnectionLabel = t('sidebar.newConnection');
    const logo = (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <img src="/logo.svg" alt="" className="h-[21px] w-[21px]" />
        </span>
    );

    if (variant === 'rail') {
        return (
            <div className="flex flex-col items-center gap-2">
                <span title="Tabularis" className="mb-3">
                    {logo}
                </span>
                <button
                    type="button"
                    onClick={openNewConnection}
                    aria-label={newConnectionLabel}
                    title={newConnectionLabel}
                    className={clsx(
                        'flex h-9 w-9 items-center justify-center rounded-md bg-tint-accent-bg text-tint-accent-fg transition-opacity hover:opacity-90',
                        FOCUS_RING,
                    )}
                >
                    <Plus size={18} />
                </button>
                <IconButton label={paletteLabel} size="lg" onClick={() => togglePalette('all')}>
                    <Command size={14} />
                </IconButton>
                <IconButton label={t('sidebar.expand')} size="lg" onClick={onToggle}>
                    <PanelLeftOpen size={14} />
                </IconButton>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex h-7 items-center gap-2">
                {logo}
                <span className="text-[16px] font-bold leading-6 text-primary">Tabularis</span>
                <div className="-mr-1.5 ml-auto flex items-center">
                    <IconButton label={paletteLabel} onClick={() => togglePalette('all')}>
                        <Command size={14} />
                    </IconButton>
                    <IconButton label={t('sidebar.collapse')} onClick={onToggle}>
                        <PanelLeftClose size={14} />
                    </IconButton>
                </div>
            </div>
            <Button
                variant="tinted"
                fullWidth
                icon={<Plus size={20} className="-mx-0.5 shrink-0" />}
                shortcut={newConnectionShortcut}
                onClick={openNewConnection}
            >
                {newConnectionLabel}
            </Button>
        </div>
    );
}
