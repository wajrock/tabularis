import clsx from 'clsx';

interface TreeElbowProps {
    /** Last child: no line continues below the elbow. */
    isLast: boolean;
    /** Left offset (px) of the branch, for nested rows. */
    indent?: number;
}

/** Left space kept free for the tree lines: row highlights start after it. */
export const TREE_GUTTER = 24;

/**
 * Tree line hanging from the parent row: a 12 px arm with an 8 px rounded corner.
 * It starts 6 px above the row to bridge the list gap.
 */
export function TreeElbow({isLast, indent = 0}: TreeElbowProps) {
    const left = 9 + indent;
    return (
        <>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-1.5 h-[calc(50%+6px)] w-3 rounded-bl-lg border-b border-l border-strong"
                style={{left}}
            />
            <span
                aria-hidden="true"
                className={clsx(
                    'pointer-events-none absolute -top-1.5 bottom-0 border-l border-strong',
                    isLast && 'hidden',
                )}
                style={{left}}
            />
        </>
    );
}
