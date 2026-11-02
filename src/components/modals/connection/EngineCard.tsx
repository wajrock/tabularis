import clsx from 'clsx';
import {ArrowDownToLine, Database, Download, MonitorOff, ShieldCheck} from 'lucide-react';
import type {CSSProperties} from 'react';
import {useTranslation} from 'react-i18next';

import type {PluginManifest} from '@/types/plugins';
import type {CatalogueDriver, EngineGroup} from '@/utils/connectionCatalogue';
import {labelForParadigm} from '@/utils/connectionCatalogue';
import {getDriverIcon, isUrlIcon} from '@/utils/driverUI';
import {RegistryDriverIcon} from '@/components/RegistryDriverIcon';
import {Chip} from '@/components/ui/Chip';
import {FOCUS_RING} from '@/components/ui/focusRing';

interface EngineCardProps {
    group: EngineGroup;
    onSelect: (group: EngineGroup) => void;
}

/** Pleasant accent per data-model family, used when a driver declares no color. */
const PARADIGM_ACCENT: Record<string, string> = {
    sql: '#3b82f6',
    nosql: '#10b981',
    document: '#10b981',
    'key-value': '#14b8a6',
    vector: '#a855f7',
    graph: '#f59e0b',
    timeseries: '#ec4899',
    relational: '#3b82f6',
    other: '#64748b',
};

function accentFor(group: EngineGroup, rep: CatalogueDriver): string {
    return rep.color || PARADIGM_ACCENT[group.primaryParadigm] || '#64748b';
}

function renderIcon(rep: CatalogueDriver) {
    const icon = rep.icon ?? '';
    if (isUrlIcon(icon)) {
        return <RegistryDriverIcon src={icon} size={20} fallback={<Database size={20} />} />;
    }
    if (rep.isBuiltin) {
        return getDriverIcon({icon, color: rep.color ?? undefined} as PluginManifest, 20);
    }
    return <Database size={20} />;
}

function formatCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

export function EngineCard({group, onSelect}: EngineCardProps) {
    const {t} = useTranslation();
    const rep = group.drivers.find((d) => d.isBuiltin) ?? group.drivers[0];
    const accent = accentFor(group, rep);
    const driverCount = group.drivers.length;
    const unsupported = !group.platformSupported;

    return (
        <button
            type="button"
            aria-label={t('connectionCatalogue.connectTo', {
                name: group.displayName,
                defaultValue: 'Connect to {{name}}',
            })}
            onClick={() => onSelect(group)}
            style={{'--engine-accent': accent} as CSSProperties}
            className={clsx(
                // Hover outlines the card in the engine's color.
                'group relative flex cursor-pointer select-none flex-col gap-4 rounded-lg border border-default p-4 text-left transition-colors hover:border-[var(--engine-accent)]',
                FOCUS_RING,
                // Not installed yet: a slightly recessed card.
                group.installed ? 'bg-base' : 'bg-surface-secondary/40',
            )}
        >
            {/* header: brand tile · name and meta, downloads on the right */}
            <span className="flex min-w-0 items-center gap-3">
                <span
                    aria-hidden="true"
                    className={clsx(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                        unsupported && 'opacity-50 grayscale',
                    )}
                    // Light tint of the engine color, icon in the color itself.
                    style={{backgroundColor: `${accent}1f`, color: accent}}
                >
                    {renderIcon(rep)}
                </span>
                <span className="flex min-w-0 flex-col gap-px">
                    <span
                        className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-primary"
                        title={group.displayName}
                    >
                        <span className="truncate">{group.displayName}</span>
                        {group.verified && (
                            <span
                                className="flex shrink-0 text-accent"
                                title={t('connectionCatalogue.verified', {
                                    defaultValue: 'Verified',
                                })}
                            >
                                <ShieldCheck size={13} aria-hidden />
                                <span className="sr-only">
                                    {t('connectionCatalogue.verified', {defaultValue: 'Verified'})}
                                </span>
                            </span>
                        )}
                    </span>
                    <span className="truncate text-xs text-muted">
                        {labelForParadigm(group.primaryParadigm)}
                        {group.secondaryParadigms.length > 0 &&
                            ` +${group.secondaryParadigms.length}`}
                        {driverCount > 1 &&
                            ` · ${t('connectionCatalogue.driverCount', {
                                count: driverCount,
                                defaultValue: '{{count}} drivers',
                            })}`}
                    </span>
                </span>
                {group.downloads != null && (
                    <span className="ml-auto flex shrink-0 items-center gap-1 self-start text-xs tabular-nums text-muted">
                        <Download size={12} aria-hidden />
                        {formatCount(group.downloads)}
                    </span>
                )}
            </span>

            {/* footer: install status, then deprecation */}
            <span className="flex items-center gap-2">
                {/* status: same weight whether installed or not, like a connection's status */}
                <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
                    {group.installed ? (
                        <>
                            <span
                                aria-hidden="true"
                                className="h-2 w-2 rounded-full bg-status-success"
                            />
                            <span className="text-secondary">
                                {t('connectionCatalogue.installed', {defaultValue: 'Installed'})}
                            </span>
                        </>
                    ) : unsupported ? (
                        <span
                            className="flex items-center gap-1.5 text-tint-warning-fg"
                            title={t('connectionCatalogue.unavailableOnPlatform', {
                                defaultValue: 'Unavailable on your platform',
                            })}
                        >
                            <MonitorOff size={12} aria-hidden />
                            {t('connectionCatalogue.unavailable', {defaultValue: 'Unavailable'})}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-muted transition-colors group-hover:text-primary">
                            <ArrowDownToLine size={12} aria-hidden />
                            {t('connectionCatalogue.install', {defaultValue: 'Install'})}
                        </span>
                    )}
                </span>
                {rep.deprecated && (
                    <Chip
                        variant="flat"
                        tone="warning"
                        title={t('connectionCatalogue.deprecatedTooltip', {
                            defaultValue: 'This built-in driver is being replaced by a plugin',
                        })}
                    >
                        {t('connectionCatalogue.deprecated', {defaultValue: 'Deprecated'})}
                    </Chip>
                )}
            </span>
        </button>
    );
}
