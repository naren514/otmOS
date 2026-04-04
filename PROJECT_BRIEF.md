# otmOS / otmos-web — Project Brief

_Last updated: 2026-04-04_

## Purpose
Build `otmOS` as a deployable operations/integration toolbox for Oracle Transportation Management workflows.

Current top-level sections:
- Order Generator
- EDI Explainer
- Integration Tools
- Database Tools
- OTM QA

## Architecture Direction
Original direction was a local Streamlit prototype in `otmOS/`.
Current direction is a deployable split-stack:
- `otmos-web/` — Next.js frontend
- `otmos-qa-runner/` — Selenium-backed QA runner API
- `otmos-edi-service/` — EDI backend scaffold
- `otmos-orders-service/` — Orders backend scaffold

## Current UI State
### Branding / Navigation
- Sidebar brand updated to `otmOS`
- Removed subtitle `Vercel-friendly frontend`
- Home page title now `otmOS`
- Added left-nav sections:
  - `Integration Tools`
  - `Database Tools`

## Integration Tools
Implemented under `/integration`:
- `/integration/xml-validator`
- `/integration/xpath-generator`
- `/integration/json-validator`
- `/integration/jsonpath-generator`

### XML Validator — Current State
#### Goal
Validate XML against real OTM XSD schemas plus practical OTM business-rule checks.

#### Implemented
API routes:
- `src/app/api/integration/xml-validator/route.ts`
- `src/app/api/integration/xml-validator/sample/route.ts`
- `src/app/api/integration/xml-repair/route.ts`

Behavior:
- Reads OTM schemas from `otmos-web/data/otmxsd`
- Uses `xmllint --schema` for server-side XSD validation
- Supports auto-detect and manual schema selection
- Supports sample loading, pretty-print, drag/drop XML input
- Sanitizes validator output to avoid leaking temp file paths
- Parses xmllint line/column output more reliably
- Adds OTM semantic/business-rule checks on top of XSD validation
- Adds repair workflow:
  - Suggest fixes
  - Generate corrected XML draft
  - Apply safe fixes
  - Diff preview

#### Semantic / Business Rule Layer
Current rule pack includes checks for:
- generic `*Gid` / `Xid` completeness
- generic `*Refnum` / `*RefnumValue`
- alias qualifier/value pairs
- remarks and remark text
- GLogDate / TZId completeness and basic format heuristics
- TransmissionHeader / AckSpec completeness
- ShipmentStatus completeness
- object-family heuristics for:
  - Shipment / ShipmentStatus
  - Order / Release / OrderBase / OrderMovement / OrderStatus
  - Finance / Invoice-like objects
  - Location
  - Item
  - Contact

#### XML Validator UX
Current state after multiple iterations:
- cleaner validation result area
- no duplicated raw error output in the main view
- line numbers fixed for parser-style xmllint errors
- pretty-print button
- tabbed results demo in Validation Result pane:
  - Summary
  - Business Rules
  - Schema Errors
  - Repair
  - Technical
- Root / Namespace Analysis section was removed per user request
- left sidebar width adjusted to 200px for more app space

#### OTM Schema Bundle Source
User provided:
- `~/Documents/otmxsd.zip`
- sample XML: `~/Documents/otmxsd/shipmentstatus.xml`

Copied/unpacked into project:
- `otmos-web/data/otmxsd`
- `otmos-web/data/samples/shipmentstatus.xml`

Important compatibility fix:
- created `TransmissionCommon.xsd` from `TransmissionCommon.xsd.xml`

#### Validation Insight Learned
- `TransactionHeader` is optional in `TransmissionCommon.xsd`
- the provided shipment-status sample still fails `Transmission.xsd` because the schema expects a transaction-position element (e.g. `GLogXMLTransaction`) rather than direct `ShipmentStatus` in the current slot
- key product insight: OTM validation requires **XML well-formedness + XSD validation + OTM semantic/business rules**; XSD alone misses many practical OTM requirements

### XPath Generator
Implemented at `/integration/xpath-generator`.
Features added:
- XML paste + XPath generation
- filter
- pretty-print button
- export to Excel-friendly CSV

### JSON Validator / JSONPath Generator
Implemented and working as lightweight browser-side utilities.

## Database Tools
Added under `/database`.

### Source Material
Two Oracle dictionary exports were provided:
1. `~/Documents/data_dictionary_diagrams643.zip`
   - old diagram-oriented export
   - useful for subject-area diagram browsing
2. `~/Downloads/data_dictionary653.zip`
   - richer HTML dictionary with real table definitions and field descriptions
   - this became the primary source for table/field exploration

### Implemented Pages
- `/database`
- `/database/data-dictionary`
- `/database/tables`
- `/database/sql-builder`

### Data Dictionary Explorer
Uses the older diagram export in `public/data_dictionary_diagrams`.
Features:
- subject area list
- search
- embedded legacy HTML diagram viewer

### Table Explorer
Backed by the richer `data_dictionary653.zip` source.

Current implementation:
- extracted data dictionary into:
  - `public/data_dictionary653/...`
- normalized index generated at:
  - `data/data-dictionary-index.json`
- current indexed table count after filtering: **1964**
- `P_` tables were removed from the indexed set per user request

API:
- `src/app/api/database/tables/route.ts`

Features:
- subject area grouping (heuristic but improved)
- table search
- field-level detail view
- field descriptions/comments
- quick-jump favorites for common tables
- field badges (GID / XID / DATE/TIME / AMOUNT / STATUS / REFNUM)
- field export to CSV
- related tables panel
- global field search across all indexed fields
- one-click handoff from Table Explorer to SQL Builder (`Open in SQL Builder`)

### Relationships / Join Metadata
Important discovery:
- the richer export contains FK hints in `index_<TABLE>.html` pages (e.g. `SOURCE_LOCATION_GID (FK: LOCATION)`)
- a script was added to augment the normalized index with relationship metadata:
  - `scripts/augment-data-dictionary-relationships.js`
- relationships were written back into `data/data-dictionary-index.json`
- examples verified:
  - `SHIPMENT` has 93 relationship entries
  - `INVOICE` has 31
  - `ORDER_RELEASE` has 83

### SQL Builder — Current State
Implemented at `/database/sql-builder`.

Current capabilities:
- choose base table
- choose fields from base table
- query templates:
  - Select rows
  - Count rows
  - Find by GID
  - Date range query
- add suggested joins
- joined-table field selection
- manual join condition editing
- copy generated SQL
- accepts handoff from Table Explorer via querystring (`?table=...`)

Current known limitation / revisit point:
- SQL Builder still needs significant UX and logic improvement
- user explicitly said: **“We have much room improve in SQL builder - lets revisit it”**
- although FK relationship metadata now exists in the index, the SQL Builder join-suggestion UX still needs polish and verification in the live UI
- an API stale-cache issue was found and fixed by removing in-memory caching from `/api/database/tables`
- the SQL Builder now displays:
  - suggested joins count
  - relationship entry count on the base table
- this was added to help debug why joins were not visibly appearing for tables like `INVOICE`

## Main Files Touched This Session
### Core app/nav
- `src/components/Shell.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`

### Integration Tools
- `src/app/integration/page.tsx`
- `src/app/integration/xml-validator/page.tsx`
- `src/app/integration/xpath-generator/page.tsx`
- `src/app/integration/json-validator/page.tsx`
- `src/app/integration/jsonpath-generator/page.tsx`
- `src/app/api/integration/xml-validator/route.ts`
- `src/app/api/integration/xml-validator/sample/route.ts`
- `src/app/api/integration/xml-repair/route.ts`
- `data/otmxsd/*`
- `data/samples/shipmentstatus.xml`

### Database Tools
- `src/app/database/page.tsx`
- `src/app/database/data-dictionary/page.tsx`
- `src/app/database/tables/page.tsx`
- `src/app/database/sql-builder/page.tsx`
- `src/app/api/database/data-dictionary/route.ts`
- `src/app/api/database/tables/route.ts`
- `public/data_dictionary_diagrams/*`
- `public/data_dictionary653/*`
- `data/data-dictionary-index.json`
- `scripts/augment-data-dictionary-relationships.js`

## Resume Priorities
When resuming, start here:

### 1) Revisit SQL Builder
Highest-priority next work.
Focus areas:
- confirm FK-based join suggestions render correctly in live UI for tables like `INVOICE`
- improve join suggestion presentation and ranking
- improve multi-table field selection UX
- add more intuitive SQL-builder interactions inspired by real schema-browser/query-builder tools

### 2) Database Tools polish
- improve subject-area grouping further
- leverage relationship metadata more deeply
- potentially add reverse-relationship browsing / join graph exploration

### 3) XML Validator polish
- continue improving OTM semantic rule packs
- consider better desktop layout / tabs finalization after user feedback

## Resume Prompt
When resuming, start with:
1. Review `otmos-web/PROJECT_BRIEF.md`
2. Open `/database/sql-builder`
3. Test base tables like `INVOICE`, `SHIPMENT`, `ORDER_RELEASE`
4. Verify whether FK-based join suggestions visibly render
5. Improve SQL Builder UX and relationship-driven query building
