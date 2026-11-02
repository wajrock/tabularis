import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/Button';
import {Modal} from '@/components/ui/Modal';

interface ErrorModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
}

export const ErrorModal = ({isOpen, onClose, message}: ErrorModalProps) => {
    const {t} = useTranslation();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('common.error')}
            size="sm"
            footer={<Button onClick={onClose}>{t('common.close')}</Button>}
        >
            <p className="break-words text-sm text-secondary">{message}</p>
        </Modal>
    );
};
