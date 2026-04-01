import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { changelog, type ChangelogCategoryType } from '@salvadash/shared';

export const Route = createFileRoute('/release-history')({
  component: ReleaseHistoryPage,
});

const categoryConfig: Record<ChangelogCategoryType, { icon: string; color: string; labelKey: string }> = {
  feature: { icon: 'new_releases', color: 'text-brand', labelKey: 'version.features' },
  fix: { icon: 'bug_report', color: 'text-negative', labelKey: 'version.fixes' },
  improvement: { icon: 'trending_up', color: 'text-positive', labelKey: 'version.improvements' },
};

function ReleaseHistoryPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'it' ? 'it' : 'en';
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return changelog;
    const q = search.toLowerCase();
    return changelog.filter(
      (entry) =>
        entry.version.includes(q) ||
        entry.date.includes(q) ||
        entry.categories.some((cat) => cat.items.some((item) => item[lang].toLowerCase().includes(q))),
    );
  }, [search, lang]);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/settings" className="text-text-muted hover:text-text-primary transition-colors">
          <span className="icon text-xl">arrow_back</span>
        </Link>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-heading text-2xl font-bold"
        >
          {t('version.releaseHistory')}
        </motion.h1>
      </div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="relative">
          <span className="icon absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('version.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated border border-border-default rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand transition-colors"
          />
        </div>
      </motion.div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-text-muted text-sm py-8"
        >
          {t('version.noResults')}
        </motion.p>
      ) : (
        filtered.map((entry, idx) => (
          <motion.div
            key={entry.version}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            className="glass-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold">v{entry.version}</h2>
              <span className="text-xs text-text-muted">{entry.date}</span>
            </div>

            {entry.categories.map((cat) => {
              const config = categoryConfig[cat.type];
              return (
                <div key={cat.type} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`icon text-base ${config.color}`}>{config.icon}</span>
                    <span className="text-xs font-semibold text-text-secondary">{t(config.labelKey)}</span>
                  </div>
                  <ul className="space-y-1 ml-6">
                    {cat.items.map((item, i) => (
                      <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-text-muted mt-0.5">•</span>
                        <span>{item[lang]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </motion.div>
        ))
      )}
    </div>
  );
}
