<div align="center">

# 💰 SalvaDash

**Il tuo tracker di risparmi personale — bello, veloce, tuo.**

[![CI](https://github.com/GitBakko/salvadash/actions/workflows/ci.yml/badge.svg)](https://github.com/GitBakko/salvadash/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

<br />

<img src="docs/assets/hero.png" alt="SalvaDash Dashboard" width="720" />

_Tieni traccia dei tuoi risparmi mese dopo mese. Visualizza trend, obiettivi e crescita — tutto in un'app installabile._

</div>

---

## ✨ Perché SalvaDash

La maggior parte delle app finanziarie è troppo complicata o troppo limitata. SalvaDash è un **tracker di risparmi mensile** progettato per chi vuole una visione chiara dei propri soldi senza collegare conti correnti né condividere dati sensibili.

- 📊 **Dashboard in tempo reale** — totale risparmi, delta mensile, trend con grafici interattivi
- 📱 **PWA installabile** — funziona offline, notifiche push, aggiungilo alla home
- 🏦 **Multi-conto** — conti principali e sotto-conti con icone e colori personalizzati
- 💼 **Fonti di reddito** — traccia stipendio, freelance, investimenti separatamente
- 📈 **Analytics avanzati** — grafici Recharts con breakdown per conto e periodo
- 🌍 **Multilingua** — Italiano e Inglese con i18next
- 👥 **Multi-utente** — sistema di inviti con ruoli (Root, Admin, Base)
- 🔔 **Notifiche** — reminder mensili via email e push notification
- 🛡️ **Sicuro** — JWT con refresh token, bcrypt, validazione Zod end-to-end

---

## 🏗️ Architettura

```
salvadash/
├── frontend/          React 19 · Vite 6 · TanStack Router/Query · Tailwind v4
├── backend/           Express · TypeScript · Prisma 6 · PostgreSQL 16
├── shared/            Zod schemas · Tipi condivisi
├── docker-compose.yml PostgreSQL dev container
└── package.json       pnpm monorepo workspace
```

| Layer        | Stack                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| **Frontend** | React 19, Vite 6, TanStack Router & Query, Zustand, Framer Motion, Recharts, Tailwind CSS v4, Dexie (IndexedDB) |
| **Backend**  | Express 4.21, Prisma 6, JWT auth, Nodemailer, Web Push, XLSX export                                             |
| **Shared**   | Zod schemas, TypeScript types — contratto API type-safe                                                         |
| **Infra**    | Docker Compose (PostgreSQL), PM2 (production), GitHub Actions CI/CD                                             |

---

## 🚀 Quick Start

### Prerequisiti

- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Docker** (per PostgreSQL) oppure PostgreSQL 16 installato

### 1. Clone & Install

```bash
git clone https://github.com/GitBakko/salvadash.git
cd salvadash
pnpm install
```

### 2. Setup ambiente

```bash
cp .env.example .env
# Modifica .env con le tue configurazioni
```

### 3. Avvia PostgreSQL

```bash
docker compose up -d
```

### 4. Setup database

```bash
pnpm db:generate    # Genera Prisma Client
pnpm db:push        # Applica schema al DB
pnpm db:seed        # (opzionale) Popola dati di esempio
```

### 5. Avvia in sviluppo

```bash
pnpm dev            # Backend + Frontend in parallelo
```

| Servizio      | URL                       |
| ------------- | ------------------------- |
| Frontend      | http://localhost:5173     |
| Backend API   | http://localhost:3000/api |
| Prisma Studio | `pnpm db:studio`          |

---

## 📜 Script disponibili

| Comando            | Descrizione                       |
| ------------------ | --------------------------------- |
| `pnpm dev`         | Avvia tutti i servizi in sviluppo |
| `pnpm build`       | Build di produzione completa      |
| `pnpm test`        | Esegui tutti i test (Vitest)      |
| `pnpm lint`        | Linting con ESLint                |
| `pnpm format`      | Formattazione con Prettier        |
| `pnpm db:generate` | Rigenera Prisma Client            |
| `pnpm db:migrate`  | Crea ed esegui migrazioni         |
| `pnpm db:push`     | Sync schema → DB (dev)            |
| `pnpm db:seed`     | Popola database                   |
| `pnpm db:studio`   | Apri Prisma Studio GUI            |
| `pnpm clean`       | Rimuovi node_modules e dist       |

---

## 🧪 Testing

```bash
pnpm test                 # Tutti i test
pnpm test:backend         # Solo backend
pnpm test:frontend        # Solo frontend
```

I test usano **Vitest** con:

- Backend: ambiente Node.js, coverage su `src/lib` e `src/middleware`
- Frontend: ambiente jsdom, coverage su `src/lib` e `src/stores`

---

## 🐳 Deploy in produzione

### Con PM2

```bash
pnpm build
pm2 start ecosystem.config.cjs
```

### Con Docker (in arrivo)

Un `Dockerfile` multi-stage per il deploy completo è nei piani futuri.

---

## 🔧 Configurazione

Tutte le variabili d'ambiente sono documentate in [`.env.example`](.env.example):

| Variabile              | Descrizione                       |
| ---------------------- | --------------------------------- |
| `DATABASE_URL`         | Stringa di connessione PostgreSQL |
| `JWT_ACCESS_SECRET`    | Chiave segreta per access token   |
| `JWT_REFRESH_SECRET`   | Chiave segreta per refresh token  |
| `SMTP_*`               | Configurazione email (SMTP)       |
| `VAPID_*`              | Chiavi per Web Push notifications |
| `APP_URL`              | URL del frontend                  |
| `API_URL` / `API_PORT` | URL e porta del backend           |

---

## 📁 Struttura del progetto

<details>
<summary>Espandi struttura completa</summary>

```
salvadash/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint → Test → Build su ogni push/PR
│       └── release.yml         # Semantic versioning su main
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # Modello dati
│   │   └── seed.ts             # Script di seeding
│   ├── src/
│   │   ├── config/             # JWT, mail, push config
│   │   ├── lib/                # Logica business (calculations, etc.)
│   │   ├── middleware/         # Auth, rate-limit, error handling
│   │   ├── routes/             # Express API routes
│   │   └── index.ts            # Entry point
│   └── package.json
├── frontend/
│   ├── public/                 # Assets statici + manifest PWA
│   ├── src/
│   │   ├── components/         # UI components riutilizzabili
│   │   ├── hooks/              # Custom hooks (queries, mutations)
│   │   ├── i18n/               # Traduzioni (it.json, en.json)
│   │   ├── lib/                # Utils, API client, calculations
│   │   ├── routes/             # File-based routing (TanStack Router)
│   │   ├── stores/             # Zustand stores
│   │   └── main.tsx            # Entry point React
│   └── package.json
├── shared/
│   ├── src/
│   │   ├── schemas/            # Zod validation schemas
│   │   └── types/              # TypeScript type definitions
│   └── package.json
├── docker-compose.yml          # PostgreSQL dev container
├── ecosystem.config.cjs        # PM2 production config
├── pnpm-workspace.yaml         # Monorepo workspace definition
└── package.json                # Root scripts & dev dependencies
```

</details>

---

## 🛣️ Roadmap

- [x] Dashboard con KPI e grafici
- [x] Gestione multi-conto con icone/colori
- [x] Fonti di reddito tracciabili
- [x] PWA con offline support (IndexedDB)
- [x] Push notifications e reminder email
- [x] Sistema inviti e ruoli utente
- [x] Profilo utente con avatar
- [x] Export dati in Excel
- [ ] Open Banking — sync automatico saldi (Salt Edge)
- [ ] Obiettivi di risparmio con progress bar
- [x] Dark mode
- [ ] Docker multi-stage per deploy
- [ ] Dashboard condivisa per coppie/famiglie

---

## 🤝 Contributing

I contributi sono benvenuti! Leggi [CONTRIBUTING.md](CONTRIBUTING.md) prima di aprire una PR.

1. Forka il repository
2. Crea un branch feature (`git checkout -b feat/nuova-feature`)
3. Committa con [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, ...)
4. Pusha e apri una Pull Request

---

## 📄 License

[MIT](LICENSE) © 2025–2026 Bakko

---

<div align="center">

Fatto con ☕ e TypeScript

</div>
