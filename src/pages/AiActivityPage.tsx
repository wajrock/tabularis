import {AiActivityPanel} from '@/components/settings/AiActivityPanel';

/** AI activity log and pending approvals, a top-level page since the sidebar redesign. */
export const AiActivityPage = () => (
    <div className="h-full overflow-auto bg-base">
        <div className="mx-auto max-w-5xl p-8">
            <AiActivityPanel />
        </div>
    </div>
);
