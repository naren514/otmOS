"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import SectionIntro from "@/components/SectionIntro";
import StatusBadge from "@/components/StatusBadge";
import { qaGet, type QARun } from "@/lib/qaApi";

const KEY_URL = "otmos.qa.apiUrl";
const KEY_TOKEN = "otmos.qa.apiToken";

export default function QARunsPage() {
  const [apiUrl] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(KEY_URL) ?? ""));
  const [apiToken] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(KEY_TOKEN) ?? ""));
  const [runs, setRuns] = useState<QARun[]>([]);
  const [selectedRun, setSelectedRun] = useState<QARun | null>(null);
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async (runLimit = limit) => {
    if (!apiUrl) return;
    try {
      const data = await qaGet<{ runs: QARun[] }>(apiUrl, `/runs?limit=${runLimit}`, apiToken);
      const nextRuns = data.runs ?? [];
      setRuns(nextRuns);
      if (selectedRun) {
        const match = nextRuns.find((r) => r.id === selectedRun.id);
        if (match) setSelectedRun(match);
      }
      setStatus(`Refreshed ${new Date().toLocaleTimeString()}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }, [apiToken, apiUrl, limit, selectedRun]);

  useEffect(() => {
    if (!apiUrl) return;
    const timer = window.setTimeout(() => {
      void load(50);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [apiUrl, load]);

  useEffect(() => {
    if (!apiUrl || !autoRefresh) return;
    const interval = window.setInterval(() => {
      void load();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [apiUrl, autoRefresh, load]);

  const grouped = useMemo(() => {
    const running = runs.filter((r) => ["running", "queued"].includes(r.status));
    const done = runs.filter((r) => !["running", "queued"].includes(r.status));
    return { running, done };
  }, [runs]);

  return (
    <Shell title="QA Runs">
      <section className="card">
        <SectionIntro
          title="Run History"
          description="Inspect live and completed QA runs from the remote runner."
          actions={
            <div className="toolbar">
              <label className="label">Limit</label>
              <input className="input inputSmall" type="number" value={limit} onChange={(e) => setLimit(Number(e.target.value || 50))} />
              <label className="toolbar"><input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> Auto refresh</label>
              <button className="btn" onClick={() => load()}>Refresh</button>
            </div>
          }
        />
        <p className="muted mono">{status}</p>

        {!apiUrl ? (
          <p className="muted" style={{ marginTop: 16 }}>Configure the Runner API in Admin first.</p>
        ) : null}

        <div className="grid2" style={{ marginTop: 20 }}>
          <div>
            <h3 style={{ marginBottom: 10 }}>Active</h3>
            <div className="listStack">
              {grouped.running.length ? grouped.running.map((run) => (
                <button key={run.id} className={`listItem ${selectedRun?.id === run.id ? "selected" : ""}`} onClick={() => setSelectedRun(run)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{run.testId}</strong>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="muted mono" style={{ marginTop: 6 }}>{run.id}</div>
                  <div className="muted" style={{ marginTop: 4 }}>{run.startedAt}</div>
                </button>
              )) : <p className="muted">No active runs.</p>}
            </div>

            <h3 style={{ marginTop: 20, marginBottom: 10 }}>Recent</h3>
            <div className="listStack">
              {grouped.done.length ? grouped.done.map((run) => (
                <button key={run.id} className={`listItem ${selectedRun?.id === run.id ? "selected" : ""}`} onClick={() => setSelectedRun(run)}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{run.testId}</strong>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="muted mono" style={{ marginTop: 6 }}>{run.id}</div>
                  <div className="muted" style={{ marginTop: 4 }}>{run.finishedAt ?? run.startedAt}</div>
                </button>
              )) : <p className="muted">No recent runs.</p>}
            </div>
          </div>

          <div>
            <h3 style={{ marginBottom: 10 }}>Run detail</h3>
            <div className="detailPane">
              {!selectedRun ? (
                <p className="muted">Select a run to inspect logs, artifacts, and status.</p>
              ) : (
                <>
                  <div className="kvGrid">
                    <div><span className="muted">Run ID</span><div className="mono">{selectedRun.id}</div></div>
                    <div><span className="muted">Test</span><div>{selectedRun.testId}</div></div>
                    <div><span className="muted">Status</span><div><StatusBadge status={selectedRun.status} /></div></div>
                    <div><span className="muted">Started</span><div>{selectedRun.startedAt}</div></div>
                    <div><span className="muted">Finished</span><div>{selectedRun.finishedAt ?? "-"}</div></div>
                    <div><span className="muted">Error</span><div>{selectedRun.error ?? "-"}</div></div>
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <h4 style={{ marginBottom: 8 }}>Artifacts</h4>
                    <pre className="pre">{JSON.stringify(selectedRun.artifacts ?? {}, null, 2)}</pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
