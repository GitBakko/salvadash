import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

export function PWAUpdatePrompt() {
  const { t } = useTranslation();

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;
      // Periodic update check — critical for iOS standalone PWA
      setInterval(async () => {
        if (registration.installing || !navigator) return;
        if ('connection' in navigator && !navigator.onLine) return;

        const resp = await fetch(swUrl, {
          cache: 'no-store',
          headers: { 'cache-control': 'no-cache' },
        });

        if (resp.status === 200) {
          await registration.update();
        }
      }, UPDATE_CHECK_INTERVAL);
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 inset-x-0 z-[100] glass-card border-b border-border-default p-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
        >
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <span className="icon text-brand text-2xl shrink-0">system_update</span>
            <p className="flex-1 text-sm text-text-primary">{t('pwa.updateAvailable')}</p>
            <Button size="sm" onClick={() => updateServiceWorker(true)}>
              {t('pwa.reload')}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
