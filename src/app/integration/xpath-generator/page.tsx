"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/Shell";

type XPathRow = {
  xpath: string;
  sample?: string;
};

function isElement(n: Node): n is Element {
  return n.nodeType === Node.ELEMENT_NODE;
}

function getElementIndexAmongSiblings(el: Element) {
  const parent = el.parentElement;
  if (!parent) return 1;
  const same = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
  if (same.length <= 1) return 1;
  return same.indexOf(el) + 1;
}

function buildXPath(el: Element) {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur) {
    const idx = getElementIndexAmongSiblings(cur);
    const name = cur.tagName;
    const seg = idx > 1 ? `${name}[${idx}]` : name;
    parts.unshift(seg);
    cur = cur.parentElement;
  }
  return "/" + parts.join("/");
}

function sampleText(el: Element) {
  const t = (el.textContent ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.length > 80 ? t.slice(0, 77) + "..." : t;
}

function formatXml(xml: string) {
  const trimmed = xml.trim();
  if (!trimmed) return xml;

  const withBreaks = trimmed.replace(/>(\s*)</g, ">\n<");
  const lines = withBreaks.split("\n");
  let indent = 0;

  return lines
    .map((line) => {
      const current = line.trim();
      if (!current) return current;
      if (/^<\//.test(current)) indent = Math.max(indent - 1, 0);
      const formatted = `${"  ".repeat(indent)}${current}`;
      if (/^<[^!?/][^>]*[^/]?>$/.test(current) && !/^<.*<\//.test(current) && !/\/>$/.test(current)) {
        indent += 1;
      }
      return formatted;
    })
    .join("\n");
}

export default function XPathGeneratorPage() {
  const [xml, setXml] = useState<string>(
    "<root>\n  <order id=\"SO123\">\n    <lines>\n      <line><item>ABC</item><qty>2</qty></line>\n      <line><item>XYZ</item><qty>5</qty></line>\n    </lines>\n  </order>\n</root>\n"
  );
  const [filter, setFilter] = useState<string>("");

  const parsed = useMemo(() => {
    if (typeof window === "undefined") {
      return { ok: false as const, message: "Loading… (runs in browser)" };
    }
    if (!xml.trim()) return { ok: false as const, message: "Paste XML to generate XPaths." };
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const parseError = doc.getElementsByTagName("parsererror")[0];
    if (parseError) {
      return { ok: false as const, message: parseError.textContent?.trim() ?? "Invalid XML" };
    }
    return { ok: true as const, message: "Parsed XML", doc };
  }, [xml]);

  const paths = useMemo(() => {
    if (!parsed.ok) return [] as XPathRow[];
    const rows: XPathRow[] = [];

    const root = parsed.doc.documentElement;
    const walk = (el: Element) => {
      rows.push({ xpath: buildXPath(el), sample: sampleText(el) });
      Array.from(el.childNodes)
        .filter(isElement)
        .forEach(walk);
    };
    walk(root);
    return rows;
  }, [parsed]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return paths;
    return paths.filter((r) => r.xpath.toLowerCase().includes(q) || (r.sample ?? "").toLowerCase().includes(q));
  }, [paths, filter]);

  function exportToExcelCsv() {
    const rows = filtered.length ? filtered : paths;
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      ["XPath", "Sample Text"],
      ...rows.map((row) => [row.xpath, row.sample ?? ""]),
    ]
      .map((cols) => cols.map(escape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xpath-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function prettyPrintXml() {
    try {
      setXml(formatXml(xml));
    } catch {
      // leave content as-is if formatting fails
    }
  }

  return (
    <Shell title="XPath Generator">
      <section className="card">
        <div style={{ display: "flex", gap: 12, alignItems: "baseline", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{parsed.ok ? "✅" : "⚠️"} {parsed.message}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Generates absolute XPaths for each element in the document.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label className="muted" style={{ fontSize: 12 }}>Filter</label>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="e.g. /root/order" />
            <button className="btn" onClick={prettyPrintXml}>Pretty print</button>
            <button className="btn" onClick={exportToExcelCsv} disabled={!paths.length}>Export to Excel</button>
          </div>
        </div>

        <textarea
          value={xml}
          onChange={(e) => setXml(e.target.value)}
          spellCheck={false}
          style={{ width: "100%", marginTop: 12, minHeight: 220, fontFamily: "var(--font-geist-mono)" }}
        />
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="muted" style={{ marginBottom: 10 }}>
          Paths ({filtered.length}{filter.trim() ? ` of ${paths.length}` : ""}) — exports as Excel-friendly CSV
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: "8px 10px", borderBottom: "1px solid #222" }}>XPath</th>
                <th style={{ padding: "8px 10px", borderBottom: "1px solid #222" }}>Sample text</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.xpath}>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a1a", fontFamily: "var(--font-geist-mono)", fontSize: 12 }}>
                    {r.xpath}
                  </td>
                  <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a1a", color: "#aaa", fontSize: 12 }}>
                    {r.sample}
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
