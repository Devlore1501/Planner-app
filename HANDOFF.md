# Mailift Planner — Handoff di sessione

> File di stato per riprendere il lavoro in una nuova sessione Claude.
> In una sessione nuova: "Leggi HANDOFF.md e continua da lì".
> Aggiornare questo file a fine sessione se cambia qualcosa di sostanziale.

**Ultimo aggiornamento**: 2026-07-03 (sera) · **Repo**: `Devlore1501/Planner-app`
(estratta da `Devlore1501/mailift-os` con storia pulita — il sistema di fatturazione
dell'agenzia resta nel monorepo originale, separato da qui)

## Cos'è

Web app SaaS multi-cliente per un'agenzia email marketing (Mailift, founder Lorenzo):
genera **calendari editoriali email MENSILI** per brand eCommerce DTC su Klaviyo,
con testi scritti da Claude, template Canva abbinati da un DB Notion, e
pubblicazione del calendario approvato su Notion.

- Repo dedicata: solo questo prodotto, niente altro codice dell'agenzia dentro
- Backend FastAPI + SQLAlchemy (SQLite in locale, Postgres in produzione) (`backend/`, porta 8001)
- Frontend React 18 + Vite + TS + Tailwind + shadcn + react-query (`frontend/`, porta 5174)
- Contratto API: `design/api_contract.md` (v1 + aggiornamenti fino a v1.5 in coda)
- Avvio locale: `./start.sh` (kill automatico istanze zombie; fix bash 3.2 macOS)
- Deploy produzione: **Railway**, vedi `DEPLOY.md` — Docker multi-stage
  (`Dockerfile`) che serve backend+frontend da un solo servizio/URL
- Test: `cd backend && ../.venv/bin/python tests/smoke_test.py` (~80 check, mock mode)

## Funzionalità completate

1. **Multi-tenant**: ogni brand è un workspace isolato (`brand_id` su tutto), switch da topbar
2. **Profilo brand**: descrizione/tono/mission/positioning, avatar (desideri/obiezioni/linguaggio),
   email a settimana (base ×4 per il mensile), **paese di destinazione** (default IT)
3. **Brand identity da PDF**: upload brand book (PDF/TXT/MD, max 3 file/20MB) →
   `POST /brands/{id}/extract-profile?apply=bool` estrae profilo+avatar+prodotti.
   UI: dialog "Nuovo brand" (upload opzionale) e card nella pagina Profilo
4. **Catalogo**: prodotti (best seller ⭐, stagionalità), offerte con codici, occasioni
5. **Suggerimenti festività**: `POST /brands/{id}/occasions/suggest {month}` → Claude analizza
   festività/ponti/ricorrenze del paese del brand + idee email; card con checkbox nella tab
   Occasioni → inserimento a calendario
6. **Klaviyo per-brand** (chiave nel DB, mai in chiaro): sync segmenti+campagne+metriche
   (client DIFENSIVO: prova varianti di richiesta e degrada su 400 — page[size] max 10,
   additional-fields rifiutati, sort/filtri non supportati, conteggi per-segmento cap 30)
7. **Generazione piano MENSILE** (`month_start` YYYY-MM-01, colonna DB si chiama ancora
   `week_start` per compatibilità): asincrona (thread + polling 2s), structured output.
   **Regola 70/20/10**: ~70% educativo (nurturing/storytelling), ~20% prodotto (vendita),
   ~10% promo. Barra a 3 segmenti nella UI. Claude considera festività del paese
8. **Card email**: giorno+orario, obiettivo (badge), FORMATO (badge grafica/testuale),
   tema/angolo, segmento+rationale, 2-3 oggetti A/B, preview, prodotti/offerta, template
   Canva con link+anteprima. **Formati bilanciati ~60% grafiche / 40% testuali** (prompt),
   mai solo immagini; promo/prodotto grafiche, storytelling/nurturing spesso testuali.
   TESTUALI: body in prosa 1:1, niente template. GRAFICHE: body vuoto e `blocks` = scaletta
   per il designer (banner: headline≤7/sub≤14/CTA/visual; sezioni con micro-copy ≤25 parole
   e campo visual che spinge INFOGRAFICHE per evitare muri di testo; info; cta_finale).
   UI: vista "Scaletta per il designer" + editor per-blocco nel dialog; contatore formati
   sotto la barra 70/20/10; pubblicazione Notion con select Formato e scaletta a sezioni.
   Modifica inline + rigenerazione singola con istruzioni
9. **Template Canva**: due sorgenti (una attiva alla volta, ogni import rimpiazza la libreria):
   a) **set tipi × varianti** — il flusso reale di Lorenzo: elenco Notion "About x3, Flash
   Sale x3, ..." (45 tipi × 3 = 135 template) incollato così com'è nella card della pagina
   Template → `GET/PUT /api/templates/set` (`entries_text` grezzo o `entries` strutturati);
   categorie AUTO-assegnate da mappa keyword in `services/canva_set.py::_CATEGORY_RULES`
   (promo/educativo/prodotto/storytelling/social proof/engagement/...); ogni variante ha una
   pagina globale nel file Canva → deep-link `...edit#N` che apre la pagina giusta;
   b) sync dal DB Notion. **Anteprime**: export PNG del file Canva (immagini numerate o zip)
   → `POST /api/templates/previews`, match per numero di pagina dal nome file, servite da
   `GET /api/templates/previews/{page}` (salvate in data/previews/), mostrate nella griglia
   e nelle card email (Template.preview_url, anche dentro canva_template delle email)
10. **Approvazione → pubblicazione Notion**: database calendario con pagina per email
    (colonna "Sequenza" per le email di lanci/promo)
11. **Mock mode completo** senza ANTHROPIC_API_KEY (demo deterministica di tutto)
12. **UI "studio editoriale"**: sidebar scura a inchiostro + canvas carta, Fraunces (titoli) +
    Plus Jakarta Sans self-hosted via Fontsource, indigo+ambra, dark mode pronta
13. **Lanci & Promo → sequenze email**: tab "Lanci & Promo" nel Catalogo (nome, tipo
    lancio|promo, date, protagonista, note, attivo). Ogni voce attiva e rilevante per il
    mese diventa una SEQUENZA coordinata nel piano secondo la procedura testata
    dell'agenzia (`design/PROCEDURA_PROMO.md`, incollata da Lorenzo):
    promo = teaser "non comprare oggi" (no sconto svelato, chiedi reply) → annuncio
    grafico essenziale → follow-up testuale con social proof (g.3, e g.5 se 7gg) →
    last call (mattina, urgenza+countdown) → final reminder (sera, <5h, testuale,
    segmento "cliccato senza acquistare" esclusi acquirenti 20gg). 3gg = senza
    follow-up; 48h = annuncio+last call+final reminder; 24h = annuncio+last call.
    Lancio = teaser ~5gg prima → annuncio → follow-up social proof (+last call se
    offerta a scadenza). Email etichettate `campaign {name, role}` (badge viola 🚀
    nelle card); piano con sezione "Lanci & Promo del mese" = strategia spiegata +
    proposte extra (`plan.campaigns`). Le sequenze contano nelle quote 70/20/10.
    API: CRUD `/brands/{id}/launches` + `PATCH /launches/{id}`; prompt/schema in
    `claude_ai.py`, mock in `mockdata.py::_mock_sequence`
14. **Login + pacchetto grafiche (money model)**: due ruoli — **agency** (tutti i
    brand, integrazioni/template/utenti) e **client** (un solo brand, sola lettura sul
    catalogo, può approvare/pubblicare il proprio piano). JWT via `Authorization:
    Bearer`, bootstrap del primo utente agency da `PLANNER_ADMIN_EMAIL/PASSWORD` se il
    DB non ha ancora utenti. Ogni brand ha `package_total`/`package_used` (pool che si
    esaurisce, nessun rinnovo automatico); l'approvazione del piano (draft→approved)
    conta le email `format != testuale` nel piano e le scala dal pacchetto, **409 se
    non basta**; tornare a bozza (approved→draft) storna i crediti. Nessun auto-publish
    collegato all'approvazione: sono due endpoint separati (`PATCH status=approved` poi
    `POST /publish`), entrambi permessi al cliente sul proprio brand — il frontend li
    mostra come due bottoni distinti in sequenza.
    Backend: `models/db_models.py::User` (email, password_hash, role, brand_id),
    `api/deps.py` (`get_current_user`, `require_agency`, `require_brand_access`,
    `check_brand_access`), `api/auth.py` (login/me + CRUD utenti agency-only),
    `services/auth.py` (bcrypt + PyJWT). Router interamente agency-only via
    `dependencies=[Depends(require_agency)]`: `integrations.py` (Klaviyo+Notion),
    quasi tutto `templates.py` (eccetto `GET /previews/{page}` lasciato pubblico
    apposta, altrimenti i tag `<img>` non riescono a mandare l'header Authorization).
    `catalog.py`: liste con `require_brand_access`, scritture con `require_agency`
    (client = sola lettura su prodotti/offerte/occasioni/lanci).
    Frontend: `lib/auth.tsx` (AuthProvider/useAuth, token in localStorage),
    `lib/api.ts` (`setAuthToken`, header automatico, `setUnauthorizedHandler` per
    logout su 401), `pages/Login.tsx`, guardie in `App.tsx` (`RequireAuth`,
    `RequireAgency`, `HomeRedirect` salta la Dashboard e porta il client dritto al
    proprio piano). Sidebar/TopBar/BrandSwitcher adattati per ruolo (client: niente
    switcher — badge statico, niente Integrazioni/Template/Impostazioni). Ogni pagina
    con azioni di scrittura (Catalog, Plans, PlanDetail retry-on-error) nasconde i
    controlli agency-only per il client invece di lasciarli lì a fallire con 403.
    UI pacchetto: card dedicata in `BrandProfile.tsx` (barra di progresso, ricarica
    per agency); hint crediti disponibili vicino al bottone "Approva piano" in
    `PlanDetail.tsx`. Gestione utenti (creare/reset password/eliminare account
    cliente) in `Settings.tsx` (agency-only).
    Verificato end-to-end con Playwright reale (non solo API): login, sidebar/nav
    per ruolo, catalogo sola-lettura per il client, approvazione con scalo
    pacchetto visibile in tempo reale sul profilo brand, blocco con toast quando il
    pacchetto non basta.

## Deploy (nuovo)

- `Dockerfile`: build multi-stage, frontend compilato e servito dal
  backend FastAPI (mount statico + fallback SPA in `app/main.py`, attivo solo
  se `PLANNER_FRONTEND_DIST` è impostata — in dev locale non lo è, Vite gira
  separato come sempre)
- `app/db.py`: `DATABASE_URL` in ambiente → Postgres (schema `postgres://`
  riscritto in `postgresql+psycopg://`); senza → SQLite come prima
- `_migrate()` in `main.py` ora dialect-agnostic (usa `sqlalchemy.inspect`,
  non più `PRAGMA table_info`) — stessa funzione per SQLite e Postgres
- Guida passo-passo Railway (Postgres plugin, volume `/data` per le anteprime
  Canva, env vars): `DEPLOY.md`
- Verificato: build Docker equivalente testata manualmente (daemon Docker non
  disponibile nel sandbox di sessione) avviando uvicorn con
  `PLANNER_FRONTEND_DIST` puntato alla `dist/` compilata — API, asset statici
  e fallback SPA su rotte profonde tutti confermati funzionanti; route
  `/api/*` non esistenti ritornano 404 pulito (non più HTML del fallback)

## Configurazione (stato di Lorenzo)

- Repo clonata in `~/mailift-planner` sul suo Mac (bash 3.2, Python 3.13, Node 20) —
  prima era `~/mailift-os/planner`, estratta in repo dedicata `Devlore1501/Planner-app`
- Klaviyo: chiave collegata per il brand "bergamo", sync FUNZIONANTE (dopo i fix difensivi) —
  dati nel DB locale, se Lorenzo vuole tenerli deve copiare
  `~/mailift-os/planner/backend/data/planner.db` in `~/mailift-planner/backend/data/`
  dopo il primo clone (altrimenti riparte da un DB vuoto)
- `ANTHROPIC_API_KEY`: da verificare se già in `.env` (senza → mock mode, badge giallo) —
  copiare anche `.env` dal vecchio percorso se presente
- Notion: token/DB template/pagina calendari NON ancora configurati (si fa da UI → Impostazioni)
- Env letto da `.env` in root repo o `~/.secrets/mailift/.env`
- `PLANNER_CLAUDE_MODEL` default `claude-opus-4-8`
- Login attivo: primo utente agency bootstrap da `PLANNER_ADMIN_EMAIL`/`PASSWORD`
  (default `admin@mailift.local` / `mailift-admin` se non impostate — Lorenzo deve
  cambiare la password dal primo login, Impostazioni → Utenti)
- Su Railway servono in più: `PLANNER_JWT_SECRET` (obbligatoria, altrimenti le sessioni
  saltano ad ogni redeploy) e volentieri `PLANNER_ADMIN_EMAIL/PASSWORD` personalizzate

## Dettagli tecnici da ricordare

- Micro-migrazioni SQLite in `app/main.py::_migrate()` (ALTER TABLE per colonne nuove;
  `create_all` non altera tabelle esistenti)
- `Plan.month_start` è `mapped_column("week_start", ...)` — NON rinominare la colonna DB
- Klaviyo: `_paginate()` in `services/klaviyo.py` ritorna (dati, params usati) e fa fallback
  automatico su 400 — estendere le liste `attempts` per nuovi endpoint
- Estrazione PDF: Claude legge i PDF nativamente (document block base64); mock usa pypdf
- Il frontend agent-generated segue `lib/queries.ts` (hook react-query centralizzati, chiavi
  in `keys`) — mantenere il pattern per nuovi endpoint
- Verifiche fatte con Playwright headless (`/opt/pw-browsers/chromium` nel container di sessione)

## Possibili prossimi passi (non richiesti, da confermare con Lorenzo)

- Rinnovo automatico/periodico del pacchetto grafiche (oggi è un pool manuale, mai
  auto-rinnovato — scelta esplicita di Lorenzo)
- Notifica email/reset password self-service per gli account cliente (oggi il reset
  lo fa l'agenzia da Impostazioni)
- Creazione bozze campagna direttamente su Klaviyo (write API)
- Vista calendario visuale (griglia mese) oltre alla lista card
- Altri canali (SMS/WhatsApp) come nuovi servizi in `app/services/`
- Docker compose per avvio one-command
