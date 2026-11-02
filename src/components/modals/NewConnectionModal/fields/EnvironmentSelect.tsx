import {useTranslation} from 'react-i18next';
import clsx from 'clsx';
import {SelectMenu} from '@/components/ui/SelectMenu';

const ENVIRONMENTS = ['', 'development', 'staging', 'production'] as const;

const ENV_DOT_CLASS: Record<string, string> = {
    production: 'bg-status-error',
    staging: 'bg-status-warning',
    development: 'bg-status-success',
};

/** Color dot of an environment; a hollow ring when there is none. */
function EnvironmentDot({env}: {env: string}) {
    return (
        <span
            aria-hidden="true"
            className={clsx(
                'h-2 w-2 shrink-0 rounded-full',
                ENV_DOT_CLASS[env] ?? 'border border-strong',
            )}
        />
    );
}

interface EnvironmentSelectProps {
    value: string;
    onChange: (value: string) => void;
}

/** Environment of a connection (none, development, staging, production), as a form field. */
export function EnvironmentSelect({value, onChange}: EnvironmentSelectProps) {
    const {t} = useTranslation();
    return (
        <SelectMenu
            ariaLabel={t('environment.label')}
            value={value}
            onChange={onChange}
            options={ENVIRONMENTS.map((env) => ({
                value: env,
                label: env === '' ? t('environment.none') : t(`environment.${env}`),
                leading: <EnvironmentDot env={env} />,
            }))}
        />
    );
}
