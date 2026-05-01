# Security Policy

## Versioni supportate

| Versione | Supportata |
| -------- | ---------- |
| 1.x.x    | ✅         |

## Segnalare una vulnerabilità

Se trovi una vulnerabilità di sicurezza, **non aprire una Issue pubblica**.

Invia un'email a **security@salvadash.app** (oppure contatta il maintainer direttamente) con:

1. Descrizione della vulnerabilità
2. Passi per riprodurla
3. Impatto potenziale
4. Eventuale fix suggerito

Risponderemo entro **48 ore** e lavoreremo insieme per una risoluzione prima di qualsiasi disclosure pubblica.

## Best practices del progetto

- Le password sono hashate con **bcryptjs** (salt rounds: 12)
- Autenticazione via **JWT** con access + refresh token
- Validazione input con **Zod** su ogni endpoint
- Rate limiting globale (`express-rate-limit`, 600 req/15 min) e tighter su endpoint write (60 req/15 min)
- CORS configurato per origini specifiche (`APP_URL`)
- Credenziali utente mai loggate né esposte in risposte API
- Le variabili d'ambiente sensibili sono in `.env` (mai committate)

## CSRF mitigation

CSRF è mitigato senza un token system per-request grazie a tre controlli combinati:

1. **`SameSite=strict`** sui cookie di sessione in produzione (`access` e `refresh` token) — vedi `backend/src/lib/auth.ts`. Il browser non invia i cookie su richieste cross-site, neanche top-level navigation.
2. **`httpOnly` + `secure`** — cookie inaccessibili da JavaScript e trasmessi solo su HTTPS in prod.
3. **CORS restrittivo** — `origin: config.appUrl` con `credentials: true`. Solo l'origine SPA dichiarata può inviare richieste autenticate.

Il threat model (single-tenant per user, SPA same-origin, no third-party iframe) non giustifica la complessità di un token CSRF. La query CodeQL `js/missing-token-validation` è quindi disabilitata in `.github/codeql/codeql-config.yml` con justification documentata. Riabilitare se `SameSite` viene mai allentato.

## Path traversal

Gli ID account sono validati come CUID (regex `^[a-z0-9]{20,32}$`) prima di essere usati in path filesystem o URL. `path.basename` è applicato come secondo livello di difesa.

## Dipendenze

`pnpm audit` viene eseguito in CI. Vulnerabilità `high` o `critical` bloccano la build via Dependency Review action.
