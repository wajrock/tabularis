import {useTranslation} from 'react-i18next';
import {Chip} from '@/components/ui/Chip';
import {ENVIRONMENT_TONES, type ConnectionEnvironment} from '@/utils/environment';

/** Toned chip naming the connection's environment (Development, Staging, Production). */
export const EnvironmentBadge = ({environment}: {environment?: ConnectionEnvironment}) => {
    const {t} = useTranslation();
    if (!environment) return null;
    return (
        <Chip variant="flat" tone={ENVIRONMENT_TONES[environment]}>
            {t(`environment.${environment}`)}
        </Chip>
    );
};
