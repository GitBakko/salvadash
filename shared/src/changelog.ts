// ─── Changelog Types ───────────────────────────────────────

export type ChangelogCategoryType = 'feature' | 'fix' | 'improvement';

export interface ChangelogItem {
  it: string;
  en: string;
}

export interface ChangelogCategory {
  type: ChangelogCategoryType;
  items: ChangelogItem[];
}

export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  categories: ChangelogCategory[];
}

// ─── Changelog Data ────────────────────────────────────────

export const changelog: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-04-01',
    categories: [
      {
        type: 'feature',
        items: [
          {
            it: 'Dashboard con panoramica patrimonio, crescita e rilevazioni recenti',
            en: 'Dashboard with patrimony overview, growth and recent entries',
          },
          {
            it: 'Gestione conti (principale e secondari) con icone e colori',
            en: 'Account management (main and secondary) with icons and colors',
          },
          {
            it: 'Rilevazioni mensili con saldi e fonti di reddito',
            en: 'Monthly entries with balances and income sources',
          },
          {
            it: 'Analytics avanzate: patrimonio nel tempo, confronto anni, composizione conti',
            en: 'Advanced analytics: patrimony over time, year comparison, account breakdown',
          },
          {
            it: 'Sistema notifiche con push notifications',
            en: 'Notification system with push notifications',
          },
          {
            it: 'Pannello admin con gestione utenti e codici invito',
            en: 'Admin panel with user management and invite codes',
          },
          {
            it: 'Backup e ripristino database con manutenzione automatica',
            en: 'Database backup and restore with automatic maintenance',
          },
          {
            it: 'PWA: installabile su dispositivi mobili con supporto offline',
            en: 'PWA: installable on mobile devices with offline support',
          },
          {
            it: 'Tema scuro e chiaro (anteprima)',
            en: 'Dark and light theme (preview)',
          },
          {
            it: 'Supporto multilingua (Italiano / English)',
            en: 'Multilingual support (Italian / English)',
          },
          {
            it: 'Sistema versioning con changelog e modale "Novità"',
            en: 'Versioning system with changelog and "What\'s New" modal',
          },
        ],
      },
    ],
  },
];
