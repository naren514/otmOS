"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import RunnerSettings from "@/components/RunnerSettings";
import { qaGet, qaPost, type QAConfig } from "@/lib/qaApi";

const KEY_URL = "otmos.qa.apiUrl";
const KEY_TOKEN = "otmos.qa.apiToken";
const KEY_PASSWORD = "otmos.qa.password";
const DEFAULT_URL = "/api/qa";

export default function AdminPage() {
  const [apiUrl] = useState(() => typeof window === "undefined" ? DEFAULT_URL : (window.localStorage.getItem(KEY_URL) ?? DEFAULT_URL));
  const [apiToken] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(KEY_TOKEN) ?? ""));
  const [baseUrl, setBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [browser, setBrowser] = useState<QAConfig["browser"]>("chrome");
  const [password, setPassword] = useState(() => typeof window === "undefined" ? "" : (window.sessionStorage.getItem(KEY_PASSWORD) ?? ""));
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!apiUrl) return;
    (async () => {
      try {
        const data = await qaGet<{ config?: QAConfig }>(apiUrl, "/config", apiToken);
        if (data?.config) {
          setBaseUrl(data.config.baseUrl ?? "");
          setUsername(data.config.username ?? "");
          setBrowser(data.config.browser ?? "chrome");
        }
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [apiUrl, apiToken]);

  async function save() {
    if (!apiUrl) {
      setStatus("Set Runner API URL first.");
      return;
    }
    setStatus("Saving...");
    try {
      await qaPost(apiUrl, "/config", { baseUrl, username, browser }, apiToken);
      window.sessionStorage.setItem(KEY_PASSWORD, password);
      setStatus("Saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Shell title="Admin">
      <RunnerSettings />
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Environment</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Configure the OTM target for the remote QA runner. Password is stored in browser session storage only.
        </p>
        <div className="formGrid" style={{ marginTop: 16 }}>
          <label>
            <span className="label">OTM Base URL</span>
            <input className="input" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-otm-host/otm" />
          </label>
          <label>
            <span className="label">Username</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="qa.user" />
          </label>
          <label>
            <span className="label">Password (session-only)</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => {
                const v = e.target.value;
                setPassword(v);
                window.sessionStorage.setItem(KEY_PASSWORD, v);
              }}
              placeholder="••••••••"
            />
          </label>
          <label>
            <span className="label">Browser</span>
            <select className="input" value={browser} onChange={(e) => setBrowser(e.target.value as QAConfig["browser"])}>
              <option value="chrome">chrome</option>
              <option value="firefox">firefox</option>
              <option value="edge">edge</option>
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
          <button className="btn primary" onClick={save}>Save environment</button>
          <span className="mono muted">{status}</span>
        </div>
      </section>
    </Shell>
  );
}
