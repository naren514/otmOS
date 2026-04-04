"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { qaGet, qaPost, type QACycle } from "@/lib/qaApi";

const KEY_URL = "otmos.qa.apiUrl";
const KEY_TOKEN = "otmos.qa.apiToken";

export default function QACyclesPage() {
  const [apiUrl] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(KEY_URL) ?? ""));
  const [apiToken] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(KEY_TOKEN) ?? ""));
  const [cycles, setCycles] = useState<QACycle[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!apiUrl) return;
    (async () => {
      try {
        const data = await qaGet<{ cycles: QACycle[] }>(apiUrl, "/cycles", apiToken);
        setCycles(data.cycles ?? []);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [apiUrl, apiToken]);

  async function runCycle(id: string) {
    try {
      const data = await qaPost(apiUrl, `/cycles/${id}/run`, {}, apiToken);
      setStatus(`Cycle run requested: ${JSON.stringify(data)}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Shell title="QA Cycles">
      <section className="card">
        <h2>Saved Cycles</h2>
        {status ? <p className="muted" style={{ marginTop: 8 }}>{status}</p> : null}
        {!cycles.length ? (
          <p className="muted" style={{ marginTop: 12 }}>No cycles found.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tests</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((cycle) => (
                  <tr key={cycle.id}>
                    <td>{cycle.name}</td>
                    <td className="mono">{cycle.testIds.join(", ")}</td>
                    <td>{cycle.createdAt}</td>
                    <td><button className="btn" onClick={() => runCycle(cycle.id)}>Run cycle</button></td>
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
