import {useTranslation} from 'react-i18next';
import {Search} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {EmptyState} from '@/components/ui/EmptyState';

interface ConnectionsNoResultsProps {
    query: string;
    onClearSearch: () => void;
}

export function ConnectionsNoResults({query, onClearSearch}: ConnectionsNoResultsProps) {
    const {t} = useTranslation();

    return (
        <EmptyState
            icon={Search}
            title={t('connections.noSearchResults', {query})}
            description={t('connections.noSearchResultsHint')}
            actions={
                <Button variant="outline" onClick={onClearSearch}>
                    {t('common.clearSearch')}
                </Button>
            }
        />
    );
}
