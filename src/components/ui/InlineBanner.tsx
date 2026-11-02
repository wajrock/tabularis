import type {ReactNode} from 'react';
import clsx from 'clsx';

export type InlineBannerTone = 'amber' | 'red' | 'green' | 'neutral';

const TONE_CLASS: Record<InlineBannerTone, string> = {
    amber: 'bg-tint-warning-bg text-tint-warning-fg',
    red: 'bg-tint-danger-bg text-tint-danger-fg',
    green: 'bg-tint-success-bg text-tint-success-fg',
    neutral: 'bg-surface-primary text-secondary',
};

/** Compact tinted notice: icon on the left, text on the right. */
export function InlineBanner({
    tone,
    icon,
    role,
    children,
}: {
    tone: InlineBannerTone;
    icon: ReactNode;
    role?: 'status' | 'alert';
    children: ReactNode;
}) {
    return (
        <div
            role={role}
            className={clsx('flex gap-2 rounded-md p-3 text-xs leading-4', TONE_CLASS[tone])}
        >
            <span className="shrink-0 mt-0.5">{icon}</span>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
