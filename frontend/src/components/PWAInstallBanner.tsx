import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone } from 'lucide-react';
import { useUIStore } from '../stores/ui-store';
import { Button } from './ui/Button';

export function PWAInstallBanner() {
  const { t } = useTranslation();
  const { showInstallBanner, deferredPrompt, dismissInstallBanner, setDeferredPrompt } =
    useUIStore();

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    dismissInstallBanner();
  }

  function handleDismiss() {
    dismissInstallBanner();
  }

  return (
    <AnimatePresence>
      {showInstallBanner && deferredPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50 solid-card p-4 flex items-center gap-3"
        >
          <Smartphone size={32} className="text-brand shrink-0" />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{t('pwa.installTitle')}</p>
            <p className="text-xs text-text-secondary">{t('pwa.installText')}</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              {t('pwa.dismiss')}
            </Button>
            <Button size="sm" onClick={handleInstall}>
              {t('pwa.install')}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
