import {describe, expect, it} from 'vitest';
import {
    codePointsToEmoji,
    searchEmojis,
} from '@/components/modals/NewConnectionModal/appearance/emojiSearch';

const ENTRIES = [
    {n: ['face', 'grin', 'grinning face'], u: '1f600'},
    {n: ['elephant'], u: '1f418'},
    {n: ['technologist', 'man technologist'], u: '1f468-200d-1f4bb'},
];

describe('codePointsToEmoji', () => {
    it('joins multi code point sequences', () => {
        expect(codePointsToEmoji('1f468-200d-1f4bb')).toBe('👨‍💻');
    });
});

describe('searchEmojis', () => {
    it('matches any keyword, case-insensitive, and names by the full name', () => {
        expect(searchEmojis(ENTRIES, ' GRIN ')).toEqual([{emoji: '😀', name: 'grinning face'}]);
    });

    it('returns nothing for an empty query', () => {
        expect(searchEmojis(ENTRIES, '  ')).toEqual([]);
    });
});
