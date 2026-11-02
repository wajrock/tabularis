import {useTranslation} from 'react-i18next';
import clsx from 'clsx';

interface BetaBadgeProps {
    className?: string;
}

/** Small "BETA" pill for features that are still experimental. */
export const BetaBadge = ({className}: BetaBadgeProps) => {
    const {t} = useTranslation();
    return (
        <span
            className={clsx(
                'inline-flex h-[18px] items-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide',
                'bg-tint-warning-bg text-tint-warning-fg',
                className,
            )}
        >
            {t('common.beta')}
        </span>
    );
};
