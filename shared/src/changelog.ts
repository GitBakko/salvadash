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
    version: '1.1.0',
    date: '2026-04-01',
    categories: [
      {
        type: 'feature',
        items: [
          {
            it: 'Migrazione completa a Lucide React: icone SVG moderne e scalabili in tutta l\'app',
            en: 'Full migration to Lucide React: modern, scalable SVG icons throughout the app',
          },
          {
            it: 'I conti disattivati vengono ora spostati automaticamente in fondo alla lista',
            en: 'Deactivated accounts are now automatically moved to the bottom of the list',
          },
          {
            it: 'Il pulsante elimina conto appare solo se il conto non ha rilevazioni associate',
            en: 'Delete account button only appears if the account has no associated entries',
          },
        ],
      },
      {
        type: 'improvement',
        items: [
          {
            it: 'Touch target migliorati su tutti i pulsanti icona (min 44px per Apple HIG)',
            en: 'Improved touch targets on all icon buttons (min 44px per Apple HIG)',
          },
          {
            it: 'Il drag & drop dei conti si attiva solo dal grip handle, non dall\'intero elemento',
            en: 'Account drag & drop now activates only from the grip handle, not the entire element',
          },
          {
            it: 'Componente Toggle animato in stile iOS sostituisce tutti i vecchi toggle',
            en: 'Animated iOS-style Toggle component replaces all old toggles',
          },
        ],
      },
      {
        type: 'fix',
        items: [
          {
            it: 'Risolto errore 404 sul riordino conti (route /reorder ora ha priorità su /:id)',
            en: 'Fixed 404 error on account reorder (route /reorder now has priority over /:id)',
          },
        ],
      },
    ],
  },
  {
    version: '1.0.1',
    date: '2026-04-01',
    categories: [
      {
        type: 'fix',
        items: [
          {
            it: 'Il drag & drop dei conti ora si attiva solo dal grip handle, non dall\'intero elemento',
            en: 'Account drag & drop now activates only from the grip handle, not the entire element',
          },
          {
            it: 'Risolto problema ESM con Prisma 7 che impediva l\'avvio del backend in produzione',
            en: 'Fixed Prisma 7 ESM issue that prevented backend startup in production',
          },
          {
            it: 'Risolto problema di dipendenze shared su Windows Server (node-linker hoisted)',
            en: 'Fixed shared package dependencies on Windows Server (hoisted node-linker)',
          },
        ],
      },
      {
        type: 'improvement',
        items: [
          {
            it: 'Nuovo componente Toggle animato in stile iOS, utilizzato in tutta l\'app',
            en: 'New animated iOS-style Toggle component, used throughout the app',
          },
          {
            it: 'Feedback visivo migliorato sul grip di drag (hover e colore)',
            en: 'Improved visual feedback on drag grip (hover and color)',
          },
          {
            it: 'Il pacchetto shared viene ora compilato per il deploy (non più sorgenti .ts)',
            en: 'Shared package is now compiled for deployment (no longer raw .ts sources)',
          },
          {
            it: 'Guida al deploy su IIS aggiornata con le nuove procedure',
            en: 'Updated IIS deployment guide with new procedures',
          },
        ],
      },
    ],
  },
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
