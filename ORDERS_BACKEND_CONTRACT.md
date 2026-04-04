# Orders Backend Contract for otmOS Web

Frontend env:
```bash
NEXT_PUBLIC_ORDERS_API_BASE=https://orders-service.example.com/api
```

Fallback if unset:
- `/api/orders`

## Endpoints

### POST /generate
Request:
```json
{
  "orderKind": "Sales Orders",
  "inputMode": "Manual (builder)",
  "domain": "THG",
  "baseXid": "SO_09000-1128",
  "currency": "USD"
}
```

Response:
```json
{
  "xml": "<Order ... />",
  "summary": {
    "orderKind": "Sales Orders",
    "inputMode": "Manual (builder)",
    "domain": "THG",
    "baseXid": "SO_09000-1128"
  }
}
```

### POST /post
Request:
```json
{
  "endpoint": "https://pod-dev.../WMServlet",
  "username": "integration_user",
  "password": "secret",
  "xml": "<Order ... />"
}
```

Response:
```json
{
  "result": {
    "id": "...",
    "status": "accepted",
    "message": "Demo post accepted for non-prod endpoint."
  }
}
```

## Production direction
- restore full OTM XML parity from current generator logic
- CSV/XLSX import validation on backend
- posting guardrails for non-prod only
- secure secret handling server-side
