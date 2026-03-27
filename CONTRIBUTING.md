# Contributing a SalvaDash

Grazie per voler contribuire! 🎉 Ecco le linee guida per rendere il processo fluido per tutti.

## 🚦 Workflow

1. **Forka** il repository
2. **Crea un branch** dal branch `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/la-tua-feature
   ```
3. **Installa le dipendenze**: `pnpm install`
4. **Lavora** sulla tua modifica
5. **Testa**: `pnpm test`
6. **Committa** seguendo Conventional Commits
7. **Pusha** e apri una PR verso `develop`

## 📝 Conventional Commits

Ogni commit **deve** seguire il formato:

```
<tipo>[scope opzionale]: <descrizione>

[corpo opzionale]

[footer opzionale]
```

### Tipi ammessi

| Tipo       | Quando usarlo                 |
| ---------- | ----------------------------- |
| `feat`     | Nuova funzionalità            |
| `fix`      | Bug fix                       |
| `docs`     | Solo documentazione           |
| `style`    | Formattazione (no logica)     |
| `refactor` | Refactoring (no feat, no fix) |
| `perf`     | Miglioramento performance     |
| `test`     | Aggiunta/modifica test        |
| `build`    | Build system o dipendenze     |
| `ci`       | Configurazione CI             |
| `chore`    | Manutenzione generica         |
| `revert`   | Revert di un commit           |

### Esempi

```
feat(dashboard): aggiungi grafico trend mensile
fix(auth): correggi refresh token scaduto
docs: aggiorna README con nuovi script
refactor(entries): estrai logica calcolo in utility
```

## 🏗️ Setup sviluppo

```bash
# Clone & install
git clone https://github.com/TUO-USER/salvadash.git
cd salvadash
pnpm install

# Database
docker compose up -d
cp .env.example .env
pnpm db:generate
pnpm db:push

# Dev server
pnpm dev
```

## ✅ Checklist PR

Prima di aprire una PR, verifica:

- [ ] I test passano (`pnpm test`)
- [ ] Il linting è ok (`pnpm lint`)
- [ ] Il formato è ok (`pnpm format:check`)
- [ ] La build non ha errori (`pnpm build`)
- [ ] Il titolo della PR segue Conventional Commits
- [ ] La descrizione spiega **cosa** e **perché**

## 🗂️ Struttura del codice

- `backend/src/routes/` — Nuove API route
- `backend/src/lib/` — Logica business
- `backend/src/middleware/` — Middleware Express
- `frontend/src/routes/` — Pagine (file-based routing)
- `frontend/src/components/` — Componenti riutilizzabili
- `frontend/src/hooks/` — Custom hooks (queries, mutations)
- `shared/src/schemas/` — Zod validation schemas
- `shared/src/types/` — TypeScript types condivisi

## 🐛 Segnalare bug

Usa il template "Bug Report" nelle Issues. Includi:

- Comportamento atteso vs. ottenuto
- Passi per riprodurre
- Screenshot (se visuale)
- Browser/OS

## 💡 Proporre feature

Usa il template "Feature Request" nelle Issues. Descrivi:

- Il problema che vuoi risolvere
- La soluzione proposta
- Alternative considerate

---

Grazie per contribuire a SalvaDash! 🚀
