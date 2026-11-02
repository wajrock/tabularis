import {Suspense, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {ThemeContext} from '@/contexts/ThemeContext';
import {themeRegistry} from '@/themes/themeRegistry';
import {useTranslation} from 'react-i18next';
import {invoke} from '@tauri-apps/api/core';
import {open as openFileDialog} from '@tauri-apps/plugin-dialog';
import {HexColorPicker, HexColorInput} from 'react-colorful';
import EmojiPicker, {
    Theme,
    EmojiStyle,
    SuggestionMode,
    SkinTonePickerLocation,
    Categories,
    type CategoryIcons,
    type EmojiClickData,
} from 'emoji-picker-react';
import clsx from 'clsx';
import {SearchBar} from '@/components/ui/SearchBar';
import {INPUT_CLASS} from '@/components/ui/Input';
import {Popover} from '@/components/ui/Popover';
import {SegmentedControl} from '@/components/ui/SegmentedControl';
import {
    Check,
    Sparkles,
    Grid3x3,
    Smile,
    Image as ImageIcon,
    Plus,
    Ban,
    Upload,
    Trash2,
    Clock,
    PawPrint,
    Coffee,
    Plane,
    Trophy,
    Lightbulb,
    Heart,
    Flag,
    SearchX,
} from 'lucide-react';
import type {ConnectionAppearance, IconOverride} from '@/contexts/DatabaseContext';
import {ALL_ICON_NAMES, getLucideIconComponent, camelToKebab} from '@/utils/connectionIconPack';
import {ConnectionIconImage} from '@/components/ConnectionIconImage';
import {PALETTE} from '@/components/modals/NewConnectionModal/appearance/palette';
import {
    loadEmojis,
    searchEmojis,
} from '@/components/modals/NewConnectionModal/appearance/emojiSearch';

type IconTab = 'default' | 'pack' | 'emoji' | 'image';

/** Shared frame of the icon pack grid and the emoji picker, under their search bar. */
const PICKER_PANEL_CLASS = 'overflow-hidden rounded-md border border-default bg-base';
/** Result grids grow with their content up to the emoji picker's height. */
const PICKER_RESULTS_CLASS = 'max-h-72';
// Cells of about 32 px: as many columns as fit, icons stay at 18 px.
const PICKER_GRID_CLASS =
    'grid grid-cols-[repeat(auto-fill,minmax(32px,1fr))] content-start gap-1 overflow-y-auto p-2';
const PICKER_CELL_CLASS =
    'aspect-square flex items-center justify-center rounded-md transition-colors';

/** Lucide icons for the emoji picker's category bar, instead of its own sprite. */
const EMOJI_CATEGORY_ICONS: CategoryIcons = {
    [Categories.SUGGESTED]: <Clock size={18} />,
    [Categories.SMILEYS_PEOPLE]: <Smile size={18} />,
    [Categories.ANIMALS_NATURE]: <PawPrint size={18} />,
    [Categories.FOOD_DRINK]: <Coffee size={18} />,
    [Categories.TRAVEL_PLACES]: <Plane size={18} />,
    [Categories.ACTIVITIES]: <Trophy size={18} />,
    [Categories.OBJECTS]: <Lightbulb size={18} />,
    [Categories.SYMBOLS]: <Heart size={18} />,
    [Categories.FLAGS]: <Flag size={18} />,
};

/** Shown in place of a result grid when the search matches nothing. */
function PickerNoResults({label}: {label: string}) {
    return (
        <div
            className={clsx(
                PICKER_PANEL_CLASS,
                'flex flex-col items-center gap-2 px-4 py-8 text-center',
            )}
        >
            <SearchX size={20} className="text-muted" aria-hidden="true" />
            <p className="text-sm text-muted">{label}</p>
        </div>
    );
}

/** 28 px colour circle; the selected one gets an accent ring, no scaling or shading. */
const SWATCH_CLASS =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-[opacity,color]';
const SWATCH_SELECTED_CLASS = 'ring-2 ring-accent-primary ring-offset-2 ring-offset-base';

const TAB_ICONS: Record<IconTab, typeof Sparkles> = {
    default: Sparkles,
    pack: Grid3x3,
    emoji: Smile,
    image: ImageIcon,
};

interface Props {
    value: ConnectionAppearance;
    onChange: (next: ConnectionAppearance) => void;
    connectionId: string;
    /**
     * Called after every successful image upload with the new relative path.
     * The parent uses this to track all session uploads for deferred cleanup.
     */
    onImageUploaded?: (path: string) => void;
}

export function AppearanceEditor({value, onChange, connectionId, onImageUploaded}: Props) {
    const {t} = useTranslation();
    // Optional: the editor also renders outside the app shell (tests).
    const themeContext = useContext(ThemeContext);
    const isDarkTheme = themeContext ? themeRegistry.isDarkTheme(themeContext.currentTheme) : false;

    // Derive the active tab from the icon type. userTab holds an explicit user
    // choice; it is reset to null whenever the icon type changes externally so
    // that re-opening an edited connection always lands on the right tab.
    const [userTab, setUserTab] = useState<IconTab | null>(null);
    const derivedTab: IconTab =
        value.icon?.type === 'pack'
            ? 'pack'
            : value.icon?.type === 'emoji'
              ? 'emoji'
              : value.icon?.type === 'image'
                ? 'image'
                : 'default';
    const tab = userTab ?? derivedTab;

    const prevIconTypeRef = useRef(value.icon?.type);
    useEffect(() => {
        if (value.icon?.type !== prevIconTypeRef.current) {
            prevIconTypeRef.current = value.icon?.type;
            setUserTab(null);
        }
    }, [value.icon?.type]);

    const [iconSearch, setIconSearch] = useState('');
    const [emojiSearch, setEmojiSearch] = useState('');
    const [emojiEntries, setEmojiEntries] = useState<Awaited<ReturnType<typeof loadEmojis>>>([]);
    useEffect(() => {
        if (!emojiSearch.trim() || emojiEntries.length > 0) return;
        let cancelled = false;
        void loadEmojis().then((entries) => {
            if (!cancelled) setEmojiEntries(entries);
        });
        return () => {
            cancelled = true;
        };
    }, [emojiSearch, emojiEntries.length]);
    const emojiResults = useMemo(
        () => searchEmojis(emojiEntries, emojiSearch),
        [emojiEntries, emojiSearch],
    );
    const [imageBusy, setImageBusy] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);

    function setAccent(c: string | undefined) {
        const next: ConnectionAppearance = {...value};
        if (c) next.accentColor = c;
        else delete next.accentColor;
        const isEmpty = !next.accentColor && !next.icon;
        onChange(isEmpty ? {} : next);
    }

    function setIcon(icon: IconOverride | undefined) {
        const next: ConnectionAppearance = {...value};
        if (icon) next.icon = icon;
        else delete next.icon;
        const isEmpty = !next.accentColor && !next.icon;
        onChange(isEmpty ? {} : next);
    }

    async function pickImage() {
        if (imageBusy) return;
        setImageError(null);
        setImageBusy(true);
        try {
            const picked = await openFileDialog({
                multiple: false,
                filters: [{name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg']}],
            }).catch((e: unknown) => {
                throw new Error(`Failed to open file dialog: ${e}`);
            });
            if (typeof picked !== 'string') return;
            let stored: string;
            try {
                stored = await invoke<string>('save_connection_icon', {
                    connectionId,
                    sourcePath: picked,
                });
            } catch (e) {
                throw new Error(`Failed to save icon: ${e}`);
            }
            // Deletion of the previous image is deferred to the parent (save or cancel).
            // This prevents data loss when the user picks multiple images then cancels.
            onImageUploaded?.(stored);
            setIcon({type: 'image', path: stored});
        } catch (e) {
            console.error('[AppearanceEditor] pickImage failed:', e);
            setImageError(String(e));
        } finally {
            setImageBusy(false);
        }
    }

    function removeImage() {
        // Deletion is deferred to the parent (save or cancel).
        setIcon(undefined);
    }

    const isCustomColor = !!value.accentColor && !PALETTE.includes(value.accentColor);

    return (
        <div className="space-y-5">
            {/* Accent color */}
            <div className="flex flex-col gap-2.5">
                <label className="text-xs font-medium text-secondary">
                    {t('connectionAppearance.accentColor')}
                </label>
                <div className="flex flex-wrap gap-2 items-center" role="group">
                    {/* No custom color: the driver's own color. Selected when none is set. */}
                    <button
                        type="button"
                        aria-label="reset color"
                        aria-pressed={!value.accentColor}
                        title={t('connectionAppearance.resetColor')}
                        onClick={() => setAccent(undefined)}
                        className={clsx(
                            SWATCH_CLASS,
                            'border border-strong bg-base text-muted hover:text-primary',
                            !value.accentColor && SWATCH_SELECTED_CLASS,
                        )}
                    >
                        <Ban size={14} />
                    </button>
                    {PALETTE.map((c) => {
                        const selected = value.accentColor === c;
                        return (
                            <button
                                key={c}
                                type="button"
                                aria-label={`color swatch ${c}`}
                                aria-pressed={selected}
                                onClick={() => setAccent(c)}
                                className={clsx(
                                    SWATCH_CLASS,
                                    'hover:opacity-85',
                                    selected && SWATCH_SELECTED_CLASS,
                                )}
                                style={{background: c}}
                            >
                                {selected && (
                                    <Check size={14} strokeWidth={3} className="text-white" />
                                )}
                            </button>
                        );
                    })}
                    <Popover
                        label={t('connectionAppearance.customColor')}
                        trigger={(props) => (
                            <button
                                {...props}
                                type="button"
                                aria-label="custom color"
                                title={t('connectionAppearance.customColor')}
                                className={clsx(
                                    SWATCH_CLASS,
                                    isCustomColor
                                        ? SWATCH_SELECTED_CLASS
                                        : 'border border-dashed border-strong text-muted hover:text-primary',
                                )}
                                style={isCustomColor ? {background: value.accentColor} : undefined}
                            >
                                {isCustomColor ? (
                                    <Check size={14} strokeWidth={3} className="text-white" />
                                ) : (
                                    <Plus size={14} strokeWidth={2.5} />
                                )}
                            </button>
                        )}
                    >
                        <div className="space-y-3">
                            <HexColorPicker
                                color={value.accentColor ?? '#64748b'}
                                onChange={(c) => setAccent(c.toLowerCase())}
                                style={{width: 220, height: 150}}
                            />
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-7 h-7 rounded-md shrink-0 ring-1 ring-primary/10 shadow-inner"
                                    style={{background: value.accentColor ?? '#64748b'}}
                                />
                                <span className="text-muted text-sm font-mono">#</span>
                                <HexColorInput
                                    color={value.accentColor ?? ''}
                                    onChange={(c) => setAccent(c ? c.toLowerCase() : undefined)}
                                    placeholder="rrggbb"
                                    prefixed={false}
                                    aria-label="custom hex input"
                                    className={clsx(INPUT_CLASS, 'w-28 font-mono uppercase')}
                                />
                            </div>
                        </div>
                    </Popover>
                </div>
            </div>

            {/* Icon */}
            <div className="flex flex-col gap-2.5">
                <label className="text-xs font-medium text-secondary">
                    {t('connectionAppearance.icon')}
                </label>

                <SegmentedControl
                    ariaLabel={t('connectionAppearance.icon')}
                    value={tab}
                    onChange={(k) => {
                        setUserTab(k);
                        // Switching to "default" is the act of clearing the override.
                        if (k === 'default' && value.icon) setIcon(undefined);
                    }}
                    options={(['default', 'pack', 'emoji', 'image'] as IconTab[]).map((k) => ({
                        value: k,
                        icon: TAB_ICONS[k],
                        label: t(`connectionAppearance.tabs.${k}`),
                    }))}
                />

                {tab === 'default' && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-dashed border-default bg-base">
                        <Sparkles size={14} className="text-muted shrink-0" />
                        <p className="text-xs text-muted">
                            {t('connectionAppearance.defaultHint', {
                                defaultValue: "Using the driver's default icon.",
                            })}
                        </p>
                    </div>
                )}

                {tab === 'pack' && (
                    <div className="space-y-2">
                        <SearchBar
                            value={iconSearch}
                            onChange={setIconSearch}
                            placeholder={t('connectionAppearance.iconSearch', {
                                defaultValue: 'Search icons…',
                            })}
                            aria-label="icon search"
                        />
                        {(() => {
                            const q = iconSearch.toLowerCase().trim();
                            const all =
                                q === ''
                                    ? ALL_ICON_NAMES
                                    : ALL_ICON_NAMES.filter((n) => n.includes(q));
                            const RESULT_LIMIT = 120;
                            const shown = all.slice(0, RESULT_LIMIT);
                            return (
                                <>
                                    {all.length === 0 ? (
                                        <PickerNoResults
                                            label={t('connectionAppearance.iconNoResults', {
                                                defaultValue: 'No icons match “{{query}}”.',
                                                query: iconSearch.trim(),
                                            })}
                                        />
                                    ) : (
                                        <div
                                            className={clsx(
                                                PICKER_PANEL_CLASS,
                                                PICKER_RESULTS_CLASS,
                                                PICKER_GRID_CLASS,
                                            )}
                                        >
                                            {shown.map((id) => {
                                                const Cmp = getLucideIconComponent(id);
                                                if (!Cmp) return null;
                                                const selected =
                                                    value.icon?.type === 'pack' &&
                                                    (value.icon.id === id ||
                                                        camelToKebab(value.icon.id) === id);
                                                return (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        aria-label={`pick-${id}`}
                                                        aria-pressed={selected}
                                                        title={id}
                                                        onClick={() => setIcon({type: 'pack', id})}
                                                        className={clsx(
                                                            PICKER_CELL_CLASS,
                                                            selected
                                                                ? 'bg-tint-accent-bg text-tint-accent-fg'
                                                                : 'text-secondary hover:bg-surface-hover hover:text-primary',
                                                        )}
                                                    >
                                                        <Suspense
                                                            fallback={
                                                                <div className="w-[18px] h-[18px]" />
                                                            }
                                                        >
                                                            <Cmp size={18} />
                                                        </Suspense>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {all.length > RESULT_LIMIT && (
                                        <div className="text-xs text-muted">
                                            {t('connectionAppearance.iconResultsTruncated', {
                                                defaultValue:
                                                    'Showing {{shown}} of {{total}} — refine search to narrow down.',
                                                shown: RESULT_LIMIT,
                                                total: all.length,
                                            })}
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {tab === 'emoji' && (
                    <div className="space-y-2">
                        <SearchBar
                            value={emojiSearch}
                            onChange={setEmojiSearch}
                            placeholder={t('connectionAppearance.emojiSearch', {
                                defaultValue: 'Search emoji…',
                            })}
                            aria-label="emoji search"
                        />
                        {emojiSearch.trim() ? (
                            emojiEntries.length === 0 ? null : emojiResults.length === 0 ? (
                                <PickerNoResults
                                    label={t('connectionAppearance.emojiNoResults', {
                                        defaultValue: 'No emoji match “{{query}}”.',
                                        query: emojiSearch.trim(),
                                    })}
                                />
                            ) : (
                                <div
                                    className={clsx(
                                        PICKER_PANEL_CLASS,
                                        PICKER_RESULTS_CLASS,
                                        PICKER_GRID_CLASS,
                                    )}
                                >
                                    {emojiResults.map(({emoji, name}) => {
                                        const selected =
                                            value.icon?.type === 'emoji' &&
                                            value.icon.value === emoji;
                                        return (
                                            <button
                                                key={emoji}
                                                type="button"
                                                aria-label={`pick-emoji-${name}`}
                                                aria-pressed={selected}
                                                title={name}
                                                onClick={() =>
                                                    setIcon({type: 'emoji', value: emoji})
                                                }
                                                className={clsx(
                                                    PICKER_CELL_CLASS,
                                                    'text-xl',
                                                    selected
                                                        ? 'bg-tint-accent-bg'
                                                        : 'hover:bg-surface-hover',
                                                )}
                                            >
                                                {emoji}
                                            </button>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            <div className={clsx(PICKER_PANEL_CLASS, 'h-72 emoji-picker-wrap')}>
                                <EmojiPicker
                                    theme={isDarkTheme ? Theme.DARK : Theme.LIGHT}
                                    emojiStyle={EmojiStyle.NATIVE}
                                    width="100%"
                                    height="100%"
                                    searchDisabled
                                    categoryIcons={EMOJI_CATEGORY_ICONS}
                                    suggestedEmojisMode={SuggestionMode.RECENT}
                                    skinTonePickerLocation={SkinTonePickerLocation.PREVIEW}
                                    previewConfig={{showPreview: false}}
                                    lazyLoadEmojis
                                    onEmojiClick={(data: EmojiClickData) =>
                                        setIcon({type: 'emoji', value: data.emoji})
                                    }
                                />
                            </div>
                        )}
                    </div>
                )}

                {tab === 'image' && (
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-md border border-default bg-base">
                            {value.icon?.type === 'image' ? (
                                <ConnectionIconImage
                                    path={value.icon.path}
                                    size={64}
                                    fallback={
                                        <div className="w-16 h-16 bg-elevated border border-strong rounded-md flex items-center justify-center text-muted text-[10px] text-center px-1">
                                            {t('connectionAppearance.noPreview', {
                                                defaultValue: 'No preview',
                                            })}
                                        </div>
                                    }
                                />
                            ) : (
                                <div className="w-16 h-16 bg-elevated border border-dashed border-strong rounded-md flex items-center justify-center text-muted shrink-0">
                                    <ImageIcon size={22} />
                                </div>
                            )}
                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                                <p className="text-xs text-muted leading-snug">
                                    {t('connectionAppearance.imageHint')}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        aria-label="choose image"
                                        disabled={imageBusy}
                                        onClick={pickImage}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-elevated hover:bg-surface-secondary border border-strong rounded-md text-xs font-medium text-secondary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Upload size={12} />
                                        <span>{t('connectionAppearance.chooseImage')}</span>
                                    </button>
                                    {value.icon?.type === 'image' && (
                                        <button
                                            type="button"
                                            aria-label="remove image"
                                            onClick={removeImage}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-error hover:bg-accent-error/10 rounded-md transition-colors"
                                        >
                                            <Trash2 size={12} />
                                            <span>{t('connectionAppearance.removeImage')}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {imageError && (
                            <div
                                role="alert"
                                className="text-xs text-accent-error flex items-center gap-1"
                            >
                                {imageError}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
