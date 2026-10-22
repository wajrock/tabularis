import {useEffect, useState} from 'react';
import {homeDir} from '@tauri-apps/api/path';

let cached: Promise<string | null> | null = null;

function loadHomeDir(): Promise<string | null> {
    cached ??= homeDir().catch(() => null);
    return cached;
}

/** The user's home directory, or null until it is known (or outside Tauri). */
export function useHomeDir(): string | null {
    const [home, setHome] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        void loadHomeDir().then((value) => {
            if (active) setHome(value);
        });
        return () => {
            active = false;
        };
    }, []);

    return home;
}
