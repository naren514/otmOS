"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";

type TableSummary = {
  tableName: string;
  subjectArea: string;
  fileName: string;
};

type TableField = {
  name: string;
  description: string;
};

type TableDetail = {
  tableName: string;
  description: string;
  fields: TableField[];
  fileName: string;
  subjectArea: string;
};

const preferredAreas = ["Invoice", "Item", "Location", "Integration", "Shipment", "Rates", "Trade Transactions", "Other"];
const favoriteTables = ["INVOICE", "SHIPMENT", "ORDER_RELEASE", "ORDER_BASE", "LOCATION", "ITEM", "RATE_GEO", "RATE_OFFERING", "GTM_TRANSACTION"];

function fieldBadges(name: string) {
  const upper = name.toUpperCase();
  const badges: string[] = [];
  if (upper.endsWith("_GID") || upper === "GID") badges.push("GID");
  if (upper.endsWith("_XID") || upper === "XID") badges.push("XID");
  if (upper.includes("DATE") || upper.endsWith("_DT") || upper.includes("TIME")) badges.push("DATE/TIME");
  if (upper.includes("AMOUNT") || upper.includes("COST") || upper.includes("PRICE")) badges.push("AMOUNT");
  if (upper.includes("STATUS")) badges.push("STATUS");
  if (upper.includes("REFNUM")) badges.push("REFNUM");
  return badges;
}

export default function DatabaseTableExplorerPage() {
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>("Invoice");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [detail, setDetail] = useState<TableDetail | null>(null);
  const [query, setQuery] = useState<string>("");
  const [fieldQuery, setFieldQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [globalFieldQuery, setGlobalFieldQuery] = useState<string>("");
  const [globalFieldMatches, setGlobalFieldMatches] = useState<Array<{ tableName: string; subjectArea: string; fieldName: string; description: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadTables() {
      try {
        const res = await fetch("/api/database/tables");
        const data = (await res.json()) as { tables?: TableSummary[]; error?: string };
        if (cancelled) return;
        setTables(data.tables ?? []);
        setError(data.error ?? null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    void loadTables();
    return () => {
      cancelled = true;
    };
  }, []);

  const subjectAreas = useMemo(() => {
    const found = Array.from(new Set(tables.map((t) => t.subjectArea))).sort();
    return preferredAreas.filter((area) => found.includes(area)).concat(found.filter((area) => !preferredAreas.includes(area)));
  }, [tables]);

  const filteredTables = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tables.filter((table) => table.subjectArea === selectedArea && (!q || table.tableName.toLowerCase().includes(q)));
  }, [tables, selectedArea, query]);

  const favorites = useMemo(() => tables.filter((table) => favoriteTables.includes(table.tableName)).slice(0, 10), [tables]);

  useEffect(() => {
    if (!filteredTables.length) return;
    if (!selectedTable || !filteredTables.some((t) => t.tableName === selectedTable)) {
      setSelectedTable(filteredTables[0].tableName);
    }
  }, [filteredTables, selectedTable]);

  useEffect(() => {
    let cancelled = false;
    async function loadDetail() {
      if (!selectedTable) {
        setDetail(null);
        return;
      }
      try {
        const res = await fetch(`/api/database/tables?table=${encodeURIComponent(selectedTable)}`);
        const data = (await res.json()) as TableDetail & { error?: string };
        if (cancelled) return;
        if ((data as { error?: string }).error) {
          setError((data as { error?: string }).error ?? "Unknown error");
          return;
        }
        setDetail(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedTable]);

  useEffect(() => {
    let cancelled = false;
    async function searchFields() {
      if (!globalFieldQuery.trim()) {
        setGlobalFieldMatches([]);
        return;
      }
      const res = await fetch(`/api/database/tables?field=${encodeURIComponent(globalFieldQuery)}`);
      const data = (await res.json()) as { matches?: Array<{ tableName: string; subjectArea: string; fieldName: string; description: string }> };
      if (!cancelled) setGlobalFieldMatches(data.matches ?? []);
    }
    void searchFields();
    return () => {
      cancelled = true;
    };
  }, [globalFieldQuery]);

  const filteredFields = useMemo(() => {
    const q = fieldQuery.trim().toLowerCase();
    if (!detail) return [] as TableField[];
    if (!q) return detail.fields;
    return detail.fields.filter((field) => field.name.toLowerCase().includes(q) || field.description.toLowerCase().includes(q));
  }, [detail, fieldQuery]);

  const relatedTables = useMemo(() => {
    if (!detail) return [] as TableSummary[];
    const name = detail.tableName.toUpperCase();
    const base = name
      .replace(/_(D|P|X|BOV|QUAL|PROFILE|DETAIL|JOIN|REFNUM|STATUS|LINE|COST)$/i, "")
      .split("_")
      .slice(0, 2)
      .join("_");

    return tables
      .filter((table) => table.tableName !== detail.tableName)
      .filter((table) => {
        const t = table.tableName.toUpperCase();
        return t.startsWith(base) || name.startsWith(t.split("_").slice(0, 2).join("_"));
      })
      .slice(0, 12);
  }, [detail, tables]);

  function exportFieldsCsv() {
    if (!detail) return;
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      ["Field", "Description", "Badges"],
      ...filteredFields.map((field) => [field.name, field.description, fieldBadges(field.name).join(" | ")]),
    ]
      .map((cols) => cols.map(escape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail.tableName.toLowerCase()}-fields.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Shell title="Table Explorer">
      <div className="grid2" style={{ alignItems: "start", gridTemplateColumns: "minmax(260px, 320px) minmax(260px, 360px) minmax(520px, 1fr)" }}>
        <section className="card">
          <div style={{ fontWeight: 600 }}>Subject Areas</div>
          {favorites.length ? (
            <>
              <div className="muted" style={{ marginTop: 12, marginBottom: 8 }}>Quick jump</div>
              <div className="toolbar" style={{ rowGap: 8 }}>
                {favorites.map((table) => (
                  <button
                    key={table.tableName}
                    className="btn"
                    onClick={() => {
                      setSelectedArea(table.subjectArea);
                      setSelectedTable(table.tableName);
                    }}
                  >
                    {table.tableName}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <div className="listStack" style={{ marginTop: 12 }}>
            {subjectAreas.map((area) => (
              <button key={area} className={`listItem ${selectedArea === area ? "selected" : ""}`} onClick={() => setSelectedArea(area)}>
                {area}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="muted" style={{ marginBottom: 8 }}>Global field search</div>
            <input className="input" value={globalFieldQuery} onChange={(e) => setGlobalFieldQuery(e.target.value)} placeholder="Search any field e.g. INVOICE_GID" />
            {globalFieldMatches.length ? (
              <div className="listStack" style={{ marginTop: 12, maxHeight: "32vh", overflowY: "auto" }}>
                {globalFieldMatches.slice(0, 20).map((match) => (
                  <button
                    key={`${match.tableName}-${match.fieldName}`}
                    className="listItem"
                    onClick={() => {
                      setSelectedArea(match.subjectArea);
                      setSelectedTable(match.tableName);
                      setFieldQuery(match.fieldName);
                    }}
                  >
                    {match.tableName}.{match.fieldName}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="card">
          <div style={{ fontWeight: 600 }}>Tables</div>
          <input className="input" style={{ marginTop: 12 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search table name" />
          <div className="listStack" style={{ marginTop: 12, maxHeight: "75vh", overflowY: "auto" }}>
            {filteredTables.map((table) => (
              <button key={table.tableName} className={`listItem ${selectedTable === table.tableName ? "selected" : ""}`} onClick={() => setSelectedTable(table.tableName)}>
                {table.tableName}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          {detail ? (
            <>
              <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{detail.tableName}</div>
                  <div className="muted" style={{ marginTop: 6 }}>{detail.subjectArea}</div>
                </div>
                <div className="toolbar">
                  <Link className="btn" href={`/database/sql-builder?table=${encodeURIComponent(detail.tableName)}`}>Open in SQL Builder</Link>
                  <button className="btn" onClick={exportFieldsCsv}>Export fields</button>
                </div>
              </div>

              {detail.description ? (
                <div className="detailPane" style={{ marginTop: 12, minHeight: "auto" }}>
                  {detail.description}
                </div>
              ) : null}

              <input className="input" style={{ marginTop: 12 }} value={fieldQuery} onChange={(e) => setFieldQuery(e.target.value)} placeholder="Search fields or descriptions" />

              <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ marginBottom: 8 }}>Fields ({filteredFields.length})</div>
                <div className="listStack" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                  {filteredFields.map((field) => (
                    <div key={field.name} className="detailPane" style={{ minHeight: "auto" }}>
                      <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{field.name}</div>
                        <div className="toolbar">
                          {fieldBadges(field.name).map((badge) => (
                            <span key={badge} className="badge">{badge}</span>
                          ))}
                        </div>
                      </div>
                      <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>{field.description || "No description available."}</div>
                    </div>
                  ))}
                </div>
              </div>

              {relatedTables.length ? (
                <div style={{ marginTop: 16 }}>
                  <div className="muted" style={{ marginBottom: 8 }}>Related tables</div>
                  <div className="toolbar" style={{ rowGap: 8 }}>
                    {relatedTables.map((table) => (
                      <button key={table.tableName} className="btn" onClick={() => setSelectedTable(table.tableName)}>
                        {table.tableName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="emptyState">Pick a table to view field-level details.</div>
          )}

          {error ? <div className="errorText" style={{ marginTop: 12 }}>{error}</div> : null}
        </section>
      </div>
    </Shell>
  );
}
