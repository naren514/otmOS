"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";

type Run = {
  id: string;
  testId: string;
  startedAt?: string;
  finishedAt?: string | null;
  status: string;
  error?: string | null;
  artifacts?: {
    summary?: string;
    screenshots?: { absolutePath?: string; relativePath?: string }[];
    mochawesomeHtml?: string;
    mochawesomeJson?: string;
  };
};

export default function QaRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [runId, setRunId] = useState<string>("");
  const [run, setRun] = useState<Run | null>(null);
  const [logs, setLogs] = useState<{ buildLog: string; execLog: string } | null>(null);
  const [events, setEvents] = useState<Array<{ kind: string; level: string; message: string; at?: string | null }>>([]);

  useEffect(() => {
    void params.then((p) => setRunId(p.id));
  }, [params]);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    async function load() {
      const [runRes, logsRes, eventsRes] = await Promise.all([
        fetch(`/api/qa/runs/${runId}`),
        fetch(`/api/qa/runs/${runId}/logs`),
        fetch(`/api/qa/runs/${runId}/events`),
      ]);
      const runData = (await runRes.json()) as { run: Run };
      const logsData = (await logsRes.json()) as { buildLog: string; execLog: string };
      const eventsData = (await eventsRes.json()) as { events: Array<{ kind: string; level: string; message: string; at?: string | null }> };
      if (!cancelled) {
        setRun(runData.run);
        setLogs(logsData);
        setEvents(eventsData.events ?? []);
      }
    }
    void load();
    const interval = setInterval(() => {
      void load();
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [runId]);

  const latestScreenshot = useMemo(() => {
    const shots = run?.artifacts?.screenshots ?? [];
    const last = shots[shots.length - 1];
    if (!last?.relativePath || !runId) return "";
    return `/api/qa/runs/${runId}/artifacts/${last.relativePath}`;
  }, [run, runId]);

  return (
    <Shell title={`Run Viewer${run ? ` · ${run.testId}` : ""}`}>
      <div className="grid2" style={{ alignItems: "start", gridTemplateColumns: "minmax(360px, 0.9fr) minmax(560px, 1.1fr)" }}>
        <section className="card">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{run?.testId ?? runId}</div>
              <div className="muted" style={{ marginTop: 6 }}>Live run detail viewer (first pass)</div>
            </div>
            <div className="toolbar">
              <span className={`badge ${run?.status === "passed" ? "good" : run?.status === "failed" ? "bad" : "warn"}`}>{run?.status ?? "loading"}</span>
              <span className="badge">Auto refresh: 5s</span>
            </div>
          </div>

          {run ? (
            <div className="kvGrid" style={{ marginTop: 12 }}>
              <div><div className="muted">Started</div><div>{run.startedAt ?? "—"}</div></div>
              <div><div className="muted">Finished</div><div>{run.finishedAt ?? "—"}</div></div>
              <div><div className="muted">Summary</div><div>{run.artifacts?.summary ?? "—"}</div></div>
            </div>
          ) : null}

          {run?.error ? <div className="errorText" style={{ marginTop: 12 }}>{run.error}</div> : null}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Step timeline</div>
            <div className="listStack">
              {events.length ? events.map((event, index) => (
                <div key={`${event.kind}-${index}`} className="detailPane" style={{ minHeight: "auto" }}>
                  <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <span className={`badge ${event.level === "error" ? "bad" : event.level === "info" ? "good" : "warn"}`}>{event.kind}</span>
                    <span className="muted">{event.at ?? "live"}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>{event.message}</div>
                </div>
              )) : <div className="muted">No step events yet.</div>}
            </div>
          </div>
+
+          <div style={{ marginTop: 16 }}>
+            <div style={{ fontWeight: 700, marginBottom: 8 }}>Execution logs</div>
+            <details open>
+              <summary style={{ cursor: "pointer" }}>Build log</summary>
+              <pre className="pre mono" style={{ marginTop: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>{logs?.buildLog || "Loading..."}</pre>
+            </details>
+            <details style={{ marginTop: 12 }} open>
+              <summary style={{ cursor: "pointer" }}>Exec log</summary>
+              <pre className="pre mono" style={{ marginTop: 8, fontSize: 12, whiteSpace: "pre-wrap" }}>{logs?.execLog || "Loading..."}</pre>
+            </details>
+          </div>
        </section>

        <section className="card">
          <div style={{ fontWeight: 700 }}>Latest screenshot</div>
          <div className="muted" style={{ marginTop: 6 }}>This will become the basis of the live run viewer.</div>
          {latestScreenshot ? (
            <img src={latestScreenshot} alt="Latest run screenshot" style={{ width: "100%", marginTop: 12, borderRadius: 12, border: "1px solid var(--border)" }} />
          ) : (
            <div className="emptyState" style={{ marginTop: 12 }}>No screenshot artifact available yet for this run.</div>
          )}

          {run?.artifacts?.screenshots?.length ? (
            <div style={{ marginTop: 16 }}>
              <div className="muted" style={{ marginBottom: 8 }}>Screenshots ({run.artifacts.screenshots.length})</div>
              <div className="listStack">
                {run.artifacts.screenshots.slice(-10).reverse().map((shot) => (
                  <a key={shot.relativePath} className="listItem" href={`/api/qa/runs/${runId}/artifacts/${shot.relativePath}`} target="_blank" rel="noreferrer">
                    {shot.relativePath}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </Shell>
  );
}

