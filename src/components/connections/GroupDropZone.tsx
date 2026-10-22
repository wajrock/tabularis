import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {SquareMousePointer} from 'lucide-react';

/** Placeholder of an empty group: connections can be dropped on it. */
export function GroupDropZone({isDragOver}: {isDragOver: boolean}) {
    const {t} = useTranslation();
    return (
        <div
            className={clsx(
                'flex h-16 items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-dashed text-sm font-medium transition-colors',
                isDragOver
                    ? 'border-accent-primary bg-accent-primary/5 text-accent'
                    : 'border-default text-muted',
            )}
        >
            <SquareMousePointer size={18} aria-hidden="true" />
            {t('groups.dropHere')}
        </div>
    );
}
