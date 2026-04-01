import { useTranslation } from 'react-i18next';
import { APP_VERSION, changelog, type ChangelogCategoryType } from '@salvadash/shared';
import { useMarkVersionSeen } from '../hooks/queries';
import { Modal } from './ui';

const categoryConfig: Record<ChangelogCategoryType, { icon: string; color: string; labelKey: string }> = {
  feature: { icon: 'new_releases', color: 'text-brand', labelKey: 'version.features' },
  fix: { icon: 'bug_report', color: 'text-negative', labelKey: 'version.fixes' },
  improvement: { icon: 'trending_up', color: 'text-positive', labelKey: 'version.improvements' },
};

interface WhatsNewModalProps {
  onClose: () => void;
}

export function WhatsNewModal({ onClose }: WhatsNewModalProps) {
  const { t, i18n } = useTranslation();
  const markSeen = useMarkVersionSeen();
  const lang = i18n.language === 'it' ? 'it' : 'en';

  const currentEntry = changelog.find((e) => e.version === APP_VERSION) ?? changelog[0];

  function handleClose() {
    markSeen.mutate();
    onClose();
  }

  return (
    <Modal isOpen onClose={handleClose} title={`${t('version.whatsNew')} — v${currentEntry.version}`} size="md">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <p className="text-xs text-text-muted">{currentEntry.date}</p>

        {currentEntry.categories.map((cat) => {
          const config = categoryConfig[cat.type];
          return (
            <div key={cat.type} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`icon text-lg ${config.color}`}>{config.icon}</span>
                <h3 className="font-heading text-sm font-semibold">{t(config.labelKey)}</h3>
              </div>
              <ul className="space-y-1.5 ml-7">
                {cat.items.map((item, i) => (
                  <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-text-muted mt-1">•</span>
                    <span>{item[lang]}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleClose}
          className="px-6 py-2.5 rounded-xl bg-brand text-surface-base font-medium text-sm hover:bg-brand-hover transition-colors"
        >
          {t('version.gotIt')}
        </button>
      </div>
    </Modal>
  );
}
