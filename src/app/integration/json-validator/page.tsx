"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/Shell";
import SectionIntro from "@/components/SectionIntro";
import { SAMPLE_GENERATORS, getAvailableObjectTypes } from "@/lib/sampleGenerator";

export default function JsonValidatorPage() {
  const [json, setJson] = useState<string>("{\n  \"hello\": \"world\",\n  \"items\": [\n    { \"id\": 1, \"name\": \"A\" },\n    { \"id\": 2, \"name\": \"B\" }\n  ]\n}\n");
  const [pretty, setPretty] = useState(true);
  const [indentSize, setIndentSize] = useState(2);
  const [validateSchema, setValidateSchema] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<string>("Shipment");

  const objectTypes = getAvailableObjectTypes();

  const parsed = useMemo(() => {
    if (!json.trim()) return { ok: false as const, message: "Paste JSON to validate.", line: null };
    try {
      const v = JSON.parse(json);

      // Basic schema validation if enabled
      if (validateSchema && selectedSchema) {
        const rootKey = Object.keys(v)[0];
        if (rootKey !== selectedSchema) {
          return {
            ok: false as const,
            message: `Schema validation failed: Expected root key "${selectedSchema}" but found "${rootKey}"`,
            line: 1
          };
        }
      }

      return { ok: true as const, message: "Valid JSON", value: v, line: null };
    } catch (e) {
      const errorMsg = (e as Error).message;
      // Try to extract line number from error message
      const lineMatch = errorMsg.match(/position (\d+)/i) || errorMsg.match(/line (\d+)/i);
      const position = lineMatch ? parseInt(lineMatch[1]) : null;

      // Calculate line number from position
      let line: number | null = null;
      if (position !== null) {
        const textBeforeError = json.substring(0, position);
        line = (textBeforeError.match(/\n/g) || []).length + 1;
      }

      return { ok: false as const, message: errorMsg, line };
    }
  }, [json, validateSchema, selectedSchema]);

  const displayed = useMemo(() => {
    if (!pretty) return json;
    if (!parsed.ok) return json;
    try {
      return JSON.stringify(parsed.value, null, indentSize) + "\n";
    } catch {
      return json;
    }
  }, [json, pretty, parsed, indentSize]);

  const stats = useMemo(() => {
    if (!parsed.ok) return null;

    const countNodes = (obj: any): number => {
      if (obj === null || obj === undefined) return 1;
      if (typeof obj !== 'object') return 1;
      if (Array.isArray(obj)) {
        return 1 + obj.reduce((sum, item) => sum + countNodes(item), 0);
      }
      return 1 + Object.values(obj).reduce((sum, val) => sum + countNodes(val), 0);
    };

    const countArrays = (obj: any): number => {
      if (!obj || typeof obj !== 'object') return 0;
      let count = Array.isArray(obj) ? 1 : 0;
      if (Array.isArray(obj)) {
        count += obj.reduce((sum, item) => sum + countArrays(item), 0);
      } else {
        count += Object.values(obj).reduce((sum, val) => sum + countArrays(val), 0);
      }
      return count;
    };

    const depth = (obj: any, level = 0): number => {
      if (!obj || typeof obj !== 'object') return level;
      if (Array.isArray(obj)) {
        return obj.length === 0 ? level + 1 : Math.max(...obj.map(item => depth(item, level + 1)));
      }
      const values = Object.values(obj);
      return values.length === 0 ? level + 1 : Math.max(...values.map(val => depth(val, level + 1)));
    };

    return {
      nodes: countNodes(parsed.value),
      arrays: countArrays(parsed.value),
      depth: depth(parsed.value),
      size: new Blob([json]).size,
    };
  }, [parsed, json]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayed);
  };

  const downloadJson = () => {
    const blob = new Blob([displayed], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "validated.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const minifyJson = () => {
    if (!parsed.ok) return;
    setJson(JSON.stringify(parsed.value));
    setPretty(false);
  };

  const prettifyJson = () => {
    if (!parsed.ok) return;
    setJson(JSON.stringify(parsed.value, null, indentSize));
    setPretty(true);
  };

  const clearJson = () => {
    setJson("");
  };

  const loadSample = (objectType: string) => {
    const generator = SAMPLE_GENERATORS[objectType];
    if (!generator) return;

    const sample = generator({ includeOptional: true, includeArrays: true, arrayLength: 2 });
    const formatted = JSON.stringify(sample, null, indentSize);
    setJson(formatted);
    setSelectedSchema(objectType);
    setPretty(true);
  };

  return (
    <Shell title="JSON Validator">
      <section className="card">
        <SectionIntro
          title="JSON Validator & Formatter"
          description="Validate, format, and analyze JSON payloads for Oracle OTM integrations."
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              {parsed.ok && (
                <>
                  <button className="btn" onClick={prettifyJson}>
                    ✨ Prettify
                  </button>
                  <button className="btn" onClick={minifyJson}>
                    📦 Minify
                  </button>
                  <button className="btn" onClick={copyToClipboard}>
                    📋 Copy
                  </button>
                  <button className="btn" onClick={downloadJson}>
                    💾 Download
                  </button>
                </>
              )}
              <button className="btn" onClick={clearJson}>
                🗑️ Clear
              </button>
            </div>
          }
        />

        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>
              {parsed.ok ? "✅ Valid JSON" : "⚠️ Invalid JSON"}
            </div>
            {!parsed.ok && (
              <div style={{ color: "#dc2626", marginTop: 4, fontSize: 14 }}>
                {parsed.line && <strong>Line {parsed.line}: </strong>}
                {parsed.message}
              </div>
            )}
            {parsed.ok && stats && (
              <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                {stats.nodes} nodes • {stats.arrays} arrays • depth {stats.depth} • {stats.size} bytes
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="muted" style={{ fontSize: 13 }}>Indent:</span>
              <select
                className="input"
                value={indentSize}
                onChange={(e) => setIndentSize(Number(e.target.value))}
                style={{ padding: "4px 8px", fontSize: 13 }}
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>Tab</option>
              </select>
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} />
              <span className="muted" style={{ fontSize: 13 }}>Pretty Print</span>
            </label>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: 12, background: "#fef3c7", borderRadius: 6, border: "1px solid #fbbf24" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={validateSchema}
                onChange={(e) => setValidateSchema(e.target.checked)}
              />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Validate OTM Schema</span>
            </label>

            {validateSchema && (
              <>
                <select
                  className="input"
                  value={selectedSchema}
                  onChange={(e) => setSelectedSchema(e.target.value)}
                  style={{ padding: "4px 8px", fontSize: 13 }}
                >
                  {objectTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <button
                  className="btn"
                  onClick={() => loadSample(selectedSchema)}
                  style={{ fontSize: 13, padding: "4px 12px" }}
                >
                  📝 Load Sample {selectedSchema}
                </button>
              </>
            )}
          </div>
          <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Enable to validate against Oracle OTM object schemas (Shipment, Order, Location, etc.)
          </p>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block" }}>
            <span className="label">JSON Input:</span>
            <textarea
              className="textarea"
              value={displayed}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
              placeholder="Paste JSON here..."
              style={{
                minHeight: "500px",
                fontFamily: "monospace",
                fontSize: 13,
                border: parsed.ok ? "1px solid #e5e7eb" : "2px solid #dc2626"
              }}
            />
          </label>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: "#f3f4f6", borderRadius: 8 }}>
          <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 600 }}>Features:</h3>
          <ul style={{ marginLeft: 20, lineHeight: 1.8 }}>
            <li><strong>Syntax Validation</strong> - Real-time JSON syntax checking with error line numbers</li>
            <li><strong>Schema Validation</strong> - Validate against Oracle OTM object schemas</li>
            <li><strong>Pretty Print</strong> - Format with configurable indentation (2/4/8 spaces)</li>
            <li><strong>Minify</strong> - Compact JSON to single line for transmission</li>
            <li><strong>Statistics</strong> - Node count, array count, depth, and size analysis</li>
            <li><strong>Sample Data</strong> - Load realistic Oracle OTM samples for 8 object types</li>
            <li><strong>Copy/Download</strong> - Export formatted JSON</li>
            <li><strong>Error Messages</strong> - Detailed syntax error with line numbers</li>
          </ul>
        </div>

        <div style={{ marginTop: 16, padding: 16, background: "#eff6ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
          <h3 style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#1e40af" }}>📚 Oracle OTM Documentation</h3>
          <p className="muted" style={{ marginBottom: 8 }}>
            For complete Oracle Transportation Management API schema reference:
          </p>
          <a
            href="https://docs.oracle.com/en/cloud/saas/transportation/26b/otmra/index.html"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 500 }}
          >
            https://docs.oracle.com/en/cloud/saas/transportation/26b/otmra/
          </a>
        </div>

        <div style={{ marginTop: 16, padding: 16, background: "#f0fdf4", borderRadius: 8, border: "1px solid #86efac" }}>
          <h3 style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: "#166534" }}>💡 Tips</h3>
          <ul style={{ marginLeft: 20, lineHeight: 1.8, fontSize: 13 }} className="muted">
            <li>Use this to validate Oracle OTM JSON payloads before sending to the API</li>
            <li>Enable <strong>Schema Validation</strong> to check against OTM object structure</li>
            <li>Click <strong>Load Sample</strong> to see realistic examples for each object type</li>
            <li>Switch to <strong>JSONPath Generator</strong> to explore object paths</li>
            <li>Use <strong>XML ↔ JSON Converter</strong> to transform between formats</li>
            <li>All processing happens in your browser - no data is sent to a server</li>
          </ul>
        </div>
      </section>
    </Shell>
  );
}

