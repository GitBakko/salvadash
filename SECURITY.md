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
- Rate limiting su endpoint sensibili
- CORS configurato per origini specifiche
- Credenziali utente mai loggate né esposte in risposte API
- Le variabili d'ambiente sensibili sono in `.env` (mai committate)
