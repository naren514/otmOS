# EDI Backend Contract for otmOS Web

Frontend env:
```bash
NEXT_PUBLIC_EDI_API_BASE=https://edi-service.example.com/api
```

Fallback if unset:
- `/api/edi`

## Endpoints

### POST /explain
Request:
```json
{
  "version": "4010",
  "txSet": "204",
  "carrier": "industry",
  "elementSep": "*",
  "segmentTerm": "~",
  "x12": "ISA*..."
}
```
Response:
```json
{
  "rows": [
    {
      "segIndex": 1,
      "segment": "B2",
      "pos": 3,
      "value": "SCAC",
      "meaning": "Standard Carrier Alpha Code",
      "notes": "",
      "source": "mapping"
    }
  ]
}
```

### GET /search?q=...
Response:
```json
{
  "mappings": [],
  "docs": []
}
```

### POST /mappings
Request:
```json
{
  "version": "4010",
  "txSet": "204",
  "carrier": "industry",
  "segment": "B2",
  "elementPos": 3,
  "code": "SCAC",
  "meaning": "Standard Carrier Alpha Code",
  "notes": "",
  "source": "user"
}
```

### POST /docs
Request:
```json
{
  "version": "4010",
  "txSet": "204",
  "carrier": "industry",
  "sourceName": "Carrier 204 Guide",
  "notes": "optional",
  "rawText": "..."
}
```

## Production direction
- persistent DB for mappings/docs
- vector or keyword search for KB
- optional LLM enrichment layer for unmapped rows
