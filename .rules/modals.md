# Modal Rules

Every modal goes through the shared `Modal` (`src/components/ui/Modal.tsx`) and the shared `Button`. Colors, radii and fonts follow the theme tokens in [DESIGN.md](../docs/DESIGN.md) and [design.md](./design.md).

## File Location

- `src/components/modals/*.tsx` for standalone modals.
- Shared building blocks live in `src/components/ui/` (`Modal`, `Button`, `IconButton`, `SearchBar`…). Never copy the overlay, the panel or the header markup into a modal.

## Structure

```tsx
interface XxxModalProps {
    isOpen: boolean;
    onClose: () => void;
    // ...specific props
}

export const XxxModal = ({isOpen, onClose}: XxxModalProps) => {
    const {t} = useTranslation();
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('xxx.title')}
            size="md"
            footer={
                <>
                    <Button variant="outline" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSave}>{t('common.save')}</Button>
                </>
            }
        >
            {/* body: scrolls, 24 px padding */}
        </Modal>
    );
};
```

- **Header**: the title only (16/24 semibold), no icon, no subtitle. `headerActions` holds extra controls next to the close button (e.g. steps). The close button is built in.
- **Body**: the children; it scrolls, with 24 px padding (`bodyClassName` to adjust spacing).
- **Footer**: `footer` for the buttons, aligned right; `footerStart` for a secondary action on the left (e.g. Copy).
- **Size**: `sm` 440 px, `md` 600 px (default), `lg` 860 px; `className` for a fixed height.

## Buttons

Use `Button` from `src/components/ui/Button.tsx`, never hand-written button classes:

| Role | Variant |
|---|---|
| Main action | `primary` (default) |
| Cancel, secondary action | `outline` |
| Destructive action (delete, drop) | `danger` |
| Low-emphasis action | `ghost` |

A busy action shows a `Loader2` as its `icon` and is `disabled`.

## Behavior (built into `Modal`)

- Backdrop `#0F172A` at 50 % (`bg-backdrop`), no blur.
- Closes on Escape and on a click outside; pass `closeOnBackdrop={false}` only when losing the content would hurt (long forms with unsaved input).
- `busy` blocks every way of closing while an action runs.
- `zIndex` stacks a modal above another one; `placement="top"` hangs palettes from the top.
- The dialog has `role="dialog"`, `aria-modal` and is labelled by its title; `describedBy` points to the main message.

## Content

- Labels, inputs and other form controls use the shared components when they exist (`SearchBar`…).
- All user-facing text goes through `useTranslation()`.
- Show inline errors in the body; use `useAlert` for notifications.
