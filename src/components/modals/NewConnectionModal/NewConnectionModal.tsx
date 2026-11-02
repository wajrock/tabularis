import {type ElementType, type ReactNode} from 'react';
import {
    Check,
    AlertCircle,
    ArrowLeftRight,
    Loader2,
    Database,
    XCircle,
    Square,
    Plug,
    ShieldCheck,
    Settings2,
    Lock,
    KeyRound,
    Boxes,
    Cloud,
    Palette,
    EyeOff,
    SlidersHorizontal,
} from 'lucide-react';
import clsx from 'clsx';
import {Button} from '@/components/ui/Button';
import {Modal} from '@/components/ui/Modal';
import {Steps} from '@/components/ui/Steps';
import {Badge} from '@/components/ui/Badge';
import {FOCUS_RING_INSET} from '@/components/ui/focusRing';
import {ConnectionDiagnosticsModal} from '@/components/modals/connection/ConnectionDiagnosticsModal';
import {testStepLabelKey} from '@/utils/connectionTest';
import {ConnectionCatalogue} from '@/components/modals/connection/ConnectionCatalogue';
import {DriverVersionPicker} from '@/components/modals/connection/DriverVersionPicker';
import {InstallGate} from '@/components/modals/connection/InstallGate';
import {useTranslation} from 'react-i18next';
import {getConnectionIcon} from '@/utils/driverUI';
import {
    type NewConnectionModalProps,
    paradigmAccent,
} from '@/components/modals/NewConnectionModal/types';
import {useConnectionForm} from '@/components/modals/NewConnectionModal/hooks/useConnectionForm';
import {ConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';
import {GeneralSection} from '@/components/modals/NewConnectionModal/sections/GeneralSection';
import {AppearanceSection} from '@/components/modals/NewConnectionModal/sections/AppearanceSection';
import {PrivacySection} from '@/components/modals/NewConnectionModal/sections/PrivacySection';
import {AdvancedSection} from '@/components/modals/NewConnectionModal/sections/AdvancedSection';
import {DatabasesSection} from '@/components/modals/NewConnectionModal/sections/DatabasesSection';
import {SslSection} from '@/components/modals/NewConnectionModal/sections/SslSection';
import {SshSection} from '@/components/modals/NewConnectionModal/sections/SshSection';
import {AwsSsmSection} from '@/components/modals/NewConnectionModal/sections/AwsSsmSection';
import {KubernetesSection} from '@/components/modals/NewConnectionModal/sections/KubernetesSection';

export const NewConnectionModal = (props: NewConnectionModalProps) => {
    const {t} = useTranslation();
    const form = useConnectionForm(props);
    const {
        isOpen,
        isEditing,
        step,
        setStep,
        pendingGroup,
        setPendingGroup,
        catalogue,
        driver,
        activeDriver,
        installStatus,
        installError,
        installDriver,
        activeCatalogueDriver,
        activeDriverNotInstalled,
        driverAccent,
        renderDriverGlyph,
        selectedDatabasesState,
        loadAllDatabases,
        activeTab,
        setActiveTab,
        sshTestError,
        sshTestLog,
        isSshDiagnosticsOpen,
        setIsSshDiagnosticsOpen,
        sshTabError,
        status,
        message,
        errorFeedback,
        testLog,
        isDiagnosticsOpen,
        setIsDiagnosticsOpen,
        testResult,
        isActionPending,
        isPersistencePending,
        databasesTabError,
        isNetworkDriver,
        isOptedInMultiDb,
        handleClose,
        goToForm,
        handleEngineSelect,
        testConnection,
        cancelTest,
        liveTestStep,
        saveConnection,
        appearance,
    } = form;

    type Section = {
        id: typeof activeTab;
        label: string;
        icon: ElementType;
        indicator?: ReactNode;
    };
    const errorDot = (
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-error" />
    );
    const sectionGroups: {id: string; label: string; sections: Section[]}[] = [
        {
            id: 'connection',
            label: t('newConnection.sectionGroups.connection'),
            sections: [
                {
                    id: 'general',
                    icon: Settings2,
                    label: t('newConnection.general', {defaultValue: 'General'}),
                },
                ...(isOptedInMultiDb
                    ? [
                          {
                              id: 'databases' as const,
                              icon: Database,
                              label: t('newConnection.selectDatabases'),
                              indicator:
                                  databasesTabError && selectedDatabasesState.length === 0 ? (
                                      errorDot
                                  ) : !loadAllDatabases && selectedDatabasesState.length > 0 ? (
                                      <Badge tone="accent">{selectedDatabasesState.length}</Badge>
                                  ) : undefined,
                          },
                      ]
                    : []),
            ],
        },
        {
            id: 'network',
            label: t('newConnection.sectionGroups.network'),
            sections: isNetworkDriver
                ? [
                      ...(activeDriver?.capabilities?.supports_ssl
                          ? [{id: 'ssl' as const, icon: Lock, label: 'SSL'}]
                          : []),
                      {
                          id: 'ssh',
                          icon: KeyRound,
                          label: 'SSH',
                          indicator: sshTabError ? errorDot : undefined,
                      },
                      {id: 'k8s', icon: Boxes, label: 'Kubernetes'},
                      {id: 'ssm', icon: Cloud, label: 'AWS SSM'},
                  ]
                : [],
        },
        {
            id: 'more',
            label: t('newConnection.sectionGroups.more'),
            sections: [
                {
                    id: 'appearance',
                    icon: Palette,
                    label: t('newConnection.appearance', {defaultValue: 'Appearance'}),
                },
                // Masking overrides are keyed by the saved connection id,
                // so the Privacy section only exists when editing.
                ...(isEditing
                    ? [{id: 'privacy' as const, icon: EyeOff, label: t('settings.privacy')}]
                    : []),
                {
                    id: 'advanced',
                    icon: SlidersHorizontal,
                    label: t('newConnection.advanced', {defaultValue: 'Advanced'}),
                },
            ],
        },
    ];

    const title =
        step === 'catalogue'
            ? pendingGroup
                ? t('newConnection.selectDriverTitle', {defaultValue: 'Select a driver'})
                : t('newConnection.chooseTitle', {defaultValue: 'Choose a database'})
            : activeDriverNotInstalled
              ? t('connectionCatalogue.installTitle', {defaultValue: 'Install driver'})
              : isEditing
                ? t('newConnection.titleEdit')
                : t('newConnection.titleNew');
    const showFormFooter = step === 'form' && !activeDriverNotInstalled;

    return (
        <ConnectionFormContext.Provider value={form}>
            <Modal
                isOpen={isOpen}
                onClose={handleClose}
                title={title}
                size="lg"
                className="h-[min(760px,90vh)]"
                // The form step keeps the modal padding; the catalogue and install gate lay out their own.
                bodyClassName={clsx('flex flex-col', !showFormFooter && 'p-0')}
                busy={isPersistencePending}
                headerActions={
                    !isEditing && (
                        <Steps
                            labels={[
                                t('newConnection.stepChoose', {defaultValue: 'Choose'}),
                                t('newConnection.stepConfigure', {defaultValue: 'Configure'}),
                            ]}
                            current={step === 'catalogue' ? 0 : 1}
                            onStepClick={
                                isPersistencePending ? undefined : () => setStep('catalogue')
                            }
                        />
                    )
                }
                footerStart={
                    showFormFooter && (
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            {/* Test button */}
                            <button
                                onClick={testConnection}
                                disabled={
                                    isPersistencePending ||
                                    isActionPending ||
                                    status === 'testing' ||
                                    status === 'saving'
                                }
                                className={clsx(
                                    'flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors disabled:opacity-50',
                                    testResult === 'success'
                                        ? 'border-accent-success/50 bg-accent-success/10 text-accent-success'
                                        : testResult === 'error'
                                          ? 'border-accent-error/50 bg-accent-error/10 text-accent-error'
                                          : 'border-strong bg-elevated text-secondary hover:text-primary hover:bg-surface-secondary',
                                )}
                            >
                                {status === 'testing' ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : testResult === 'success' ? (
                                    <Check size={14} />
                                ) : testResult === 'error' ? (
                                    <XCircle size={14} />
                                ) : (
                                    <Plug size={14} />
                                )}
                                {t('newConnection.testConnection')}
                            </button>

                            {/* Stop button (only while a test is running) */}
                            {status === 'testing' && (
                                <button
                                    type="button"
                                    onClick={cancelTest}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-strong bg-elevated text-sm font-medium text-secondary hover:text-accent-error hover:border-accent-error/50 transition-colors"
                                >
                                    <Square size={11} />
                                    {t('newConnection.stopTest')}
                                </button>
                            )}

                            {/* Compact error / live progress / status message */}
                            {errorFeedback ? (
                                <div
                                    role="alert"
                                    className="flex-1 min-w-0 flex items-center gap-2 text-xs text-accent-error"
                                >
                                    <AlertCircle size={13} className="shrink-0" />
                                    <span className="truncate">{t(errorFeedback.summaryKey)}</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsDiagnosticsOpen(true)}
                                        className="shrink-0 underline underline-offset-2 hover:text-accent-error transition-colors"
                                    >
                                        {t('common.showDetails')}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                    <p
                                        aria-live="polite"
                                        aria-atomic="true"
                                        className={clsx(
                                            'flex-1 min-w-0 text-xs truncate',
                                            testResult === 'success'
                                                ? 'text-accent-success'
                                                : status === 'testing'
                                                  ? 'text-secondary'
                                                  : 'text-accent-error',
                                        )}
                                    >
                                        {status === 'testing' && liveTestStep
                                            ? `${t(testStepLabelKey(liveTestStep), {
                                                  defaultValue: liveTestStep.step,
                                              })}${liveTestStep.detail ? ` (${liveTestStep.detail})` : ''}`
                                            : (message ?? '')}
                                    </p>
                                    {status !== 'testing' && testLog.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setIsDiagnosticsOpen(true)}
                                            className="shrink-0 text-xs text-muted hover:text-secondary underline underline-offset-2 transition-colors"
                                        >
                                            {t('connectionTest.showLog')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                }
                footer={
                    showFormFooter && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                disabled={isPersistencePending}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                onClick={saveConnection}
                                disabled={
                                    isPersistencePending || isActionPending || status === 'saving'
                                }
                                icon={
                                    status === 'saving' ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : undefined
                                }
                            >
                                {t('newConnection.save')}
                            </Button>
                        </>
                    )
                }
            >
                <fieldset
                    disabled={isPersistencePending}
                    aria-busy={isPersistencePending}
                    className={clsx(
                        'm-0 flex min-h-0 min-w-0 flex-1 flex-col border-0 p-0',
                        isPersistencePending && 'pointer-events-none',
                    )}
                >
                    {step === 'catalogue' ? (
                        pendingGroup ? (
                            <DriverVersionPicker
                                group={pendingGroup}
                                onChoose={(d) => goToForm(d)}
                                onBack={() => setPendingGroup(null)}
                            />
                        ) : (
                            <ConnectionCatalogue
                                groups={catalogue.groups}
                                facets={catalogue.facets}
                                loading={catalogue.loading}
                                registryOffline={catalogue.registryOffline}
                                onSelect={handleEngineSelect}
                            />
                        )
                    ) : activeDriverNotInstalled && activeCatalogueDriver ? (
                        /* ── install gate: selected driver isn't installed yet ── */
                        <InstallGate
                            driver={activeCatalogueDriver}
                            status={installStatus}
                            error={installError}
                            onInstall={(slug, version) => void installDriver(slug, version)}
                            onBack={() => setStep('catalogue')}
                        />
                    ) : (
                        /* ── form step: driver identity header + tabbed form ── */
                        <div className="flex flex-1 min-h-0 flex-col">
                            {/* Driver identity header */}
                            <div className="flex items-center gap-3 pb-6">
                                {/* Shows the Appearance choices live: custom color and icon. */}
                                <span
                                    className={clsx(
                                        'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg',
                                        appearance.accentColor && 'text-white',
                                    )}
                                    style={
                                        appearance.accentColor
                                            ? {backgroundColor: appearance.accentColor}
                                            : {
                                                  backgroundColor: `${driverAccent}1f`,
                                                  color: driverAccent,
                                              }
                                    }
                                >
                                    {appearance.icon
                                        ? getConnectionIcon({appearance}, activeDriver, 22)
                                        : renderDriverGlyph(22)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="truncate text-sm font-semibold capitalize text-primary">
                                            {activeDriver?.name ?? driver}
                                        </h3>
                                        {activeCatalogueDriver?.verified && (
                                            <span
                                                className="flex items-center text-accent"
                                                title="Verified"
                                            >
                                                <ShieldCheck size={14} />
                                                <span className="sr-only">Verified</span>
                                            </span>
                                        )}
                                        {activeDriver && activeDriver.is_builtin !== true && (
                                            <span className="rounded-full bg-surface-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted">
                                                v{activeDriver.version}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        {(activeCatalogueDriver?.paradigms ?? []).map((p) => (
                                            <span
                                                key={p}
                                                className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                                                style={{
                                                    backgroundColor: `${paradigmAccent(p)}1f`,
                                                    color: paradigmAccent(p),
                                                }}
                                            >
                                                {p}
                                            </span>
                                        ))}
                                        {activeDriver?.description && (
                                            <span className="truncate text-[11px] text-muted">
                                                {activeDriver.description}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {/* Back to the database choice (new connections only). */}
                                {!isEditing && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={<ArrowLeftRight size={14} />}
                                        onClick={() => setStep('catalogue')}
                                        disabled={isPersistencePending}
                                    >
                                        {t('newConnection.changeDatabase', {
                                            defaultValue: 'Change database',
                                        })}
                                    </Button>
                                )}
                            </div>

                            {/* Sections (left) and the selected section (right) */}
                            <div className="flex min-h-0 flex-1">
                                <nav
                                    aria-label={t('newConnection.sections')}
                                    className="flex w-[180px] shrink-0 flex-col overflow-y-auto border-r border-default pr-2.5"
                                >
                                    {sectionGroups.map(
                                        (group, index) =>
                                            group.sections.length > 0 && (
                                                <div
                                                    key={group.id}
                                                    className="flex flex-col gap-0.5"
                                                >
                                                    <h3
                                                        className={clsx(
                                                            'px-2.5 pb-1 text-xs font-medium text-muted/70',
                                                            // Only later groups need the gap above their title.
                                                            index === 0 ? 'pt-0' : 'pt-3',
                                                        )}
                                                    >
                                                        {group.label}
                                                    </h3>
                                                    {group.sections.map((section) => (
                                                        <button
                                                            key={section.id}
                                                            type="button"
                                                            aria-current={
                                                                activeTab === section.id
                                                                    ? 'page'
                                                                    : undefined
                                                            }
                                                            onClick={() => setActiveTab(section.id)}
                                                            className={clsx(
                                                                'flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm font-medium transition-colors',
                                                                FOCUS_RING_INSET,
                                                                activeTab === section.id
                                                                    ? 'bg-surface-secondary text-primary'
                                                                    : 'text-secondary hover:bg-surface-hover hover:text-primary',
                                                            )}
                                                        >
                                                            <section.icon
                                                                size={16}
                                                                className="shrink-0"
                                                            />
                                                            <span className="min-w-0 flex-1 truncate">
                                                                {section.label}
                                                            </span>
                                                            {section.indicator}
                                                        </button>
                                                    ))}
                                                </div>
                                            ),
                                    )}
                                </nav>
                                <div className="min-w-0 flex-1 overflow-y-auto pl-5">
                                    {activeTab === 'general' ? (
                                        <GeneralSection />
                                    ) : activeTab === 'databases' ? (
                                        <DatabasesSection />
                                    ) : activeTab === 'ssl' ? (
                                        <SslSection />
                                    ) : activeTab === 'k8s' ? (
                                        <KubernetesSection />
                                    ) : activeTab === 'ssm' ? (
                                        <AwsSsmSection />
                                    ) : activeTab === 'ssh' ? (
                                        <SshSection />
                                    ) : activeTab === 'advanced' ? (
                                        <AdvancedSection />
                                    ) : activeTab === 'privacy' ? (
                                        <PrivacySection />
                                    ) : (
                                        <AppearanceSection />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </fieldset>

                <ConnectionDiagnosticsModal
                    isOpen={isDiagnosticsOpen}
                    onClose={() => setIsDiagnosticsOpen(false)}
                    error={errorFeedback}
                    log={testLog}
                />
                <ConnectionDiagnosticsModal
                    isOpen={isSshDiagnosticsOpen}
                    onClose={() => setIsSshDiagnosticsOpen(false)}
                    error={sshTestError}
                    log={sshTestLog}
                />
            </Modal>
        </ConnectionFormContext.Provider>
    );
};
