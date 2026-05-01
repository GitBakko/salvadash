import { useTranslation } from 'react-i18next';
import type { AccountPublic } from '@salvadash/shared';
import { Modal } from './ui/Modal';
import { AccountForm } from './AccountForm';

interface Props {
  account: AccountPublic | null;
  onClose: () => void;
}

export function AccountFormModal({ account, onClose }: Props) {
  const { t } = useTranslation();
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={account ? t('accounts.editAccount') : t('accounts.addAccount')}
    >
      <AccountForm account={account} onSuccess={onClose} onCancel={onClose} />
    </Modal>
  );
}
