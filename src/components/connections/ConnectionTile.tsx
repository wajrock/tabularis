import clsx from 'clsx';
import type {SavedConnection} from '@/contexts/DatabaseContext';
import type {PluginManifest} from '@/types/plugins';
import {getConnectionAccent, getConnectionIcon} from '@/utils/driverUI';

interface ConnectionTileProps {
    connection: SavedConnection | undefined;
    manifest: PluginManifest | undefined;
    size: 12 | 16 | 20 | 24 | 28 | 32;
    isProduction?: boolean;
    className?: string;
}

const SIZE_CLASS = {
    12: 'h-3 w-3 rounded-sm',
    16: 'h-4 w-4 rounded-sm',
    20: 'h-5 w-5 rounded-sm',
    24: 'h-6 w-6 rounded-md',
    28: 'h-7 w-7 rounded-md',
    32: 'h-8 w-8 rounded-md',
};
const ICON_SIZE = {12: 8, 16: 10, 20: 12, 24: 14, 28: 16, 32: 18};

/** Driver-colored square with the connection's icon (white over the brand color). */
export function ConnectionTile({
    connection,
    manifest,
    size,
    isProduction = false,
    className,
}: ConnectionTileProps) {
    return (
        <span
            aria-hidden="true"
            className={clsx(
                'flex shrink-0 items-center justify-center text-white',
                SIZE_CLASS[size],
                isProduction && 'outline outline-[1.5px] outline-offset-1 outline-status-error',
                className,
            )}
            style={{backgroundColor: getConnectionAccent(connection, manifest)}}
        >
            {getConnectionIcon(connection, manifest, ICON_SIZE[size])}
        </span>
    );
}
