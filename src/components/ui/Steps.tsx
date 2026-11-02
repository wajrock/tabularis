import {Fragment} from 'react';
import clsx from 'clsx';
import {Check} from 'lucide-react';
import {FOCUS_RING} from './focusRing';

interface StepsProps {
    labels: string[];
    /** Index of the current step; earlier steps show a check. */
    current: number;
    /** Makes the earlier steps buttons that go back to them. */
    onStepClick?: (index: number) => void;
}

const STEP_CLASS = 'flex items-center gap-1.5 text-sm font-medium';

function StepDot({index, current}: {index: number; current: number}) {
    return (
        <span
            className={clsx(
                'flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-semibold',
                index === current
                    ? 'bg-accent-primary text-inverse'
                    : index < current
                      ? 'bg-tint-success-bg text-tint-success-fg'
                      : 'bg-surface-primary text-muted',
            )}
        >
            {index < current ? <Check size={11} /> : index + 1}
        </span>
    );
}

/** Wizard progress shown in a modal header: numbered dots joined by a line. */
export function Steps({labels, current, onStepClick}: StepsProps) {
    return (
        <ol className="flex items-center gap-2">
            {labels.map((label, index) => (
                <Fragment key={label}>
                    {index > 0 && <li aria-hidden="true" className="h-px w-4 bg-default" />}
                    <li aria-current={index === current ? 'step' : undefined}>
                        {onStepClick && index < current ? (
                            <button
                                type="button"
                                onClick={() => onStepClick(index)}
                                className={clsx(
                                    STEP_CLASS,
                                    'rounded-md text-muted transition-colors hover:text-primary',
                                    FOCUS_RING,
                                )}
                            >
                                <StepDot index={index} current={current} />
                                {label}
                            </button>
                        ) : (
                            <span
                                className={clsx(
                                    STEP_CLASS,
                                    index === current ? 'text-primary' : 'text-muted',
                                )}
                            >
                                <StepDot index={index} current={current} />
                                {label}
                            </span>
                        )}
                    </li>
                </Fragment>
            ))}
        </ol>
    );
}
