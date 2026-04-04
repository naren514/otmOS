"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import SectionIntro from "@/components/SectionIntro";
import { orderPost } from "@/lib/orderApi";
import { getDefaultOrdersApiBase } from "@/lib/runtimeConfig";

type PostResult = { id: string; endpoint: string; username: string; status: string; message: string; createdAt: string; payloadBytes?: string } | null;
const ORDERS_API_BASE = getDefaultOrdersApiBase();
const KEY_ENDPOINT = "otmos.orders.endpoint";
const KEY_USERNAME = "otmos.orders.username";
const KEY_PASSWORD = "otmos.orders.password";
const KEY_REMEMBER = "otmos.orders.remember";
const KEY_DRY_RUN = "otmos.orders.dryRun";

export default function OrdersPage() {
  const [orderKind, setOrderKind] = useState("Sales Orders");
  const [inputMode, setInputMode] = useState("Manual (builder)");
  const [domain, setDomain] = useState("THG");
  const [baseXid, setBaseXid] = useState("SO_09000-1128");
  const [currency, setCurrency] = useState("USD");
  const [shipFromXid, setShipFromXid] = useState("110");
  const [shipToXid, setShipToXid] = useState("10000000000013");
  const [supplierShipFromXid, setSupplierShipFromXid] = useState("300000016179177");
  const [dcShipToXid, setDcShipToXid] = useState("110");
  const [itemXid, setItemXid] = useState("400000002438186");
  const [qty, setQty] = useState(1);
  const [value, setValue] = useState(100);
  const [importText, setImportText] = useState("");
  const [templates, setTemplates] = useState<{ salesOrdersCsv?: string; purchaseOrdersCsv?: string }>({});
  const [rememberSession, setRememberSession] = useState(() => typeof window !== 'undefined' && window.sessionStorage.getItem(KEY_REMEMBER) === 'true');
  const [dryRun, setDryRun] = useState(() => typeof window === 'undefined' ? true : (window.sessionStorage.getItem(KEY_DRY_RUN) ?? 'true') === 'true');
  const [endpoint, setEndpoint] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(KEY_REMEMBER) === 'true' ? (window.sessionStorage.getItem(KEY_ENDPOINT) ?? '') : '';
  });
  const [username, setUsername] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(KEY_REMEMBER) === 'true' ? (window.sessionStorage.getItem(KEY_USERNAME) ?? '') : '';
  });
  const [password, setPassword] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.sessionStorage.getItem(KEY_REMEMBER) === 'true' ? (window.sessionStorage.getItem(KEY_PASSWORD) ?? '') : '';
  });
  const [preview, setPreview] = useState("<xml>Preview will appear here after generation.</xml>");
  const [summary, setSummary] = useState<Record<string, string> | null>(null);
  const [postResult, setPostResult] = useState<PostResult>(null);
  const [status, setStatus] = useState("");

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${ORDERS_API_BASE}/templates`, { cache: 'no-store' });
      const data = await res.json();
      setTemplates(data);
      if (!importText) setImportText(orderKind === 'Purchase Orders' ? `${data.purchaseOrdersCsv}\nPO_1001,300000016179177,110,400000002438186,1,100,116783,1,1,USD,20250718102700,20250725102700,Asia/Taipei,+08:00,CNNGB,10010,SUPPLIER,THE HILLMAN GROUP,THE HILLMAN GROUP,DEFAULT,0` : `${data.salesOrdersCsv}\nSO_1001,110,10000000000013,400000002438186,1,100,USD,,1`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }, [importText, orderKind]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTemplates(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTemplates]);

  async function generatePreview() {
    setStatus("Generating preview...");
    const data = await orderPost<{ xml: string; summary: Record<string, string>; templates?: { salesOrdersCsv: string; purchaseOrdersCsv: string } }>(ORDERS_API_BASE, "/generate", {
      orderKind, inputMode, domain, baseXid, currency, shipFromXid, shipToXid, supplierShipFromXid, dcShipToXid, itemXid, qty, value, importText,
    });
    setPreview(data.xml ?? "");
    setSummary(data.summary ?? null);
    if (data.templates) setTemplates(data.templates);
    setStatus("Preview ready.");
  }

  async function generateAndPost() {
    try {
      const generated = await orderPost<{ xml: string; summary: Record<string, string> }>(ORDERS_API_BASE, "/generate", {
        orderKind, inputMode, domain, baseXid, currency, shipFromXid, shipToXid, supplierShipFromXid, dcShipToXid, itemXid, qty, value, importText,
      });
      setPreview(generated.xml ?? "");
      setSummary(generated.summary ?? null);
      if (dryRun) {
        setPostResult({ id: 'dry-run', endpoint, username, status: 'dry-run', message: "Dry run enabled — payload generated but not POSTed.", createdAt: new Date().toISOString(), payloadBytes: String((generated.xml || '').length) });
        setStatus("Dry run complete.");
        return;
      }
      const data = await orderPost<{ result: PostResult }>(ORDERS_API_BASE, "/post", { endpoint, username, password, xml: generated.xml });
      setPostResult(data.result ?? null);
      setStatus("Post request completed.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Shell title="Order Generator">
      <div className="grid2">
        <section className="card">
          <SectionIntro title="Order setup" description="Generate Sales Order or Purchase Order payloads through the Orders backend." actions={<button className="btn primary" onClick={generatePreview}>Generate preview</button>} />
          <div className="formGrid">
            <label><span className="label">What do you want to create?</span><select className="input" value={orderKind} onChange={(e) => {
              const next = e.target.value;
              setOrderKind(next);
              if (next === 'Purchase Orders' && baseXid.startsWith('SO_')) setBaseXid('PO_09000-1128');
              if (next === 'Sales Orders' && baseXid.startsWith('PO_')) setBaseXid('SO_09000-1128');
            }}><option>Sales Orders</option><option>Purchase Orders</option></select></label>
            <label><span className="label">Input mode</span><select className="input" value={inputMode} onChange={(e) => setInputMode(e.target.value)}><option>Manual (builder)</option><option>Import (CSV/Excel)</option></select></label>
            <label><span className="label">DomainName</span><input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} /></label>
            <label><span className="label">Base XID</span><input className="input" value={baseXid} onChange={(e) => setBaseXid(e.target.value)} /></label>
            <label><span className="label">Currency</span><input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
          </div>

          {inputMode === 'Manual (builder)' ? (
            <div className="formGrid" style={{ marginTop: 16 }}>
              {orderKind === 'Sales Orders' ? (
                <>
                  <label><span className="label">Ship From XID</span><input className="input" value={shipFromXid} onChange={(e) => setShipFromXid(e.target.value)} /></label>
                  <label><span className="label">Ship To XID</span><input className="input" value={shipToXid} onChange={(e) => setShipToXid(e.target.value)} /></label>
                </>
              ) : (
                <>
                  <label><span className="label">Supplier Ship From XID</span><input className="input" value={supplierShipFromXid} onChange={(e) => setSupplierShipFromXid(e.target.value)} /></label>
                  <label><span className="label">DC Ship To XID</span><input className="input" value={dcShipToXid} onChange={(e) => setDcShipToXid(e.target.value)} /></label>
                </>
              )}
              <label><span className="label">Item XID</span><input className="input" value={itemXid} onChange={(e) => setItemXid(e.target.value)} /></label>
              <label><span className="label">Quantity</span><input className="input" type="number" value={qty} onChange={(e) => setQty(Number(e.target.value || 1))} /></label>
              <label><span className="label">Declared Value</span><input className="input" type="number" value={value} onChange={(e) => setValue(Number(e.target.value || 0))} /></label>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div className="toolbar" style={{ marginBottom: 8 }}>
                <span className="muted">Template columns:</span>
                <code className="mono">{orderKind === 'Purchase Orders' ? templates.purchaseOrdersCsv : templates.salesOrdersCsv}</code>
              </div>
              <textarea className="textarea" value={importText} onChange={(e) => setImportText(e.target.value)} />
            </div>
          )}
        </section>

        <section className="card">
          <SectionIntro title="OTM connection" description="Posting is allowed only for non-prod endpoints containing dev or test." actions={<button className="btn" onClick={generateAndPost}>Generate & Post</button>} />
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={rememberSession} onChange={(e) => {
                const v = e.target.checked;
                setRememberSession(v);
                window.sessionStorage.setItem(KEY_REMEMBER, String(v));
                if (v) {
                  window.sessionStorage.setItem(KEY_ENDPOINT, endpoint);
                  window.sessionStorage.setItem(KEY_USERNAME, username);
                  window.sessionStorage.setItem(KEY_PASSWORD, password);
                }
              }} />
              <span className="label">Remember for this session</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={dryRun} onChange={(e) => {
                const v = e.target.checked;
                setDryRun(v);
                window.sessionStorage.setItem(KEY_DRY_RUN, String(v));
              }} />
              <span className="label">Dry run (don’t POST)</span>
            </label>
            <button className="btn" onClick={() => {
              setEndpoint('');
              setUsername('');
              setPassword('');
              setRememberSession(false);
              window.sessionStorage.removeItem(KEY_ENDPOINT);
              window.sessionStorage.removeItem(KEY_USERNAME);
              window.sessionStorage.removeItem(KEY_PASSWORD);
              window.sessionStorage.removeItem(KEY_REMEMBER);
            }}>Clear saved</button>
          </div>
          <div className="formGrid">
            <label><span className="label">OTM Endpoint (must contain &apos;dev&apos; or &apos;test&apos;)</span><input className="input" value={endpoint} onChange={(e) => {
              const v = e.target.value;
              setEndpoint(v);
              if (rememberSession) window.sessionStorage.setItem(KEY_ENDPOINT, v);
            }} placeholder="https://pod-dev.../WMServlet" /></label>
            <label><span className="label">OTM Username</span><input className="input" value={username} onChange={(e) => {
              const v = e.target.value;
              setUsername(v);
              if (rememberSession) window.sessionStorage.setItem(KEY_USERNAME, v);
            }} /></label>
            <label><span className="label">OTM Password</span><input className="input" type="password" value={password} onChange={(e) => {
              const v = e.target.value;
              setPassword(v);
              if (rememberSession) window.sessionStorage.setItem(KEY_PASSWORD, v);
            }} /></label>
          </div>
          <p className="muted mono" style={{ marginTop: 12 }}>{status}</p>
          {postResult ? <div className="detailPane" style={{ marginTop: 16 }}><div className="kvGrid"><div><span className="muted">Status</span><div>{postResult.status}</div></div><div><span className="muted">Endpoint</span><div>{postResult.endpoint}</div></div><div><span className="muted">Message</span><div>{postResult.message}</div></div><div><span className="muted">Bytes</span><div>{postResult.payloadBytes || '-'}</div></div></div></div> : null}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <SectionIntro title="Preview & results" description="Generated XML preview and summary for current request." />
        {summary ? <div className="kvGrid" style={{ marginBottom: 16 }}><div><span className="muted">Order Kind</span><div>{summary.orderKind}</div></div><div><span className="muted">Mode</span><div>{summary.inputMode}</div></div><div><span className="muted">Domain</span><div>{summary.domain}</div></div><div><span className="muted">Base XID</span><div>{summary.baseXid}</div></div><div><span className="muted">Lines</span><div>{summary.lineCount}</div></div></div> : null}
        <pre className="pre">{preview}</pre>
      </section>
    </Shell>
  );
}
