import {useTranslation} from 'react-i18next';
import {Check, Copy} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Modal} from '@/components/ui/Modal';
import {useCopyFeedback} from '@/hooks/useCopyFeedback';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
}

export const AlertModal = ({isOpen, onClose, title, message}: AlertModalProps) => {
    const {t} = useTranslation();
    const {copied, copy, reset} = useCopyFeedback(1500);

    const handleClose = () => {
        reset();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={title}
            size="sm"
            bodyClassName="max-h-[60vh]"
            footerStart={
                <Button
                    variant="ghost"
                    className="-ml-3.5"
                    icon={
                        copied ? (
                            <Check size={16} className="text-tint-success-fg" />
                        ) : (
                            <Copy size={16} />
                        )
                    }
                    onClick={() => copy(message)}
                >
                    {copied ? t('common.copied') : t('common.copy')}
                </Button>
            }
            footer={<Button onClick={handleClose}>{t('common.ok', 'OK')}</Button>}
        >
            <p className="select-text whitespace-pre-wrap break-words text-sm text-secondary">
                {message}
            </p>
        </Modal>
    );
};
