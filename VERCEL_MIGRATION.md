# otmOS Vercel Migration Plan

## Core decision
`otmOS` should not be deployed to Vercel as Streamlit. The Vercel-friendly path is a Next.js frontend plus remote APIs/workers.

## Target architecture

### Frontend
- Next.js app (`otmos-web`)
- Hosted on Vercel
- Handles:
  - auth/session UX
  - forms/workflows
  - run history views
  - admin configuration UI

### Remote services
1. **Order Service**
   - generate SO/PO payloads
   - validate imports
   - post to non-prod OTM endpoints

2. **EDI Service**
   - parse/enrich X12
   - manage mappings
   - ingest docs
   - search knowledge base

3. **QA Runner Service**
   - discover tests
   - run test/cycle
   - collect logs/artifacts
   - expose run status APIs

## Migration sequence

### Phase 1: Frontend shell
- app layout
- tool navigation
- shared config/session UX

### Phase 2: QA Runner
Best first cloud feature because it already assumes a backend contract.
- `/admin`
- `/qa/tests`
- `/qa/cycles`
- `/qa/runs`

### Phase 3: EDI Explainer
- `/edi/explain`
- `/edi/ingestion`
- `/edi/knowledge`

### Phase 4: Order Generator
- `/orders/generator`
- `/orders/import`
- `/orders/results`

## API contract notes

### QA Runner API
- `GET /health`
- `GET /config`
- `POST /config`
- `GET /tests`
- `GET /runs?limit=50`
- `POST /runs`
- `GET /runs/:id`
- `GET /cycles`
- `POST /cycles`
- `POST /cycles/:id/run`

### EDI API
- `POST /edi/explain`
- `GET /edi/mappings`
- `POST /edi/mappings`
- `GET /edi/docs`
- `POST /edi/docs`
- `POST /edi/docs/:id/reprocess`
- `GET /edi/search?q=...`

### Order API
- `POST /orders/generate`
- `POST /orders/import`
- `POST /orders/post`

## Non-goals
- running Selenium/npm directly in Vercel functions
- filesystem-local persistence as the primary state model
- embedding Streamlit into Vercel as the main production UI
