interface RowState {
    /** Picked with Ctrl/Cmd-click for a split view. */
    isSelected?: boolean;
    /** Shown in the editor right now. */
    isCurrent: boolean;
}

/** Background of a navigation row: selected, current view, or hover only. */
export const rowStateClass = ({isSelected = false, isCurrent}: RowState) =>
    isSelected
        ? 'bg-tint-accent-bg'
        : isCurrent
          ? 'bg-surface-secondary'
          : 'hover:bg-surface-hover';
