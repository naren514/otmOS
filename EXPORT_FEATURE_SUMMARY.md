# EDI Explainer Export Feature

## Overview
Added export functionality to the EDI Explainer tool, allowing users to download their EDI explanation in multiple formats.

## Implementation Date
2026-06-01

## Features Added

### 1. **CSV Export**
- Exports explanation as comma-separated values
- Includes headers: Loop/Context, Segment, Element, Segment Element Name, Value, Element Description
- Properly escapes special characters and quotes
- Filename format: `edi-explanation-{txSet}-{timestamp}.csv`

### 2. **JSON Export**
- Exports structured JSON with metadata and explanation rows
- Includes metadata section with:
  - Version
  - Transaction Set
  - Carrier
  - Element Separator
  - Segment Terminator
  - Export timestamp
- Clean data structure for programmatic processing
- Pretty-printed (indented) for readability
- Filename format: `edi-explanation-{txSet}-{timestamp}.json`

### 3. **Formatted Text Export**
- Human-readable text report format
- Includes header with all configuration details
- Groups segments by Loop/Context
- Separators for visual clarity
- Filename format: `edi-explanation-{txSet}-{timestamp}.txt`

## UI Changes

### Export Buttons
- Three new export buttons appear in the header section (next to "Explain" button)
- Only visible when there is an explanation to export (`rows.length > 0`)
- Buttons:
  - **Export CSV** - Download as CSV file
  - **Export JSON** - Download as JSON file
  - **Export TXT** - Download as formatted text file

### User Feedback
- Status messages confirm successful exports
- Prevents export attempts when no data is available

## Technical Implementation

### Functions Added
1. `exportAsCSV()` - Generates and downloads CSV format
2. `exportAsJSON()` - Generates and downloads JSON format
3. `exportAsText()` - Generates and downloads formatted text
4. `downloadFile()` - Utility function to trigger browser download

### File Location
- Modified: `src/app/edi/page.tsx`

## Example Output Formats

### CSV Example
```csv
Loop/Context,Segment,Element,Segment Element Name,Value,Element Description
Detail,ISA,01,Authorization Information Qualifier,00,No Authorization Information
Detail,ISA,02,Authorization Information,          ,—
Header,GS,01,Functional Identifier Code,SM,Shipment
```

### JSON Example
```json
{
  "metadata": {
    "version": "4010",
    "txSet": "204",
    "carrier": "industry",
    "elementSeparator": "*",
    "segmentTerminator": "~",
    "exportedAt": "2026-06-01T10:30:00.000Z"
  },
  "rows": [
    {
      "loopContext": "Detail",
      "segment": "ISA",
      "element": 1,
      "segmentElementName": "Authorization Information Qualifier",
      "value": "00",
      "elementDescription": "No Authorization Information"
    }
  ]
}
```

### Text Example
```
EDI Explanation Report
================================================================================

Version: 4010
Transaction Set: 204
Carrier/Scope: industry
Element Separator: *
Segment Terminator: ~
Generated: 2026-06-01T10:30:00.000Z

================================================================================

[Detail]
--------------------------------------------------------------------------------

Segment: ISA | Element: 01
Field: Authorization Information Qualifier
Value: 00
Description: No Authorization Information
```

## Benefits

1. **Data Portability** - Users can export explanations for offline review
2. **Integration Support** - JSON format enables programmatic processing
3. **Documentation** - Text format ideal for reports and documentation
4. **Data Analysis** - CSV format allows import into Excel/spreadsheet tools
5. **Auditability** - Metadata includes timestamp and configuration details

## Testing Status
- ✅ TypeScript compilation successful
- ✅ Next.js build successful (no errors)
- ⏳ Manual testing in browser pending

## Next Steps for Full Validation
1. Start dev server: `npm run dev`
2. Navigate to `/edi` page
3. Load sample EDI message
4. Click "Explain"
5. Test all three export buttons
6. Verify downloaded files contain correct data and format

## Related Files
- `src/app/edi/page.tsx` - Main implementation
- `src/lib/ediApi.ts` - Type definitions used
- `src/lib/ediParser.ts` - Parser logic (unchanged)

---
*Feature implemented by: Jaya*
*Date: 2026-06-01*
