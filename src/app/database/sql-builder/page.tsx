"use client";

import { useEffect, useMemo, useState } from "react";
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
  relationships?: { fieldName: string; targetTable: string; targetLabel?: string }[];
};

export default function SqlBuilderPage() {
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [baseTable, setBaseTable] = useState<string>("INVOICE");
  const [detail, setDetail] = useState<TableDetail | null>(null);
  const [joinTable, setJoinTable] = useState<string>("");
  const [joinedTables, setJoinedTables] = useState<Array<{ tableName: string; condition: string; alias: string; fields: TableField[] }>>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [whereText, setWhereText] = useState<string>("");
  const [orderBy, setOrderBy] = useState<string>("");
  const [limitText, setLimitText] = useState<string>("100");
  const [fieldSearch, setFieldSearch] = useState<string>("");
  const [template, setTemplate] = useState<"select" | "count" | "gid" | "date-range">("select");

  useEffect(() => {
    let cancelled = false;
    async function loadTables() {
      const res = await fetch("/api/database/tables");
      const data = (await res.json()) as { tables?: TableSummary[] };
      if (!cancelled) setTables(data.tables ?? []);
    }
    void loadTables();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const table = new URLSearchParams(window.location.search).get("table");
    if (table) setBaseTable(table);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadDetail() {
      if (!baseTable) return;
      const res = await fetch(`/api/database/tables?table=${encodeURIComponent(baseTable)}`);
      const data = (await res.json()) as TableDetail;
      if (!cancelled) {
        setDetail(data);
        setSelectedFields((prev) => prev.filter((field) => data.fields.some((f) => f.name === field)));
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [baseTable]);

  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    if (!detail) return [] as TableField[];
    if (!q) return detail.fields;
    return detail.fields.filter((f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
  }, [detail, fieldSearch]);

  const joinSuggestions = useMemo(() => {
    if (!detail) return [] as Array<{ tableName: string; condition: string }>;
    const suggestions: Array<{ tableName: string; condition: string }> = [];
    const taken = new Set(joinedTables.map((j) => j.tableName));

    for (const rel of detail.relationships ?? []) {
      if (taken.has(rel.targetTable)) continue;
      const alias = rel.targetTable.toLowerCase().slice(0, 1);
      suggestions.push({
        tableName: rel.targetTable,
        condition: `t.${rel.fieldName} = ${alias}.${rel.targetTable}_GID`,
      });
    }

    const uniq = new Map<string, { tableName: string; condition: string }>();
    for (const s of suggestions) {
      const key = `${s.tableName}|${s.condition}`;
      if (!uniq.has(key)) uniq.set(key, s);
    }
    return Array.from(uniq.values());
  }, [detail, joinedTables]);

  const sql = useMemo(() => {
    const safeLimit = Number(limitText) > 0 ? Number(limitText) : 100;
    const selectClause = selectedFields.length
      ? selectedFields.join(",\n  ")
      : template === "count"
        ? "COUNT(*) AS row_count"
        : "t.*";
    const joinClauses = joinedTables.map((join, idx) => {
      return `LEFT JOIN ${join.tableName} ${join.alias} ON ${join.condition.replace(/\b[a-z]\./g, (m) => (m === "t." ? "t." : `${join.alias}.`))}`;
    });

    const computedWhere = (() => {
      if (template === "gid") return whereText.trim() || "t.GID = '<DOMAIN.XID>'";
      if (template === "date-range") return whereText.trim() || "t.INSERT_DATE >= DATE '2024-01-01' AND t.INSERT_DATE < DATE '2024-02-01'";
      return whereText.trim();
    })();

    return [
      "SELECT",
      `  ${selectClause}`,
      `FROM ${baseTable || "<TABLE_NAME>"} t`,
      ...joinClauses,
      computedWhere ? `WHERE ${computedWhere}` : "-- WHERE <conditions>",
      template !== "count" ? (orderBy.trim() ? `ORDER BY ${orderBy.trim()}` : "-- ORDER BY <field>") : "-- ORDER BY not typically needed for COUNT",
      template !== "count" ? `FETCH FIRST ${safeLimit} ROWS ONLY;` : ";",
    ].join("\n");
  }, [selectedFields, baseTable, whereText, orderBy, limitText, joinedTables, template]);

  function toggleField(fieldName: string) {
    setSelectedFields((prev) => (prev.includes(fieldName) ? prev.filter((f) => f !== fieldName) : [...prev, fieldName]));
  }

  async function copySql() {
    await navigator.clipboard.writeText(sql);
  }

  async function addJoin() {
    if (!joinTable) return;
    const [tableName, condition] = joinTable.split("|||");
    const suggestion = joinSuggestions.find((j) => j.tableName === tableName && j.condition === condition);
    if (!suggestion) return;
    const res = await fetch(`/api/database/tables?table=${encodeURIComponent(tableName)}`);
    const data = (await res.json()) as TableDetail;
    setJoinedTables((prev) => [...prev, { ...suggestion, alias: `j${prev.length + 1}`, fields: data.fields ?? [] }]);
    setJoinTable("");
  }

  return (
    <Shell title="SQL Builder">
      <div className="grid2" style={{ alignItems: "start", gridTemplateColumns: "minmax(360px, 0.9fr) minmax(560px, 1.1fr)" }}>
        <section className="card">
          <div style={{ fontWeight: 700 }}>Build Query</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Pick a base table, select fields, and generate a starter SQL query.
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="label">Base table</div>
            <select className="input" value={baseTable} onChange={(e) => setBaseTable(e.target.value)}>
              {tables.map((table) => (
                <option key={table.tableName} value={table.tableName}>{table.tableName}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="label">Query template</div>
            <select className="input" value={template} onChange={(e) => setTemplate(e.target.value as "select" | "count" | "gid" | "date-range")}>
              <option value="select">Select rows</option>
              <option value="count">Count rows</option>
              <option value="gid">Find by GID</option>
              <option value="date-range">Date range query</option>
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="label">Join table</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Suggested joins found: {joinSuggestions.length} · Relationship entries on base table: {detail?.relationships?.length ?? 0}
            </div>
            <div className="toolbar" style={{ marginTop: 8 }}>
              <select className="input" value={joinTable} onChange={(e) => setJoinTable(e.target.value)}>
                <option value="">Select a suggested join</option>
                {joinSuggestions.map((join, idx) => (
                  <option key={`${join.tableName}-${join.condition}-${idx}`} value={`${join.tableName}|||${join.condition}`}>
                    {join.tableName} — {join.condition}
                  </option>
                ))}
              </select>
              <button className="btn" onClick={addJoin} disabled={!joinTable}>Add join</button>
            </div>
            {joinSuggestions.length ? (
              <div className="listStack" style={{ marginTop: 12, maxHeight: "24vh", overflowY: "auto" }}>
                {joinSuggestions.slice(0, 12).map((join, idx) => (
                  <div key={`${join.tableName}-${join.condition}-${idx}`} className="detailPane" style={{ minHeight: "auto" }}>
                    <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{join.tableName}</div>
                        <div className="mono muted" style={{ marginTop: 6, fontSize: 12 }}>{join.condition}</div>
                      </div>
                      <button className="btn" onClick={() => setJoinTable(`${join.tableName}|||${join.condition}`)}>Use</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted" style={{ marginTop: 12 }}>No FK-based join suggestions found for the current base table.</div>
            )}
            {joinedTables.length ? (
              <div className="listStack" style={{ marginTop: 12 }}>
                {joinedTables.map((join) => (
                  <div key={join.tableName} className="detailPane" style={{ minHeight: "auto" }}>
                    <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div className="mono" style={{ fontWeight: 700 }}>{join.tableName}</div>
                      <button className="btn" onClick={() => setJoinedTables((prev) => prev.filter((j) => j.tableName !== join.tableName))}>Remove</button>
                    </div>
                    <textarea
                      className="textarea mono"
                      value={join.condition}
                      onChange={(e) => setJoinedTables((prev) => prev.map((j) => (j.tableName === join.tableName ? { ...j, condition: e.target.value } : j)))}
                      style={{ minHeight: 90, marginTop: 8 }}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="formGrid" style={{ marginTop: 12 }}>
            <div>
              <div className="label">WHERE</div>
              <textarea className="textarea mono" value={whereText} onChange={(e) => setWhereText(e.target.value)} style={{ minHeight: 120 }} placeholder="e.g. t.INVOICE_GID = 'DOMAIN.ID'" />
            </div>
            <div>
              <div className="label">ORDER BY</div>
              <input className="input mono" value={orderBy} onChange={(e) => setOrderBy(e.target.value)} placeholder="e.g. t.INVOICE_DATE DESC" />
              <div className="label" style={{ marginTop: 12 }}>Limit</div>
              <input className="input mono" value={limitText} onChange={(e) => setLimitText(e.target.value)} placeholder="100" />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="label">Fields</div>
            <input className="input" style={{ marginTop: 8 }} value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} placeholder="Search fields" />
              <div className="listStack" style={{ marginTop: 12, maxHeight: "55vh", overflowY: "auto" }}>
                {filteredFields.map((field) => (
                  <label key={field.name} className="detailPane" style={{ minHeight: "auto", cursor: "pointer" }}>
                    <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div className="mono" style={{ fontWeight: 700 }}>{field.name}</div>
                      <input type="checkbox" checked={selectedFields.includes(`t.${field.name}`)} onChange={() => toggleField(`t.${field.name}`)} />
                    </div>
                    <div className="muted" style={{ marginTop: 6 }}>{field.description}</div>
                  </label>
                ))}
              </div>

              {joinedTables.length ? (
                <div style={{ marginTop: 16 }}>
                  <div className="label">Joined table fields</div>
                  <div className="listStack" style={{ marginTop: 12, maxHeight: "35vh", overflowY: "auto" }}>
                    {joinedTables.map((join) => (
                      <div key={join.tableName} className="detailPane" style={{ minHeight: "auto" }}>
                        <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 700 }}>{join.tableName} <span className="mono muted">({join.alias})</span></div>
                        </div>
                        <div className="listStack" style={{ marginTop: 8 }}>
                          {join.fields.slice(0, 40).map((field) => (
                            <label key={`${join.tableName}-${field.name}`} className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                              <div className="mono">{field.name}</div>
                              <input
                                type="checkbox"
                                checked={selectedFields.includes(`${join.alias}.${field.name}`)}
                                onChange={() => toggleField(`${join.alias}.${field.name}`)}
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

        <section className="card">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Generated SQL</div>
              <div className="muted" style={{ marginTop: 6 }}>Starter query pattern inspired by data-dictionary/query-builder tools.</div>
            </div>
            <button className="btn" onClick={copySql}>Copy SQL</button>
          </div>

          <pre className="pre mono" style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{sql}</pre>

          {detail ? (
            <div className="detailPane" style={{ marginTop: 12, minHeight: "auto" }}>
              <div style={{ fontWeight: 700 }}>{detail.tableName}</div>
              <div className="muted" style={{ marginTop: 6 }}>{detail.description || "No description available."}</div>
            </div>
          ) : null}
        </section>
      </div>
    </Shell>
  );
}
