import { type ReactNode, useEffect, useCallback, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/use-focus-trap';
import { overlayFade, modalPop } from '../../lib/motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(contentRef, isOpen);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-surface-overlay"
            variants={overlayFade}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />

          {/* Content */}
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={`relative w-full ${sizeClasses[size]} solid-card p-6 shadow-2xl`}
            variants={modalPop}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 id={titleId} className="font-heading text-lg font-semibold">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="text-text-muted hover:text-text-primary transition-colors p-1"
                  aria-label={t('common.close')}
                >
                  <X size={22} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
