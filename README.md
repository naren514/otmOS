# otmOS Web

Vercel-friendly frontend for otmOS.

## Why this exists
The original `otmOS` Streamlit app is useful for fast local prototyping, but it is not a natural deployment target for Vercel. This app is the production-direction frontend for Vercel deployment.

## Planned feature parity
- Order Generator
- EDI Explainer
- OTM QA Runner

## Architecture direction
- **Frontend:** Next.js on Vercel
- **Execution/API services:** remote backends for OTM posting, EDI enrichment/knowledge, and QA execution
- **Secrets:** environment variables / server-side secret handling, not browser-persisted plaintext

## Initial migration priorities
1. Shared shell/navigation for otmOS tools
2. QA Runner UI (best cloud fit)
3. EDI Explainer UI + API integration
4. Order Generator UI + posting API integration

## Run locally
```bash
npm install
npm run dev
```
