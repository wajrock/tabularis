import {AppearanceEditor} from '@/components/modals/NewConnectionModal/appearance/AppearanceEditor';
import {TagSelector} from '@/components/modals/NewConnectionModal/fields/TagSelector';
import {useConnectionFormContext} from '@/components/modals/NewConnectionModal/ConnectionFormContext';

export function AppearanceSection() {
    const {
        appearance,
        setAppearance,
        tagIds,
        setTagIds,
        effectiveConnectionId,
        handleImageUploaded,
    } = useConnectionFormContext();
    return (
        <div className="space-y-5">
            <AppearanceEditor
                value={appearance}
                onChange={setAppearance}
                connectionId={effectiveConnectionId}
                onImageUploaded={handleImageUploaded}
            />
            <TagSelector selectedIds={tagIds} onChange={setTagIds} />
        </div>
    );
}
