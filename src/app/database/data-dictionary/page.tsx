"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";

type DictionaryItem = {
  href: string;
  label: string;
};

type DictionaryResponse = {
  title?: string;
  items: DictionaryItem[];
  basePath?: string;
  defaultHref?: string | null;
  error?: string;
};

export default function DataDictionaryPage() {
  const [items, setItems] = useState<DictionaryItem[]>([]);
  const [basePath, setBasePath] = useState<string>("");
  const [selectedHref, setSelectedHref] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/database/data-dictionary");
        const data = (await res.json()) as DictionaryResponse;
        if (cancelled) return;
        setItems(data.items ?? []);
        setBasePath(data.basePath ?? "");
        setSelectedHref(data.defaultHref ?? data.items?.[0]?.href ?? "");
        setError(data.error ?? null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const selectedUrl = selectedHref && basePath ? `${basePath}/${selectedHref}` : "";

  return (
    <Shell title="Data Dictionary Explorer">
      <div className="grid2" style={{ alignItems: "start", gridTemplateColumns: "minmax(280px, 360px) minmax(480px, 1fr)" }}>
        <section className="card">
          <div style={{ fontWeight: 600 }}>Subject Areas</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Search and open OTM data model diagram subject areas from the supplied dictionary export.
          </div>

          <input
            className="input"
            style={{ marginTop: 12 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search e.g. Invoice, Shipment, Location"
          />

          {error ? <div className="errorText" style={{ marginTop: 12 }}>{error}</div> : null}

          <div className="listStack" style={{ marginTop: 12, maxHeight: "70vh", overflowY: "auto" }}>
            {filtered.map((item) => (
              <button
                key={item.href}
                className={`listItem ${selectedHref === item.href ? "selected" : ""}`}
                onClick={() => setSelectedHref(item.href)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>{items.find((item) => item.href === selectedHref)?.label ?? "Viewer"}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Embedded diagram view from the local Oracle data dictionary export.
              </div>
            </div>
            {selectedUrl ? (
              <a className="btn" href={selectedUrl} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
            ) : null}
          </div>

          {selectedUrl ? (
            <iframe
              src={selectedUrl}
              title="Data dictionary viewer"
              style={{ width: "100%", minHeight: "78vh", border: "1px solid var(--border)", borderRadius: 12, marginTop: 12, background: "#fff" }}
            />
          ) : (
            <div className="emptyState" style={{ marginTop: 12 }}>Pick a subject area to start browsing.</div>
          )}
        </section>
      </div>
    </Shell>
  );
}

