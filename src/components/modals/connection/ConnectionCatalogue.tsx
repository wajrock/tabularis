import clsx from 'clsx';
import {CircleCheck, CloudOff, SearchX, ShieldCheck} from 'lucide-react';
import {useMemo, useState, type ReactNode} from 'react';
import {useTranslation} from 'react-i18next';

import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';
import {FOCUS_RING} from '@/components/ui/focusRing';
import {InlineBanner} from '@/components/ui/InlineBanner';
import {SearchBar} from '@/components/ui/SearchBar';

import {filterCatalogue, type EngineGroup, type ParadigmFacet} from '@/utils/connectionCatalogue';
import {EngineCard} from './EngineCard';

interface ConnectionCatalogueProps {
    groups: EngineGroup[];
    facets: ParadigmFacet[];
    loading: boolean;
    registryOffline: boolean;
    onSelect: (group: EngineGroup) => void;
}

/** 36 px outlined on/off filter next to the search bar; tinted when on. */
function FilterToggle({
    pressed,
    onToggle,
    icon,
    children,
}: {
    pressed: boolean;
    onToggle: () => void;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={pressed}
            onClick={onToggle}
            className={clsx(
                'flex h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
                FOCUS_RING,
                pressed
                    ? 'border-transparent bg-tint-accent-bg text-tint-accent-fg'
                    : 'border-strong text-secondary hover:bg-surface-hover hover:text-primary',
            )}
        >
            {icon}
            {children}
        </button>
    );
}

/** Data-model tab with its count; one is selected at a time. */
function ParadigmTab({
    selected,
    onSelect,
    label,
    count,
}: {
    selected: boolean;
    onSelect: () => void;
    label: string;
    count: number;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={clsx(
                'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
                FOCUS_RING,
                selected
                    ? 'bg-surface-primary text-primary'
                    : 'text-secondary hover:bg-surface-hover hover:text-primary',
            )}
        >
            {label}
            <span className="tabular-nums text-muted">{count}</span>
        </button>
    );
}

export function ConnectionCatalogue({
    groups,
    facets,
    loading,
    registryOffline,
    onSelect,
}: ConnectionCatalogueProps) {
    const {t} = useTranslation();
    const [search, setSearch] = useState('');
    // One data model at a time: the results are already grouped by model.
    const [paradigm, setParadigm] = useState<string | null>(null);
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [installedOnly, setInstalledOnly] = useState(false);

    const visible = useMemo(
        () =>
            filterCatalogue(groups, {
                search,
                paradigms: paradigm ? [paradigm] : [],
                verifiedOnly,
                installedOnly,
            }),
        [groups, search, paradigm, verifiedOnly, installedOnly],
    );

    // Data models stay together, in the order they first appear.
    const ordered = useMemo(() => {
        const map = new Map<string, EngineGroup[]>();
        for (const g of visible) {
            const list = map.get(g.primaryParadigm) ?? [];
            list.push(g);
            map.set(g.primaryParadigm, list);
        }
        return [...map.values()].flat();
    }, [visible]);

    const hasFilters = search.length > 0 || paradigm !== null || verifiedOnly || installedOnly;

    const clearFilters = () => {
        setSearch('');
        setParadigm(null);
        setVerifiedOnly(false);
        setInstalledOnly(false);
    };

    const allCount = groups.length;

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            {/* ── search, status filters, then data-model tabs ── */}
            <div className="flex shrink-0 flex-col gap-3 pb-3">
                <div className="flex items-center gap-2">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder={t('connectionCatalogue.searchPlaceholder', {
                            defaultValue: 'Search databases…',
                        })}
                        className="flex-1"
                    />
                    <FilterToggle
                        pressed={verifiedOnly}
                        onToggle={() => setVerifiedOnly((v) => !v)}
                        icon={<ShieldCheck size={14} />}
                    >
                        {t('connectionCatalogue.verified', {defaultValue: 'Verified'})}
                    </FilterToggle>
                    <FilterToggle
                        pressed={installedOnly}
                        onToggle={() => setInstalledOnly((v) => !v)}
                        icon={<CircleCheck size={14} />}
                    >
                        {t('connectionCatalogue.installed', {defaultValue: 'Installed'})}
                    </FilterToggle>
                </div>

                <div
                    role="radiogroup"
                    aria-label={t('connectionCatalogue.dataModel', {defaultValue: 'Data model'})}
                    className="flex flex-wrap items-center gap-1"
                >
                    <ParadigmTab
                        selected={paradigm === null}
                        onSelect={() => setParadigm(null)}
                        label={t('connectionCatalogue.all', {defaultValue: 'All'})}
                        count={allCount}
                    />
                    {facets.map((f) => (
                        <ParadigmTab
                            key={f.key}
                            selected={paradigm === f.key}
                            onSelect={() => setParadigm(f.key)}
                            label={f.label}
                            count={f.count}
                        />
                    ))}
                </div>
            </div>

            {/* ── scrollable results ── */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-1">
                {registryOffline && (
                    <InlineBanner tone="amber" icon={<CloudOff size={14} />}>
                        {t('connectionCatalogue.registryOffline', {
                            defaultValue:
                                'Registry unreachable — showing installed and built-in drivers only.',
                        })}
                    </InlineBanner>
                )}

                {loading ? (
                    <div className="grid grid-cols-3 gap-3">
                        {Array.from({length: 6}).map((_, i) => (
                            <div
                                key={i}
                                className="h-[68px] animate-pulse rounded-lg border border-default bg-surface-secondary"
                            />
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <EmptyState
                        icon={SearchX}
                        title={t('connectionCatalogue.noMatches', {
                            defaultValue: 'No databases match your filters.',
                        })}
                        actions={
                            hasFilters && (
                                <Button variant="outline" onClick={clearFilters}>
                                    {t('connectionCatalogue.clearFilters', {
                                        defaultValue: 'Clear filters',
                                    })}
                                </Button>
                            )
                        }
                    />
                ) : (
                    <div className="grid grid-cols-3 gap-3">
                        {ordered.map((g) => (
                            <EngineCard key={g.engine} group={g} onSelect={onSelect} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
