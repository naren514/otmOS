# QA Backend Contract for otmOS Web

This document defines the first production backend to replace the embedded demo QA API.

## Frontend config
Vercel env var:

```bash
NEXT_PUBLIC_QA_API_BASE=https://qa-runner.example.com/api
```

If unset, the frontend falls back to the embedded demo API at `/api/qa`.

## Auth
Preferred:
- `Authorization: Bearer <token>`

Optional future:
- per-user auth/session + server-side token exchange

## Endpoints

### GET /health
Response:
```json
{ "ok": true, "mode": "worker", "version": "1.0.0" }
```

### GET /config
Response:
```json
{
  "config": {
    "baseUrl": "https://qa.example/otm",
    "username": "qa.user",
    "browser": "chrome"
  }
}
```

### POST /config
Request:
```json
{
  "baseUrl": "https://qa.example/otm",
  "username": "qa.user",
  "browser": "chrome"
}
```

### GET /tests
Response:
```json
{
  "tests": [
    {
      "id": "Test_01_Login",
      "file": "Tests/SanityBatch/Test_01_Login.ts",
      "tags": ["sanity", "login"],
      "title": "Login"
    }
  ]
}
```

### GET /runs?limit=50
Response:
```json
{
  "runs": [
    {
      "id": "run_123",
      "testId": "Test_01_Login",
      "startedAt": "2026-04-04T05:00:00.000Z",
      "finishedAt": "2026-04-04T05:01:00.000Z",
      "status": "passed",
      "error": null,
      "artifacts": {
        "summary": "...",
        "execLog": "...",
        "screenshots": ["https://..."]
      }
    }
  ]
}
```

### POST /runs
Request:
```json
{
  "testId": "Test_01_Login",
  "password": "session-only-secret"
}
```

Response:
```json
{ "run": { "id": "run_123", "status": "queued", "testId": "Test_01_Login", "startedAt": "..." } }
```

### GET /cycles
Response:
```json
{
  "cycles": [
    {
      "id": "cycle_123",
      "name": "ocean smoke",
      "testIds": ["Test_01_Login", "Test_08_ShipmentSearch"],
      "createdAt": "..."
    }
  ]
}
```

### POST /cycles
Request:
```json
{
  "name": "ocean smoke",
  "testIds": ["Test_01_Login", "Test_08_ShipmentSearch"]
}
```

### POST /cycles/:id/run
Response:
```json
{
  "result": {
    "cycleId": "cycle_123",
    "createdRuns": [{ "id": "run_1", "testId": "Test_01_Login", "status": "queued" }]
  }
}
```

## Status values
- `queued`
- `running`
- `passed`
- `failed`

## Backend responsibilities
- discover available tests from real runner substrate
- validate test ids
- avoid persisting password beyond request scope
- collect artifacts/logs/screenshots
- return stable test ids and run ids
- implement server-side queueing / worker execution

## Initial production target
A separate Node service running on Cloud Run / Railway / Render, backed by:
- Selenium/Playwright runner
- object storage for artifacts
- durable DB for config/runs/cycles
