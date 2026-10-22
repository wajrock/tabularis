import {lazy, Suspense, useCallback, useEffect, useRef, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {BookOpen, Clock, Layers, PanelLeft, Star} from 'lucide-react';
import {useDatabase} from '@/hooks/useDatabase';
import {useConnectionLayoutContext} from '@/hooks/useConnectionLayoutContext';
import {useSidebarResize} from '@/hooks/useSidebarResize';
import {LoadingState} from '@/components/ui/LoadingState';
import {PanelDatabaseProvider} from '@/components/layout/PanelDatabaseProvider';
import type {SidebarTab} from '@/components/layout/ExplorerSidebar';

const ExplorerSidebar = lazy(() =>
    import('@/components/layout/ExplorerSidebar').then((module) => ({
        default: module.ExplorerSidebar,
    })),
);

/** Database explorer next to the navigation, shown in the editor only. */
export function ExplorerPanel() {
    const {t} = useTranslation();
    const {pathname} = useLocation();
    const {activeConnectionId} = useDatabase();
    const {isSplitVisible, splitView, explorerConnectionId} = useConnectionLayoutContext();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [tab, setTab] = useState<SidebarTab>('structure');
    const panelRef = useRef<HTMLDivElement>(null);
    const collapse = useCallback(() => setIsCollapsed(true), []);
    const getLeftEdge = useCallback(() => panelRef.current?.getBoundingClientRect().left ?? 0, []);
    const {sidebarWidth, startResize} = useSidebarResize(collapse, getLeftEdge);

    useEffect(() => {
        const handler = () => setIsCollapsed((prev) => !prev);
        window.addEventListener('tabularis:toggle-sidebar', handler);
        return () => window.removeEventListener('tabularis:toggle-sidebar', handler);
    }, []);

    const connectionId = splitView && isSplitVisible ? explorerConnectionId : activeConnectionId;
    if (!connectionId || pathname !== '/editor') return null;

    if (isCollapsed) {
        // Icon strip: redesigned with the editor.
        const tabs = [
            {id: 'structure' as SidebarTab, icon: Layers, label: t('sidebar.structure')},
            {id: 'favorites' as SidebarTab, icon: Star, label: t('sidebar.favorites')},
            {id: 'history' as SidebarTab, icon: Clock, label: t('sidebar.queryHistory')},
            {id: 'notebooks' as SidebarTab, icon: BookOpen, label: t('sidebar.notebooks.tab')},
        ];
        return (
            <div className="w-12 bg-base border-r border-default flex flex-col items-center py-2 gap-1">
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="text-muted hover:text-secondary hover:bg-surface-secondary rounded-lg p-2 transition-colors group relative"
                    title={t('sidebar.expandExplorer')}
                >
                    <PanelLeft size={18} />
                </button>
                <div className="w-6 h-px bg-default my-1" />
                {tabs.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            setTab(item.id);
                            setIsCollapsed(false);
                        }}
                        className={clsx(
                            'rounded-lg p-2 transition-colors',
                            tab === item.id
                                ? 'text-accent bg-accent-primary/10'
                                : 'text-muted hover:text-secondary hover:bg-surface-secondary',
                        )}
                        title={item.label}
                    >
                        <item.icon size={16} />
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div ref={panelRef} className="flex h-full">
            <PanelDatabaseProvider connectionId={connectionId}>
                <Suspense
                    fallback={
                        <div style={{width: sidebarWidth}}>
                            <LoadingState />
                        </div>
                    }
                >
                    <ExplorerSidebar
                        sidebarWidth={sidebarWidth}
                        startResize={startResize}
                        onCollapse={collapse}
                        sidebarTab={tab}
                        onSidebarTabChange={setTab}
                    />
                </Suspense>
            </PanelDatabaseProvider>
        </div>
    );
}
