# SalvaDash — Guida al Deploy su Windows Server 2019 + IIS

## Ambiente di produzione attuale

Questa guida copre due topologie:

- **Greenfield** (server vuoti, primo deploy)
- **Aggiornamento incrementale** (versione precedente già in produzione)

L'ambiente prod attivo è così configurato:

| Componente         | Dettaglio                                                     |
| ------------------ | ------------------------------------------------------------- |
| **Server App**     | Windows Server 2019, IIS 10 + Node 20 + PM2                   |
| **Path app**       | `E:\www\salvadash\` (root del workspace pnpm in prod)         |
| **Server DB**      | Windows Server 2019, host separato (`192.168.3.243`)          |
| **PostgreSQL**     | Versione **18**, service `postgresql-x64-18`                  |
| **DB endpoint**    | `192.168.3.243:5432/salvadash`                                |
| **DB data dir**    | `E:\postresql\data` (nome cartella senza la "g": `postresql`) |
| **DB user app**    | `salvadash` (ruolo applicativo, non `postgres` superuser)     |
| **DB pg_hba.conf** | `host salvadash salvadash 192.168.3.0/24 md5`                 |

> **Nota Postgres 18.** I path config sono in `E:\postresql\data\postgresql.conf` e `E:\postresql\data\pg_hba.conf`. Gli edit richiedono Notepad/VS Code aperto **as Administrator** (ACL ristrette). Reload soft: `net stop postgresql-x64-18 && net start postgresql-x64-18`.
>
> **Recovery password superuser `postgres`.** Se persa, edit temporaneo `pg_hba.conf` con righe `trust` per `127.0.0.1/32` e `::1/128`, restart, `psql -U postgres` e `ALTER USER postgres WITH PASSWORD '...';`, poi ripristina pg_hba.conf e restart.

## Indice

1. [Prerequisiti](#1-prerequisiti)
2. [Installazione software sul server](#2-installazione-software-sul-server)
3. [Setup PostgreSQL](#3-setup-postgresql)
4. [Deploy del Backend (Node.js API)](#4-deploy-del-backend-nodejs-api)
5. [Deploy del Frontend (SPA statica su IIS)](#5-deploy-del-frontend-spa-statica-su-iis)
6. [Configurazione IIS come Reverse Proxy](#6-configurazione-iis-come-reverse-proxy)
7. [Configurare HTTPS con certificato SSL](#7-configurare-https-con-certificato-ssl)
8. [Configurazione Firewall](#8-configurazione-firewall)
9. [Verifica e Test](#9-verifica-e-test)
10. [Manutenzione](#10-manutenzione)

---

## 1. Prerequisiti

| Componente                        | Versione minima     | Note                                                      |
| --------------------------------- | ------------------- | --------------------------------------------------------- |
| Windows Server                    | 2019 (o successivo) | Con accesso Administrator                                 |
| Node.js                           | 20.x LTS            | Consigliato 22.x LTS                                      |
| pnpm                              | 9.x+                | Package manager                                           |
| PostgreSQL                        | 15 / 16 / 17 / 18   | Prod attuale: 18. Può essere sullo stesso server o remoto |
| IIS                               | 10.0                | Incluso in Windows Server                                 |
| URL Rewrite Module                | 2.1                 | Modulo IIS per rewrite/proxy                              |
| ARR (Application Request Routing) | 3.0                 | Modulo IIS per reverse proxy                              |

### File di build necessari

Dalla macchina di sviluppo servono (layout del pacchetto release, NON quello di sviluppo):

```text
salvadash/
├── package.json                    ← Root workspace (per pnpm)
├── pnpm-workspace.yaml             ← Configurazione workspace
├── pnpm-lock.yaml                  ← Lock file dipendenze
├── frontend/                       ← FLATTENED: index.html, assets/, sw.js direttamente qui
│   ├── index.html
│   ├── assets/
│   ├── sw.js
│   ├── workbox-*.js
│   └── manifest.webmanifest
├── backend/dist/                   ← Build backend (JS compilato — sì, in dist/)
├── backend/package.json            ← Per pnpm install sul server
├── backend/prisma/                 ← Schema e migrazioni Prisma
├── backend/prisma.config.ts        ← Configurazione Prisma 7
├── backend/ecosystem.config.json   ← Configurazione PM2
├── shared/dist/                    ← Codice condiviso compilato
└── shared/package.json             ← Package condiviso
```

> **CRITICO #1 — Frontend asimmetrico rispetto a backend.** In prod IIS punta a `E:\www\salvadash\frontend\` come document root. `index.html` deve stare DIRETTAMENTE lì, NON in `frontend/dist/index.html`. Quando crei il pacchetto release, **appiattisci** il contenuto di `frontend/dist/` (build Vite) dentro `frontend/` del pacchetto. Backend invece mantiene `backend/dist/` perché PM2 esegue `dist/index.js`.
>
> **CRITICO #2 — NON includere `frontend/web.config` nel pacchetto release.** Prod ha il suo `web.config` minimo funzionante (3 rewrite rules: API proxy, uploads proxy, SPA fallback). Sostituirlo con quello dev causa 500 su tutte le richieste perché `<outboundRules>` referenzia `RESPONSE_Cache-Control` non registrato in IIS `allowedServerVariables`, e `<httpCompression>`/`<httpProtocol>` referenziano moduli che potrebbero non essere installati. Solo se un upgrade richiede esplicitamente una modifica config, documentala come step manuale separato nella guida UPGRADE.
>
> **CRITICO #3 — `backend/.env` NON nel pacchetto.** Si crea una sola volta sul server al primo deploy. Eventuali nuove env vars vanno comunicate nella guida UPGRADE come step manuale (es. `BRANDFETCH_API_KEY` aggiunta in 1.2.0).
>
> **NOTA**: Il pacchetto `shared` viene compilato (`shared/dist/`). Non serve più copiare `shared/src/`.

---

## 2. Installazione software sul server

### 2.1 Abilitare IIS

Aprire **PowerShell come Administrator**:

```powershell
# Installa IIS con i moduli necessari
Install-WindowsFeature -Name Web-Server -IncludeManagementTools
Install-WindowsFeature -Name Web-Http-Redirect
Install-WindowsFeature -Name Web-Dyn-Compression
Install-WindowsFeature -Name Web-Http-Logging
```

### 2.2 Installare URL Rewrite Module

Scaricare e installare:  
**URL Rewrite 2.1** → https://www.iis.net/downloads/microsoft/url-rewrite

Oppure da PowerShell (se `winget` è disponibile):

```powershell
winget install Microsoft.IIS.UrlRewrite
```

### 2.3 Installare Application Request Routing (ARR)

Scaricare e installare:  
**ARR 3.0** → https://www.iis.net/downloads/microsoft/application-request-routing

> **IMPORTANTE**: Dopo l'installazione di ARR, abilitare il proxy:
>
> 1. Aprire **IIS Manager**
> 2. Selezionare il **nodo server** (non il sito)
> 3. Doppio click su **Application Request Routing Cache**
> 4. Click su **Server Proxy Settings** nel pannello a destra
> 5. Spuntare **Enable proxy**
> 6. Click **Apply**

### 2.4 Installare Node.js

Scaricare e installare Node.js LTS da https://nodejs.org/

```powershell
# Verifica installazione
node --version    # Deve essere >= 20.x
npm --version
```

### 2.5 Installare pnpm e PM2

```powershell
npm install -g pnpm pm2 pm2-windows-startup
```

### 2.6 Installare PostgreSQL 18 client tools sul server APP (per i backup)

In prod il server APP è separato dal server DB. Lo scheduler di backup gira lato APP e invoca `pg_dump` / `psql` per fare un dump remoto verso `192.168.3.243`. Servono quindi i **client tools** Postgres 18 sul server APP (NON il server completo).

1. Scaricare l'installer Postgres 18 da https://www.postgresql.org/download/windows/
2. Lanciare l'installer e nel selettore componenti **deselezionare**:
   - PostgreSQL Server
   - pgAdmin 4
   - Stack Builder

   Lasciare attivo SOLO **Command Line Tools**.

3. Path di default: `C:\Program Files\PostgreSQL\18\bin` (contiene `pg_dump.exe`, `psql.exe`, `pg_restore.exe`).
4. Verifica:

   ```powershell
   & "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" --version
   # PostgreSQL 18.x
   ```

5. Configurare l'app per usare quel path: nel `.env` di backend impostare

   ```dotenv
   PG_BIN_PATH="C:\Program Files\PostgreSQL\18\bin"
   ```

   In alternativa, aggiungere il path alla variabile di sistema `PATH` (lasciando `PG_BIN_PATH` vuoto). Sconsigliato se il server ha più versioni di Postgres installate.

6. Test connessione remota dal server APP:

   ```powershell
   $env:PGPASSWORD="<password_user_salvadash>"
   & "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" `
     --host 192.168.3.243 --port 5432 `
     --username salvadash --dbname salvadash `
     --schema-only --no-owner --no-privileges | Select-Object -First 5
   ```

   Se ritorna le prime righe del dump (header `-- PostgreSQL database dump`) il path di rete + credenziali + pg_hba.conf sono OK e i backup giornalieri 03:00 funzioneranno.

> **Versione client === versione server.** `pg_dump` rifiuta server con major version superiore al client. Postgres 18 server richiede client 18+ (i client 16/17 falliscono con "server version too high").

---

## 3. Setup PostgreSQL

### 3.1 Installare PostgreSQL

Scaricare e installare PostgreSQL 16 da https://www.postgresql.org/download/windows/

Durante l'installazione:

- Annotare la **password** del superuser `postgres`
- Porta di default: **5432**

### 3.2 Creare il database

Aprire **psql** o **pgAdmin** e eseguire:

```sql
-- Creare l'utente applicativo
CREATE USER salvadash WITH PASSWORD 'UNA_PASSWORD_SICURA_QUI';

-- Creare il database
CREATE DATABASE salvadash OWNER salvadash;

-- Concedere i permessi
GRANT ALL PRIVILEGES ON DATABASE salvadash TO salvadash;
```

---

## 4. Deploy del Backend (Node.js API)

### 4.1 Creare la directory di deploy

```powershell
# Creare la cartella di deploy
New-Item -ItemType Directory -Path E:\www\salvadash -Force
New-Item -ItemType Directory -Path E:\www\salvadash\backend -Force
New-Item -ItemType Directory -Path E:\www\salvadash\backend\logs -Force
New-Item -ItemType Directory -Path E:\www\salvadash\backend\uploads -Force
New-Item -ItemType Directory -Path E:\www\salvadash\backend\backups -Force
New-Item -ItemType Directory -Path E:\www\salvadash\shared -Force
```

### 4.2 Copiare i file dalla macchina di sviluppo

Dalla macchina di sviluppo, copiare i seguenti elementi:

```powershell
# --- Sul server, dalla cartella sorgente --- #

# Root workspace files (necessari per pnpm workspace)
Copy-Item -Path .\package.json -Destination E:\www\salvadash\ -Force
Copy-Item -Path .\pnpm-workspace.yaml -Destination E:\www\salvadash\ -Force
Copy-Item -Path .\pnpm-lock.yaml -Destination E:\www\salvadash\ -Force

# Shared (compilato)
Copy-Item -Path .\shared\dist -Destination E:\www\salvadash\shared\dist -Recurse -Force
Copy-Item -Path .\shared\package.json -Destination E:\www\salvadash\shared\ -Force

# Backend (JS compilato + prisma schema)
Copy-Item -Path .\backend\dist -Destination E:\www\salvadash\backend\dist -Recurse -Force
Copy-Item -Path .\backend\prisma -Destination E:\www\salvadash\backend\prisma -Recurse -Force
Copy-Item -Path .\backend\package.json -Destination E:\www\salvadash\backend\ -Force
Copy-Item -Path .\backend\prisma.config.ts -Destination E:\www\salvadash\backend\ -Force
Copy-Item -Path .\backend\ecosystem.config.json -Destination E:\www\salvadash\backend\ -Force

# Installare dipendenze sul server (include @prisma/engines, @prisma/client, ecc.)
cd E:\www\salvadash
pnpm install --filter backend --frozen-lockfile
```

> **IMPORTANTE**: Eseguire sempre `pnpm install` sul server invece di copiare `node_modules`.
> Questo garantisce che i binari nativi (es. `@prisma/engines`) siano compilati
> per l'architettura del server.

### 4.3 Creare il file .env di produzione

Creare `E:\www\salvadash\backend\.env`:

```env
# ─── Database ───────────────────────────────────────────────
# IMPORTANTE: se la password contiene caratteri speciali (@, #, %, ecc.)
# vanno codificati in formato URL. Es: @ → %40, # → %23, % → %25
DATABASE_URL="postgresql://salvadash:UNA_PASSWORD_SICURA_QUI@localhost:5432/salvadash?schema=public"

# ─── DB connection pool (opzionali, hanno default) ──────────
# Connessioni riusate dal pool pg sotto @prisma/adapter-pg.
# DB_POOL_MAX: max connessioni simultanee verso Postgres. Default 10.
#   Tenerlo sotto max_connections del server PG; alzare se molti utenti concorrenti.
# DB_POOL_IDLE_TIMEOUT_MS: chiude connessioni idle dopo N ms. Default 10000.
# DB_POOL_CONNECTION_TIMEOUT_MS: attesa max per ottenere una connessione prima di errore. Default 10000.
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT_MS=10000
DB_POOL_CONNECTION_TIMEOUT_MS=10000

# ─── JWT (CAMBIARE OBBLIGATORIAMENTE!) ───────────────────────
JWT_ACCESS_SECRET="generare-con-openssl-rand-hex-64"
JWT_REFRESH_SECRET="generare-con-openssl-rand-hex-64"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ─── SMTP ───────────────────────────────────────────────────
SMTP_HOST="smtp.office365.com"
SMTP_PORT=587
SMTP_USER="tua-email@dominio.com"
SMTP_PASS="password-smtp"
SMTP_SECURE=false
SMTP_FROM="tua-email@dominio.com"
SMTP_FROM_NAME="SalvaDash"

# ─── App ────────────────────────────────────────────────────
APP_URL="https://salvadash.tuodominio.com"
API_URL="https://salvadash.tuodominio.com"
API_PORT=3000
NODE_ENV="production"

# ─── Metrics (Prometheus) ──────────────────────────────────
# Bearer token che protegge GET /api/metrics.
# VUOTO o non impostato = endpoint /api/metrics DISABILITATO.
# Impostare un token segreto solo se Prometheus deve fare scraping.
# Lo scraper passa poi header: Authorization: Bearer <token>
METRICS_TOKEN=""

# ─── VAPID (Web Push) ──────────────────────────────────────
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:tua-email@dominio.com"

# ─── Seed ───────────────────────────────────────────────────
SEED_ROOT_NAME="Admin"
SEED_ROOT_EMAIL="admin@dominio.com"
SEED_ROOT_USERNAME="admin"
SEED_ROOT_PASSWORD="UNA_PASSWORD_SICURA"

SEED_BAKKO_NAME="Bakko"
SEED_BAKKO_EMAIL="bakko@dominio.com"
SEED_BAKKO_USERNAME="bakko"
SEED_BAKKO_PASSWORD="UNA_PASSWORD_SICURA"

SEED_EXCEL_PATH="./prisma/data/Risparmi.xlsx"

# ─── Backup ─────────────────────────────────────────────────
BACKUP_DIR="./backups"
BACKUP_RETENTION_DAYS=30
BACKUP_CLOUD_ENABLED=false
# Path al bin di PostgreSQL 18 sul server APP (deve contenere pg_dump.exe + psql.exe).
# OBBLIGATORIO in prod: il DB sta su un host LAN separato, e per fare i backup
# il server APP deve avere installati i client tools di Postgres 18 e puntarli qui.
PG_BIN_PATH="C:\Program Files\PostgreSQL\18\bin"
```

> **Generare i segreti JWT** con:
>
> ```powershell
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 4.4 Inizializzare il database

```powershell
cd E:\www\salvadash\backend

# Generare il client Prisma (v7 — legge prisma.config.ts)
npx prisma generate

# Applicare lo schema al database
npx prisma db push

# (Opzionale) Eseguire il seed per creare gli utenti iniziali
npx prisma db seed
```

> **Nota Prisma 7**: il progetto usa Prisma 7 con il nuovo provider `prisma-client`.
> Il file `prisma.config.ts` nella root del backend contiene la configurazione
> del datasource (URL database). Il client viene generato in `src/generated/prisma/`.
> Assicurarsi che `dotenv` sia installato (è già nelle dipendenze).

### 4.5 Avviare il backend con PM2

```powershell
cd E:\www\salvadash\backend

# Avviare l'app
pm2 start ecosystem.config.json

# Verificare che sia in esecuzione
pm2 status

# Salvare la configurazione PM2 (per auto-restart)
pm2 save

# Configurare PM2 per avviarsi come servizio Windows
pm2-startup install
```

### 4.6 Verificare che il backend risponda

```powershell
# Test health check
Invoke-RestMethod -Uri http://localhost:3000/api/health
# Deve restituire: { status: "ok", timestamp: "..." }
```

---

## 5. Deploy del Frontend (SPA statica su IIS)

### 5.1 Creare la cartella del sito

```powershell
New-Item -ItemType Directory -Path E:\www\salvadash\frontend -Force
```

### 5.2 Copiare i file del frontend

```powershell
# Copiare la build Vite
Copy-Item -Path .\frontend\dist\* -Destination E:\www\salvadash\frontend -Recurse

# Copiare il web.config per IIS
Copy-Item -Path .\frontend\web.config -Destination E:\www\salvadash\frontend\
```

La struttura finale sarà:

```
E:\www\salvadash\frontend\
├── web.config              ← Configurazione IIS (SPA + reverse proxy)
├── index.html              ← Entry point React
├── manifest.webmanifest    ← PWA manifest
├── sw.js                   ← Service worker
├── sw-push.js
├── sw-sync.js
├── workbox-*.js
├── favicon.svg
├── assets/                 ← JS/CSS con hash (cache immutable)
├── pwa-*.png               ← Icone PWA
├── splash-*.png            ← Splash screen iOS
└── ...
```

---

## 6. Configurazione IIS come Reverse Proxy

### 6.1 Creare il sito IIS

Aprire **IIS Manager** (inetmgr):

1. **Pannello sinistro** → click destro su **Sites** → **Add Website**
2. Configurare:
   - **Site name**: `SalvaDash`
   - **Physical path**: `E:\www\salvadash\frontend`
   - **Binding**:
     - Type: `http`
     - IP Address: `All Unassigned`
     - Port: `80`
     - Host name: `salvadash.tuodominio.com` (oppure lasciare vuoto per test)
3. Click **OK**

### 6.2 Verificare la configurazione URL Rewrite

Il file `web.config` copiato nella sezione 5.2 contiene già:

- **Reverse proxy** per `/api/*` → `http://localhost:3000/api/*`
- **Reverse proxy** per `/uploads/*` → `http://localhost:3000/uploads/*`
- **SPA fallback** → tutte le altre route servono `index.html`
- **Cache headers** ottimali per assets con hash
- **Security headers** (X-Content-Type-Options, X-Frame-Options, etc.)

### 6.3 Verificare che ARR sia abilitato

```powershell
# Verifica moduli installati
Get-WebGlobalModule | Where-Object { $_.Name -like "*arr*" -or $_.Name -like "*rewrite*" }
```

Se il reverse proxy non funziona, verificare:

1. **IIS Manager** → nodo server → **Application Request Routing Cache**
2. **Server Proxy Settings** → spuntare **Enable proxy** → **Apply**

---

## 7. Configurare HTTPS con certificato SSL

### 7.1 Opzione A: Certificato aziendale / acquistato

1. Importare il certificato `.pfx` in IIS:
   - **IIS Manager** → nodo server → **Server Certificates**
   - **Import...** → selezionare il file `.pfx`
2. Aggiungere il binding HTTPS al sito:
   - Click destro su **SalvaDash** → **Edit Bindings**
   - **Add** → Type `https`, porta `443`, selezionare il certificato
3. Redirect HTTP → HTTPS (opzionale ma consigliato):
   - Aggiungere questa regola all'inizio del `<rules>` nel `web.config`:

```xml
<rule name="HTTP to HTTPS" stopProcessing="true">
  <match url="(.*)" />
  <conditions>
    <add input="{HTTPS}" pattern="off" ignoreCase="true" />
  </conditions>
  <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
</rule>
```

### 7.2 Opzione B: Let's Encrypt con win-acme

```powershell
# Scaricare win-acme (tool gratuito Let's Encrypt per IIS)
# Download da: https://www.win-acme.com/

# Eseguire e seguire il wizard
.\wacs.exe

# Selezionare:
# 1. N: Create certificate (default settings)
# 2. Selezionare il sito SalvaDash
# 3. Confermare il dominio
# Il rinnovo automatico viene configurato come task schedulata
```

> **IMPORTANTE**: HTTPS è **obbligatorio** per le PWA in produzione. Senza HTTPS il Service Worker
> non si registrerà e le notifiche Push non funzioneranno.

---

## 8. Configurazione Firewall

```powershell
# Aprire la porta HTTP (80)
New-NetFirewallRule -DisplayName "HTTP In" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Aprire la porta HTTPS (443)
New-NetFirewallRule -DisplayName "HTTPS In" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# NON aprire la porta 3000 — il backend è accessibile solo via IIS reverse proxy
```

---

## 9. Verifica e Test

### 9.1 Checklist di verifica

```powershell
# 1. Backend in esecuzione?
pm2 status

# 2. Health check API
Invoke-RestMethod -Uri http://localhost:3000/api/health

# 3. IIS funzionante?
Invoke-RestMethod -Uri http://localhost/api/health

# 4. Frontend caricato?
Invoke-WebRequest -Uri http://localhost/ | Select-Object StatusCode

# 5. Reverse proxy funzionante?
Invoke-RestMethod -Uri http://localhost/api/health
```

### 9.2 Test dal browser

1. Aprire `https://salvadash.tuodominio.com`
2. Verificare che la pagina di login appaia
3. Accedere con le credenziali seed
4. Verificare nella DevTools del browser:
   - **Application** → Service Worker registrato
   - **Application** → Manifest caricato
   - **Network** → le chiamate `/api/*` rispondono correttamente

### 9.3 Test PWA su mobile

1. Aprire `https://salvadash.tuodominio.com` su iPhone/Android
2. **iOS**: Safari → icona condividi → "Aggiungi alla schermata Home"
3. **Android**: Chrome → banner "Installa app" oppure menu → "Installa app"
4. Verificare icona, splash screen e funzionamento offline

---

## 10. Manutenzione

### Aggiornamento dell'app

**Sulla macchina di sviluppo** — buildare:

```powershell
cd D:\Develop\AI\Salvadash
pnpm db:generate
pnpm build
```

**Sul server** — copiare e riavviare:

```powershell
# 1. Stoppa il backend
pm2 stop salvadash-api

# 2. Aggiornare il frontend (contenuto di frontend/dist/ → frontend/)
Copy-Item -Path .\frontend\dist\* -Destination E:\www\salvadash\frontend -Recurse -Force

# 3. Aggiornare shared (compilato)
Copy-Item -Path .\shared\dist -Destination E:\www\salvadash\shared\dist -Recurse -Force
Copy-Item -Path .\shared\package.json -Destination E:\www\salvadash\shared\ -Force

# 4. Aggiornare backend
Copy-Item -Path .\backend\dist -Destination E:\www\salvadash\backend\dist -Recurse -Force
Copy-Item -Path .\backend\prisma -Destination E:\www\salvadash\backend\prisma -Recurse -Force
Copy-Item -Path .\backend\package.json -Destination E:\www\salvadash\backend\ -Force
Copy-Item -Path .\backend\prisma.config.ts -Destination E:\www\salvadash\backend\ -Force
Copy-Item -Path .\backend\ecosystem.config.json -Destination E:\www\salvadash\backend\ -Force

# 5. Root workspace files
Copy-Item -Path .\package.json -Destination E:\www\salvadash\ -Force
Copy-Item -Path .\pnpm-workspace.yaml -Destination E:\www\salvadash\ -Force
Copy-Item -Path .\pnpm-lock.yaml -Destination E:\www\salvadash\ -Force

# 6. Installare/aggiornare dipendenze (include binari nativi come @prisma/engines)
cd E:\www\salvadash
pnpm install --filter backend --frozen-lockfile

# 7. Applicare eventuali migrazioni DB
cd E:\www\salvadash\backend
npx prisma generate
npx prisma db push

# 8. Riavviare il backend
pm2 restart salvadash-api
pm2 logs salvadash-api --lines 20
```

> **NON copiare `node_modules`** dalla macchina dev. Eseguire sempre `pnpm install`
> sul server per garantire che i binari nativi siano compilati per l'architettura corretta.

### Visualizzare i log

```powershell
# Log PM2
pm2 logs salvadash-api

# Log IIS
Get-Content C:\inetpub\logs\LogFiles\W3SVC*\*.log -Tail 50
```

### Backup database

```powershell
# Backup manuale PostgreSQL
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U salvadash -d salvadash -F c -f "C:\Backups\salvadash_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
```

### Riavvio servizi

> **CRITICO**: in prod il server ospita molti altri siti — NON usare `iisreset` (riavvia tutto IIS). Riavvia SOLO il sito SalvaDash.

```powershell
# Riavviare SOLO il sito SalvaDash (non tutto IIS)
Import-Module WebAdministration
Stop-Website -Name "Salvadash"
Start-Website -Name "Salvadash"

# (Solo se vuoi anche il pool dedicato)
# Restart-WebAppPool -Name "<Salvadash-AppPool>"

# Riavviare backend
pm2 restart salvadash-api

# Riavviare PostgreSQL (solo se necessario)
Restart-Service -Name postgresql-x64-18
```

---

## Architettura finale

```
┌─────────────────────────────────────────────────┐
│                  Client Browser                  │
│            (PWA installata / Browser)            │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS :443
                       ▼
┌─────────────────────────────────────────────────┐
│              IIS (Windows Server 2019)           │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  SalvaDash Site (E:\www\salvadash\frontend)   │   │
│  │                                           │   │
│  │  /assets/*, /*.html, /*.js, /*.css, ...  │   │
│  │  → Serve file statici (frontend build)   │   │
│  │                                           │   │
│  │  /api/*  → Reverse Proxy ─────────────┐  │   │
│  │  /uploads/* → Reverse Proxy ──────────┤  │   │
│  │                                        │  │   │
│  │  /* (fallback) → index.html (SPA)     │  │   │
│  └────────────────────────────────────────┘  │   │
└──────────────────────┬───────────────────────┘   │
                       │ http://localhost:3000      │
                       ▼                            │
┌──────────────────────────────────┐               │
│      Node.js Backend (PM2)       │               │
│   E:\www\salvadash\backend      │               │
│                                  │               │
│   Express API :3000              │               │
│   ├── /api/auth/*                │               │
│   ├── /api/entries/*             │               │
│   ├── /api/accounts/*            │               │
│   ├── /uploads/* (static)        │               │
│   └── ...                        │               │
└──────────────┬───────────────────┘               │
               │                                    │
               ▼                                    │
┌──────────────────────────────┐                   │
│     PostgreSQL :5432         │                   │
│     Database: salvadash      │                   │
└──────────────────────────────┘                   │
```

---

## Risoluzione problemi comuni

| Problema                      | Causa probabile            | Soluzione                                    |
| ----------------------------- | -------------------------- | -------------------------------------------- |
| 502 Bad Gateway su `/api/*`   | Backend non in esecuzione  | `pm2 status` → `pm2 restart salvadash-api`   |
| 404 su tutte le route         | URL Rewrite non installato | Installare URL Rewrite Module                |
| Reverse proxy non funziona    | ARR non abilitato          | IIS Manager → ARR Cache → Enable proxy       |
| Service Worker non registrato | Manca HTTPS                | Configurare certificato SSL                  |
| PWA non installabile          | Errore manifest o no HTTPS | Verificare DevTools → Application            |
| Database connection failed    | PostgreSQL non avviato     | `Get-Service postgresql*` → `Start-Service`  |
| Errore Prisma generate        | Node.js non nel PATH       | Riavviare terminale dopo installazione Node  |
| Asset non caricati (MIME)     | Tipi MIME mancanti         | Il web.config già configura i tipi necessari |
