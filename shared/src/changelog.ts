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
    version: '1.2.1',
    date: '2026-04-30',
    categories: [
      {
        type: 'improvement',
        items: [
          {
            it: 'Sicurezza: rate limiting su tutte le API (600/15min globale, 60/15min sulle scritture, 30/15min auth)',
            en: 'Security: rate limiting on all APIs (600/15min global, 60/15min on writes, 30/15min auth)',
          },
          {
            it: 'Sicurezza: validazione CUID + path.basename su ID account prima di operazioni filesystem (path traversal)',
            en: 'Security: CUID validation + path.basename on account IDs before filesystem ops (path traversal)',
          },
          {
            it: 'CI: tutti i check ora verdi (lint, format, type check, test, build, CodeQL, Dependency Review)',
            en: 'CI: all checks now green (lint, format, type check, test, build, CodeQL, Dependency Review)',
          },
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-04-30',
    categories: [
      {
        type: 'feature',
        items: [
          {
            it: 'Identità visiva Aurora: nuova palette violet+mint, tipografia Inter Tight, hero ridisegnato',
            en: 'Aurora visual identity: new violet+mint palette, Inter Tight typography, rebuilt hero',
          },
          {
            it: 'Logo conti automatico via Brandfetch: cerca per nome, importa, colore predominante auto-applicato',
            en: 'Auto account logo via Brandfetch: search by name, import, dominant color auto-applied',
          },
          {
            it: 'Toggle tema in header: dark / light / sistema (segue OS)',
            en: 'Theme toggle in header: dark / light / system (follows OS)',
          },
          {
            it: 'Modifica rilevazione dal dettaglio storico (riusa il form di nuova rilevazione)',
            en: 'Edit entry from history detail (reuses the new-entry form)',
          },
          {
            it: 'Account form a tutto schermo su mobile, modale su desktop',
            en: 'Account form full-screen on mobile, modal on desktop',
          },
          {
            it: 'Filtro Analytics: ordinamento alfabetico + pill riassuntiva del filtro applicato',
            en: 'Analytics filter: alphabetical sort + applied-filter summary pill',
          },
          {
            it: 'Ordinamento conti per Nome / Valore / Personalizzato (dashboard, analytics, lista conti)',
            en: 'Account sort by Name / Value / Custom (dashboard, analytics, accounts list)',
          },
          {
            it: 'Importo aggiornato visibile su ogni conto in /conti',
            en: 'Updated amount visible on each account in /accounts',
          },
        ],
      },
      {
        type: 'improvement',
        items: [
          {
            it: 'Layout responsive desktop: Analytics e Admin si allargano fino a 1100px con grafici affiancati',
            en: 'Responsive desktop layout: Analytics and Admin expand to 1100px with side-by-side charts',
          },
          {
            it: 'Grafici Analytics con personalità: gradient violet→mint, dot endpoint mint, tooltip raffinato',
            en: 'Analytics charts with personality: violet→mint gradient, mint endpoint dot, polished tooltip',
          },
          {
            it: 'Performance: bundle main 535KB→465KB, charts vendor lazy-loaded solo su /analytics',
            en: 'Performance: main bundle 535KB→465KB, charts vendor lazy-loaded only on /analytics',
          },
          {
            it: 'Accessibilità: contrasti AA su tutta la palette, touch-target 44px ovunque, focus visibile',
            en: 'Accessibility: AA contrast across the palette, 44px touch targets everywhere, visible focus',
          },
          {
            it: 'Date picker nativo segue il tema (dark/light)',
            en: 'Native date picker honors the theme (dark/light)',
          },
          {
            it: 'Icone account visibili in tutte le schermate (dashboard, analytics, storico, conti, nuova rilevazione)',
            en: 'Account icons visible everywhere (dashboard, analytics, history, accounts, new entry)',
          },
        ],
      },
      {
        type: 'fix',
        items: [
          {
            it: 'Cache-bust su import logo: la preview si aggiorna immediatamente',
            en: 'Cache-bust on logo import: preview updates immediately',
          },
          {
            it: 'Cache invalidation: dopo modifica conto, dashboard/analytics/storico ricaricano automaticamente',
            en: 'Cache invalidation: after account changes, dashboard/analytics/history refetch automatically',
          },
          {
            it: 'Cents del totale patrimonio gestiti correttamente per locale (EUR/USD/GBP)',
            en: 'Patrimony cents split correctly per locale (EUR/USD/GBP)',
          },
          {
            it: 'Tema: brand violet più chiaro per leggibilità su sfondo scuro',
            en: 'Theme: lighter brand violet for readability on dark background',
          },
        ],
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-01',
    categories: [
      {
        type: 'feature',
        items: [
          {
            it: "Migrazione completa a Lucide React: icone SVG moderne e scalabili in tutta l'app",
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
            it: "Il drag & drop dei conti si attiva solo dal grip handle, non dall'intero elemento",
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
            it: "Il drag & drop dei conti ora si attiva solo dal grip handle, non dall'intero elemento",
            en: 'Account drag & drop now activates only from the grip handle, not the entire element',
          },
          {
            it: "Risolto problema ESM con Prisma 7 che impediva l'avvio del backend in produzione",
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
            it: "Nuovo componente Toggle animato in stile iOS, utilizzato in tutta l'app",
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
