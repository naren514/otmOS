"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import { qaGet, qaPost, type QARun, type QATest } from "@/lib/qaApi";

const KEY_URL = "otmos.qa.apiUrl";
const KEY_TOKEN = "otmos.qa.apiToken";
const KEY_PASSWORD = "otmos.qa.password";
const DEFAULT_URL = "/api/qa";

export default function QATestsPage() {
  const [apiUrl] = useState(() => typeof window === "undefined" ? DEFAULT_URL : (window.localStorage.getItem(KEY_URL) ?? DEFAULT_URL));
  const [apiToken] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(KEY_TOKEN) ?? ""));
  const [tests, setTests] = useState<QATest[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [password] = useState(() => typeof window === "undefined" ? "" : (window.sessionStorage.getItem(KEY_PASSWORD) ?? ""));
  const [tagQuery, setTagQuery] = useState("");
  const [error, setError] = useState("");
  const [lastRun, setLastRun] = useState<QARun | null>(null);
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    if (!apiUrl) return;
    (async () => {
      try {
        const data = await qaGet<{ tests: QATest[] }>(apiUrl, "/tests", apiToken);
        setTests(data.tests ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [apiUrl, apiToken]);

  const filtered = useMemo(() => {
    const wanted = tagQuery.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (!wanted.length) return tests;
    return tests.filter((t) => {
      const tags = (t.tags ?? []).map((x) => x.toLowerCase());
      return wanted.every((w) => tags.some((tag) => tag.startsWith(w)));
    });
  }, [tests, tagQuery]);

  async function runOne(testId: string) {
    if (!apiUrl) return setError("Set Runner API URL in Admin first.");
    if (!password) return setError("Set password in Admin first.");
    setRunning(testId);
    setError("");
    try {
      const data = await qaPost<{ run: QARun }>(apiUrl, "/runs", { testId, password }, apiToken);
      setLastRun(data.run);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(null);
    }
  }

  async function runMany(ids: string[]) {
    for (const id of ids) {
      await runOne(id);
    }
  }

  async function saveCycle(ids: string[]) {
    const name = `cycle-${new Date().toISOString()}`;
    try {
      await qaPost(apiUrl, "/cycles", { name, testIds: ids }, apiToken);
      setError(`Saved cycle ${name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Shell title="QA Tests">
      <section className="card">
        <h2>Test Library</h2>
        <div className="toolbar" style={{ marginTop: 16 }}>
          <input className="input grow" value={tagQuery} onChange={(e) => setTagQuery(e.target.value)} placeholder="Filter by tags: rating, ocean" />
          <button className="btn" onClick={() => runMany(filtered.map((t) => t.id))} disabled={!filtered.length || !!running}>Run all shown</button>
        </div>
        {error ? <p className="errorText" style={{ marginTop: 12 }}>{error}</p> : null}
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>Scenario</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const isSelected = !!selected[t.id];
                return (
                  <tr key={t.id}>
                    <td>
                      <input type="checkbox" checked={isSelected} onChange={(e) => setSelected((prev) => ({ ...prev, [t.id]: e.target.checked }))} />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.title ?? t.id}</div>
                      <div className="muted mono">{t.id}</div>
                      <div className="muted mono">{t.file}</div>
                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(t.tags ?? []).map((tag) => <span className="badge" key={tag}>{tag}</span>)}
                      </div>
                    </td>
                    <td>
                      <button className="btn" onClick={() => runOne(t.id)} disabled={running === t.id}>
                        {running === t.id ? "Running..." : "Run"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="toolbar" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => runMany(Object.keys(selected).filter((id) => selected[id]))}>Run selected</button>
          <button className="btn" onClick={() => saveCycle(Object.keys(selected).filter((id) => selected[id]))}>Save selected as cycle</button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Last Result</h2>
        {lastRun ? <pre className="pre">{JSON.stringify(lastRun, null, 2)}</pre> : <p className="muted">No runs yet.</p>}
      </section>
    </Shell>
  );
}
