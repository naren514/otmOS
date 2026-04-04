"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import SectionIntro from "@/components/SectionIntro";

type PostResult = { id: string; endpoint: string; username: string; status: string; message: string; createdAt: string } | null;

export default function OrdersPage() {
  const [orderKind, setOrderKind] = useState("Sales Orders");
  const [inputMode, setInputMode] = useState("Manual (builder)");
  const [domain, setDomain] = useState("THG");
  const [baseXid, setBaseXid] = useState("SO_09000-1128");
  const [currency, setCurrency] = useState("USD");
  const [endpoint, setEndpoint] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [preview, setPreview] = useState("<xml>Preview will appear here after generation.</xml>");
  const [summary, setSummary] = useState<Record<string, string> | null>(null);
  const [postResult, setPostResult] = useState<PostResult>(null);
  const [status, setStatus] = useState("");

  async function generatePreview() {
    setStatus("Generating preview...");
    const res = await fetch("/api/orders/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderKind, inputMode, domain, baseXid, currency }),
    });
    const data = await res.json();
    setPreview(data.xml ?? "");
    setSummary(data.summary ?? null);
    setStatus("Preview ready.");
  }

  async function generateAndPost() {
    await generatePreview();
    const res = await fetch("/api/orders/post", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ endpoint, username, password, xml: preview }),
    });
    const data = await res.json();
    setPostResult(data.result ?? null);
    setStatus(res.ok ? "Post request completed." : "Post blocked / failed.");
  }

  return (
    <Shell title="Order Generator">
      <div className="grid2">
        <section className="card">
          <SectionIntro title="Order setup" description="Generate Sales Order or Purchase Order payloads in a Vercel-friendly flow." actions={<button className="btn primary" onClick={generatePreview}>Generate preview</button>} />
          <div className="formGrid">
            <label><span className="label">What do you want to create?</span><select className="input" value={orderKind} onChange={(e) => setOrderKind(e.target.value)}><option>Sales Orders</option><option>Purchase Orders</option></select></label>
            <label><span className="label">Input mode</span><select className="input" value={inputMode} onChange={(e) => setInputMode(e.target.value)}><option>Manual (builder)</option><option>Import (CSV/Excel)</option></select></label>
            <label><span className="label">DomainName</span><input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} /></label>
            <label><span className="label">Base XID</span><input className="input" value={baseXid} onChange={(e) => setBaseXid(e.target.value)} /></label>
            <label><span className="label">Currency</span><input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
          </div>
          <div className="dropzone" style={{ marginTop: 16 }}>{inputMode === "Import (CSV/Excel)" ? "CSV/XLSX import workflow placeholder for remote parsing API." : "Manual builder workflow placeholder for remote order API."}</div>
        </section>

        <section className="card">
          <SectionIntro title="OTM connection" description="Posting is allowed only for demo non-prod endpoints containing dev or test." actions={<button className="btn" onClick={generateAndPost}>Generate & Post</button>} />
          <div className="formGrid">
            <label><span className="label">OTM Endpoint</span><input className="input" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://pod-dev.../WMServlet" /></label>
            <label><span className="label">Username</span><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} /></label>
            <label><span className="label">Password</span><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          </div>
          <p className="muted mono" style={{ marginTop: 12 }}>{status}</p>
          {postResult ? <div className="detailPane" style={{ marginTop: 16 }}><div className="kvGrid"><div><span className="muted">Status</span><div>{postResult.status}</div></div><div><span className="muted">Endpoint</span><div>{postResult.endpoint}</div></div><div><span className="muted">Message</span><div>{postResult.message}</div></div><div><span className="muted">Created</span><div>{postResult.createdAt}</div></div></div></div> : null}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <SectionIntro title="Preview & results" description="Generated XML preview and summary for current request." />
        {summary ? <div className="kvGrid" style={{ marginBottom: 16 }}><div><span className="muted">Order Kind</span><div>{summary.orderKind}</div></div><div><span className="muted">Mode</span><div>{summary.inputMode}</div></div><div><span className="muted">Domain</span><div>{summary.domain}</div></div><div><span className="muted">Base XID</span><div>{summary.baseXid}</div></div></div> : null}
        <pre className="pre">{preview}</pre>
      </section>
    </Shell>
  );
}
