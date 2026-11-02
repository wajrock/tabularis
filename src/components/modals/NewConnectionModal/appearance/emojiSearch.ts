interface EmojiEntry {
    /** Search keywords, the last one is the full name. */
    n: string[];
    /** Code points in hex, joined by dashes. */
    u: string;
}

export interface EmojiMatch {
    emoji: string;
    name: string;
}

let cache: Promise<EmojiEntry[]> | null = null;

/** Emoji list of emoji-picker-react, loaded on first search only. */
export function loadEmojis(): Promise<EmojiEntry[]> {
    cache ??= import('emoji-picker-react/dist/data/emojis.json').then((m) =>
        Object.values((m.default as {emojis: Record<string, EmojiEntry[]>}).emojis).flat(),
    );
    return cache;
}

export function codePointsToEmoji(unified: string): string {
    return String.fromCodePoint(...unified.split('-').map((hex) => parseInt(hex, 16)));
}

/** Emojis whose keywords contain the query (case-insensitive). */
export function searchEmojis(entries: EmojiEntry[], query: string): EmojiMatch[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return entries
        .filter((e) => e.n.some((name) => name.includes(q)))
        .map((e) => ({emoji: codePointsToEmoji(e.u), name: e.n[e.n.length - 1]}));
}
