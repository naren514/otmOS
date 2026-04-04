"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { qaGet, type QARun } from "@/lib/qaApi";

const KEY_URL = "otmos.qa.apiUrl";
const KEY_TOKEN = "otmos.qa.apiToken";

export default function QARunsPage() {
  const [apiUrl] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(KEY_URL) ?? ""));
  const [apiToken] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(KEY_TOKEN) ?? ""));
  const [runs, setRuns] = useState<QARun[]>([]);
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(50);

  async function load(url: string, token: string, limitValue: number) {
    try {
      const data = await qaGet<{ runs: QARun[] }>(url, `/runs?limit=${limitValue}`, token);
      setRuns(data.runs ?? []);
      setStatus("Refreshed.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    if (!apiUrl) return;
    const timer = window.setTimeout(() => {
      void load(apiUrl, apiToken, 50);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [apiUrl, apiToken]);

  return (
    <Shell title="QA Runs">
      <section className="card">
        <h2>Run History</h2>
        <div className="toolbar" style={{ marginTop: 16 }}>
          <label className="label">Limit</label>
          <input className="input" style={{ width: 120 }} type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value || 50))} />
          <button className="btn" onClick={() => load(apiUrl, apiToken, limit)}>Refresh</button>
          <span className="muted mono">{status}</span>
        </div>
        {!runs.length ? (
          <p className="muted" style={{ marginTop: 12 }}>No runs found.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Test</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Finished</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="mono">{run.id}</td>
                    <td>{run.testId}</td>
                    <td><span className="badge">{run.status}</span></td>
                    <td>{run.startedAt}</td>
                    <td>{run.finishedAt ?? "-"}</td>
                    <td>{run.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Shell>
  );
}
