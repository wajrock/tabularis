import type {ConnectionTag} from '@/types/tags';

interface TagChipsProps {
    /** Tag ids attached to the connection; unknown ids are skipped. */
    tagIds?: string[];
    /** All known tags, used to resolve ids to names/colors. */
    tags: ConnectionTag[];
}

/** Colored tag chips shown on connection cards and list rows. */
export const TagChips = ({tagIds, tags}: TagChipsProps) => {
    if (!tagIds?.length || tags.length === 0) return null;
    const resolved = tagIds
        .map((id) => tags.find((t) => t.id === id))
        .filter((t): t is ConnectionTag => t !== undefined);
    if (resolved.length === 0) return null;

    return (
        <>
            {resolved.map((tag) => (
                <span
                    key={tag.id}
                    className="flex h-5 max-w-28 items-center gap-1 rounded-md px-[7px] text-[11px] font-medium"
                    style={{color: tag.color, backgroundColor: `${tag.color}1a`}}
                >
                    <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{backgroundColor: tag.color}}
                    />
                    <span className="truncate">{tag.name}</span>
                </span>
            ))}
        </>
    );
};
