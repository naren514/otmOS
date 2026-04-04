"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/Shell";

type Row = { path: string; type: string; preview: string };

function typeOf(v: unknown) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function previewOf(v: unknown) {
  const t = typeOf(v);
  if (t === "string") {
    const s = String(v);
    return s.length > 80 ? JSON.stringify(s.slice(0, 77) + "...") : JSON.stringify(s);
  }
  if (t === "number" || t === "boolean" || t === "null") return String(v);
  if (t === "array") return `Array(${Array.isArray(v) ? v.length : 0})`;
  if (t === "object") return "Object";
  return String(v);
}

function walkJson(v: unknown, path: string, rows: Row[]) {
  rows.push({ path, type: typeOf(v), preview: previewOf(v) });

  if (v && typeof v === "object") {
    if (Array.isArray(v)) {
      v.forEach((item: unknown, idx: number) => {
        walkJson(item, `${path}[${idx}]`, rows);
      });
    } else {
      const obj = v as Record<string, unknown>;
      Object.keys(obj).forEach((k) => {
        const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? `.${k}` : `[${JSON.stringify(k)}]`;
        walkJson(obj[k], `${path}${safeKey}`, rows);
      });
    }
  }
}

export default function JsonPathGeneratorPage() {
  const [json, setJson] = useState<string>(
    "{\n  \"order\": {\n    \"id\": \"SO123\",\n    \"lines\": [\n      { \"item\": \"ABC\", \"qty\": 2 },\n      { \"item\": \"XYZ\", \"qty\": 5 }\n    ]\n  }\n}\n"
  );
  const [filter, setFilter] = useState<string>("");

  const parsed = useMemo(() => {
    if (!json.trim()) return { ok: false as const, message: "Paste JSON to generate JSONPaths." };
    try {
      const v = JSON.parse(json);
      return { ok: true as const, message: "Parsed JSON", value: v };
    } catch (e) {
      return { ok: false as const, message: (e as Error).message };
    }
  }, [json]);

  const rows = useMemo(() => {
    if (!parsed.ok) return [] as Row[];
    const out: Row[] = [];
    walkJson(parsed.value, "$", out);
    return out;
  }, [parsed]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.path.toLowerCase().includes(q) || r.preview.toLowerCase().includes(q) || r.type.toLowerCase().includes(q));
  }, [rows, filter]);

  return (
    <Shell title="JSONPath Generator">
      <section className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{parsed.ok ? "✅" : "⚠️"} {parsed.message}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Generates JSONPath-style paths (starting at <code>$</code>) for every node.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label className="muted" style={{ fontSize: 12 }}>Filter</label>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. $.order.lines[0]" />
          </div>
        </div>

        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          style={{ width: "100%", marginTop: 12, minHeight: 220, fontFamily: "var(--font-geist-mono)" }}
        />
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="muted" style={{ marginBottom: 10 }}>
          Paths ({filtered.length}{filter.trim() ? ` of ${rows.length}` : ""})
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "8px 10px", borderBottom: "1px solid #222" }}>JSONPath</th>
                <th style={{ padding: "8px 10px", borderBottom: "1px solid #222" }}>Type</th>
                <th style={{ padding: "8px 10px", borderBottom: "1px solid #222" }}>Preview</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.path}>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a1a", fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>
                    {r.path}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a1a", color: "#aaa", fontSize: 12 }}>
                    {r.type}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a1a", color: "#aaa", fontSize: 12 }}>
                    {r.preview}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
