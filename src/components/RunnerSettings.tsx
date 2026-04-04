"use client";

import { useState } from "react";
import { getDefaultQaApiBase } from "@/lib/runtimeConfig";

const KEY_URL = "otmos.qa.apiUrl";
const KEY_TOKEN = "otmos.qa.apiToken";
const DEFAULT_URL = getDefaultQaApiBase();

export default function RunnerSettings() {
  const [apiUrl, setApiUrl] = useState(() => typeof window === "undefined" ? DEFAULT_URL : (window.localStorage.getItem(KEY_URL) ?? DEFAULT_URL));
  const [apiToken, setApiToken] = useState(() => typeof window === "undefined" ? "" : (window.localStorage.getItem(KEY_TOKEN) ?? ""));
  const [saved, setSaved] = useState("");

  function save() {
    window.localStorage.setItem(KEY_URL, apiUrl);
    window.localStorage.setItem(KEY_TOKEN, apiToken);
    setSaved("Saved locally in browser.");
  }

  function clearAll() {
    window.localStorage.removeItem(KEY_URL);
    window.localStorage.removeItem(KEY_TOKEN);
    setApiUrl("");
    setApiToken("");
    setSaved("Cleared.");
  }

  return (
    <section className="card">
      <h2>Runner API</h2>
      <p className="muted" style={{ marginTop: 8 }}>
        Configure the remote QA runner base URL and optional bearer token. Stored only in your browser.
      </p>
      <div className="formGrid" style={{ marginTop: 16 }}>
        <label>
          <span className="label">Runner API URL</span>
          <input className="input" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="/api/qa or https://qa-runner.example.com/api" />
        </label>
        <label>
          <span className="label">Bearer token</span>
          <input className="input" type="password" value={apiToken} onChange={(e) => setApiToken(e.target.value)} placeholder="optional" />
        </label>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button className="btn primary" onClick={save}>Save</button>
        <button className="btn" onClick={clearAll}>Clear</button>
        <span className="muted mono">{saved}</span>
      </div>
    </section>
  );
}
