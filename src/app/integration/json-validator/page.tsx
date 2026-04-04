"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/Shell";

export default function JsonValidatorPage() {
  const [json, setJson] = useState<string>("{\n  \"hello\": \"world\",\n  \"items\": [\n    { \"id\": 1, \"name\": \"A\" },\n    { \"id\": 2, \"name\": \"B\" }\n  ]\n}\n");
  const [pretty, setPretty] = useState(true);

  const parsed = useMemo(() => {
    if (!json.trim()) return { ok: false as const, message: "Paste JSON to validate." };
    try {
      const v = JSON.parse(json);
      return { ok: true as const, message: "Valid JSON", value: v };
    } catch (e) {
      return { ok: false as const, message: (e as Error).message };
    }
  }, [json]);

  const displayed = useMemo(() => {
    if (!pretty) return json;
    if (!parsed.ok) return json;
    try {
      return JSON.stringify(parsed.value, null, 2) + "\n";
    } catch {
      return json;
    }
  }, [json, pretty, parsed]);

  return (
    <Shell title="JSON Validator">
      <section className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{parsed.ok ? "✅" : "⚠️"} {parsed.message}</div>
            <div className="muted" style={{ marginTop: 6 }}>Validates JSON and pretty-prints.</div>
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={pretty} onChange={(e) => setPretty(e.target.checked)} />
            <span className="muted" style={{ fontSize: 12 }}>Pretty</span>
          </label>
        </div>

        <textarea
          value={displayed}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
          style={{ width: "100%", marginTop: 12, minHeight: 360, fontFamily: "var(--font-geist-mono)" }}
        />
      </section>
    </Shell>
  );
}

