"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import RunnerSettings from "@/components/RunnerSettings";
import SectionIntro from "@/components/SectionIntro";

export default function OrdersPage() {
  const [orderKind, setOrderKind] = useState("Sales Orders");
  const [inputMode, setInputMode] = useState("Manual (builder)");
  const [domain, setDomain] = useState("THG");
  const [baseXid, setBaseXid] = useState("SO_09000-1128");
  const [currency, setCurrency] = useState("USD");
  const [endpoint, setEndpoint] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState("<xml>Preview will appear here after API hookup.</xml>");

  return (
    <Shell title="Order Generator">
      <RunnerSettings />

      <div className="grid2" style={{ marginTop: 16 }}>
        <section className="card">
          <SectionIntro title="Order setup" description="Configure payload generation for Sales Orders or Purchase Orders." />
          <div className="formGrid">
            <label>
              <span className="label">What do you want to create?</span>
              <select className="input" value={orderKind} onChange={(e) => setOrderKind(e.target.value)}>
                <option>Sales Orders</option>
                <option>Purchase Orders</option>
              </select>
            </label>
            <label>
              <span className="label">Input mode</span>
              <select className="input" value={inputMode} onChange={(e) => setInputMode(e.target.value)}>
                <option>Manual (builder)</option>
                <option>Import (CSV/Excel)</option>
              </select>
            </label>
            <label>
              <span className="label">DomainName</span>
              <input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} />
            </label>
            <label>
              <span className="label">Base XID</span>
              <input className="input" value={baseXid} onChange={(e) => setBaseXid(e.target.value)} />
            </label>
            <label>
              <span className="label">Currency</span>
              <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            </label>
          </div>

          <div className="dropzone" style={{ marginTop: 16 }}>
            {inputMode === "Import (CSV/Excel)" ? "CSV/XLSX upload placeholder" : "Manual builder placeholder"}
          </div>
        </section>

        <section className="card">
          <SectionIntro title="OTM connection" description="Non-prod posting only. This page will call a remote order API in production." />
          <div className="formGrid">
            <label>
              <span className="label">OTM Endpoint</span>
              <input className="input" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://pod-dev.../WMServlet" />
            </label>
            <label>
              <span className="label">Username</span>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>
            <label>
              <span className="label">Password</span>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
          </div>
          <div className="toolbar" style={{ marginTop: 16 }}>
            <button className="btn primary" onClick={() => setPreview(`<xml kind="${orderKind}" mode="${inputMode}">Generated preview placeholder</xml>`)}>Generate preview</button>
            <button className="btn">Generate & Post</button>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <SectionIntro title="Preview & results" description="Result preview area for generated XML and status responses." />
        <pre className="pre">{preview}</pre>
      </section>
    </Shell>
  );
}
