"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function parseList(text: string) {
  return text.replace(/,/g, "\n").split("\n").map((x) => x.trim()).filter(Boolean);
}

export default function OrdersPage() {
  const [orderKind, setOrderKind] = useState("Sales Orders");
  const [inputMode, setInputMode] = useState("Manual (builder)");
  const [rememberSession, setRememberSession] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem(KEY_REMEMBER) === "true");
  const [dryRun, setDryRun] = useState(() => typeof window === "undefined" ? true : (window.sessionStorage.getItem(KEY_DRY_RUN) ?? "true") === "true");
  const [endpoint, setEndpoint] = useState(() => typeof window === "undefined" ? "" : (window.sessionStorage.getItem(KEY_REMEMBER) === "true" ? (window.sessionStorage.getItem(KEY_ENDPOINT) ?? "") : ""));
  const [username, setUsername] = useState(() => typeof window === "undefined" ? "" : (window.sessionStorage.getItem(KEY_REMEMBER) === "true" ? (window.sessionStorage.getItem(KEY_USERNAME) ?? "") : ""));
  const [password, setPassword] = useState(() => typeof window === "undefined" ? "" : (window.sessionStorage.getItem(KEY_REMEMBER) === "true" ? (window.sessionStorage.getItem(KEY_PASSWORD) ?? "") : ""));

  const [domain, setDomain] = useState("THG");
  const [baseXid, setBaseXid] = useState("SO_09000-1128");
  const [currency, setCurrency] = useState("USD");
  const [shipFromXid, setShipFromXid] = useState("110");
  const [shipToText, setShipToText] = useState("10000000000013\n10000000000027");
  const [suppliersText, setSuppliersText] = useState("300000016179177\n300000016179200");
  const [itemText, setItemText] = useState("400000002438186\n300000005438196");
  const [useReleaseSuffixInGid, setUseReleaseSuffixInGid] = useState(false);
  const [useReleaseSuffixInLineIds, setUseReleaseSuffixInLineIds] = useState(false);
  const [releases, setReleases] = useState(2);
  const [minLines, setMinLines] = useState(2);
  const [maxLines, setMaxLines] = useState(3);
  const [minQty, setMinQty] = useState(500);
  const [maxQty, setMaxQty] = useState(3000);
  const [minVal, setMinVal] = useState(1000);
  const [maxVal, setMaxVal] = useState(15000);
  const [seed, setSeed] = useState(42);
  const [useGzip, setUseGzip] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState("USD");
  const [importText, setImportText] = useState("");
  const [templates, setTemplates] = useState<{ salesOrdersCsv?: string; purchaseOrdersCsv?: string }>({});
  const [preview, setPreview] = useState("<xml>Preview will appear here after generation.</xml>");
  const [summary, setSummary] = useState<Record<string, string> | null>(null);
  const [generatedPayloads, setGeneratedPayloads] = useState<Array<{ humanId: string; shipFrom: string; shipTo: string; lineCount: number }>>([]);
  const [zipFiles, setZipFiles] = useState<Array<{ name: string; contentBase64: string }>>([]);
  const [lastXml, setLastXml] = useState("");
  const [postResult, setPostResult] = useState<PostResult>(null);
  const [status, setStatus] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${ORDERS_API_BASE}/templates`, { cache: "no-store" });
      const data = await res.json();
      setTemplates(data);
      if (!importText) {
        setImportText(orderKind === "Purchase Orders"
          ? `${data.purchaseOrdersCsv}\nPO_1001,300000016179177,110,400000002438186,1,100,116783,1,1,USD,20250718102700,20250725102700,Asia/Taipei,+08:00,CNNGB,10010,SUPPLIER,THE HILLMAN GROUP,THE HILLMAN GROUP,DEFAULT,0`
          : `${data.salesOrdersCsv}\nSO_1001,110,10000000000013,400000002438186,1,100,USD,,1`);
      }
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }, [importText, orderKind]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTemplates(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTemplates]);

  const shipToList = useMemo(() => parseList(shipToText), [shipToText]);
  const itemList = useMemo(() => parseList(itemText), [itemText]);
  const supplierList = useMemo(() => parseList(suppliersText), [suppliersText]);

  async function loadImportFile(file: File) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      setImportText(await file.text());
      setStatus(`Loaded ${file.name}`);
      return;
    }
    setStatus(`Loaded ${file.name}, but CSV/text parsing is currently enabled in-browser. Paste content manually for now.`);
  }

  function downloadTemplate(kind: "sales" | "purchase") {
    const text = kind === "sales" ? (templates.salesOrdersCsv ?? "") : (templates.purchaseOrdersCsv ?? "");
    const blob = new Blob([`${text}\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "sales" ? "sales-orders-template.csv" : "purchase-orders-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generatePreview() {
    setStatus("Generating preview...");
    const payload = {
      orderKind,
      inputMode,
      domain,
      baseXid,
      currency: inputMode === "Import (CSV/Excel)" ? defaultCurrency : currency,
      shipFromXid,
      shipToXid: shipToList[0] || "",
      supplierShipFromXid: supplierList[0] || "300000016179177",
      dcShipToXid: shipToList[0] || "110",
      itemXid: itemList[0] || "ITEM_001",
      qty: minQty,
      value: minVal,
      importText,
      useReleaseSuffixInGid,
      useReleaseSuffixInLineIds,
      releases,
      minLines,
      maxLines,
      minQty,
      maxQty,
      minVal,
      maxVal,
      seed,
      useGzip,
    };
    const data = await orderPost<{ xml: string; summary: Record<string, string>; templates?: { salesOrdersCsv: string; purchaseOrdersCsv: string }; payloads?: Array<{ humanId: string; shipFrom: string; shipTo: string; lineCount: number }>; zipFiles?: Array<{ name: string; contentBase64: string }>; lastXml?: string }>(ORDERS_API_BASE, "/generate", payload);
    const xml = data.xml ?? "";
    setPreview(xml);
    setSummary(data.summary ?? null);
    setGeneratedPayloads(data.payloads ?? []);
    setZipFiles(data.zipFiles ?? []);
    setLastXml(data.lastXml ?? "");
    if (data.templates) setTemplates(data.templates);
    setStatus("Preview ready.");
    return xml;
  }

  async function generateAndPost() {
    try {
      const xml = await generatePreview();
      if (dryRun) {
        setPostResult({ id: "dry-run", endpoint, username, status: "dry-run", message: "Dry run enabled — payload generated but not POSTed.", createdAt: new Date().toISOString(), payloadBytes: String(xml.length) });
        setStatus("Dry run complete.");
        return;
      }
      const data = await orderPost<{ result: PostResult }>(ORDERS_API_BASE, "/post", { endpoint, username, password, xml, gzip: useGzip });
      setPostResult(data.result ?? null);
      setStatus("Post request completed.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  function downloadBase64File(name: string, contentBase64: string, mime = 'application/xml') {
    const url = `data:${mime};base64,${contentBase64}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
  }

  return (
    <Shell title="Order Generator">
      <section className="card" style={{ marginBottom: 16 }}>
        <SectionIntro title="OTM Connection" description="This matches the original connection-first workflow, but placed at the top per your preference." />
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}><input type="checkbox" checked={rememberSession} onChange={(e) => {
            const v = e.target.checked;
            setRememberSession(v);
            window.sessionStorage.setItem(KEY_REMEMBER, String(v));
            if (v) {
              window.sessionStorage.setItem(KEY_ENDPOINT, endpoint);
              window.sessionStorage.setItem(KEY_USERNAME, username);
              window.sessionStorage.setItem(KEY_PASSWORD, password);
            }
          }} /><span className="label">Remember for this session</span></label>
          <label style={{ display: "flex", alignItems: "center", gap: 10 }}><input type="checkbox" checked={dryRun} onChange={(e) => {
            const v = e.target.checked;
            setDryRun(v);
            window.sessionStorage.setItem(KEY_DRY_RUN, String(v));
          }} /><span className="label">Dry run (don&apos;t POST)</span></label>
          <button className="btn" onClick={() => {
            setEndpoint(""); setUsername(""); setPassword(""); setRememberSession(false);
            window.sessionStorage.removeItem(KEY_ENDPOINT); window.sessionStorage.removeItem(KEY_USERNAME); window.sessionStorage.removeItem(KEY_PASSWORD); window.sessionStorage.removeItem(KEY_REMEMBER);
          }}>Clear saved</button>
        </div>
        <div className="formGrid">
          <label><span className="label">OTM Endpoint (must contain &apos;dev&apos; or &apos;test&apos;)</span><input className="input" value={endpoint} onChange={(e) => { setEndpoint(e.target.value); if (rememberSession) window.sessionStorage.setItem(KEY_ENDPOINT, e.target.value); }} placeholder="https://&lt;pod&gt;-dev.gc3.oraclecloud.com/GC3/glog.integration.servlet.WMServlet" /></label>
          <label><span className="label">OTM Username</span><input className="input" value={username} onChange={(e) => { setUsername(e.target.value); if (rememberSession) window.sessionStorage.setItem(KEY_USERNAME, e.target.value); }} placeholder="integration_user" /></label>
          <label><span className="label">OTM Password</span><input className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (rememberSession) window.sessionStorage.setItem(KEY_PASSWORD, e.target.value); }} placeholder="••••••••" /></label>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <SectionIntro title="OTM Order Generator" description="Closer parity with the original Streamlit layout and field groupings." />
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <label className="label">What do you want to create?</label>
          <label><input type="radio" checked={orderKind === "Sales Orders"} onChange={() => { setOrderKind("Sales Orders"); if (baseXid.startsWith("PO_")) setBaseXid("SO_09000-1128"); setShipToText("10000000000013\n10000000000027"); }} /> Sales Orders</label>
          <label><input type="radio" checked={orderKind === "Purchase Orders"} onChange={() => { setOrderKind("Purchase Orders"); if (baseXid.startsWith("SO_")) setBaseXid("PO_09000-1128"); setShipToText("110"); }} /> Purchase Orders</label>
        </div>
        <div className="toolbar">
          <label className="label">Input Mode</label>
          <label><input type="radio" checked={inputMode === "Manual (builder)"} onChange={() => setInputMode("Manual (builder)")} /> Manual (builder)</label>
          <label><input type="radio" checked={inputMode === "Import (CSV/Excel)"} onChange={() => setInputMode("Import (CSV/Excel)")} /> Import (CSV/Excel)</label>
        </div>
      </section>

      {inputMode === "Import (CSV/Excel)" ? (
        <>
          <section className="card" style={{ marginBottom: 16 }}>
            <SectionIntro title="Import Orders from CSV/Excel" description="Upload CSV or Excel. For Sales Orders, you may include release_line_id or line_number to control ReleaseLineGid; otherwise lines are auto-sequenced." />
            <div className="grid2" style={{ marginBottom: 12 }}>
              <button className="btn" onClick={() => downloadTemplate("sales")}>⬇️ Download Sales Orders template</button>
              <button className="btn" onClick={() => downloadTemplate("purchase")}>⬇️ Download Purchase Orders template</button>
            </div>
            <div className={`dropzone ${dragActive ? "dropzoneActive" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(e) => {
              e.preventDefault(); setDragActive(false); const file = e.dataTransfer.files?.[0]; if (file) void loadImportFile(file);
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>Upload CSV or Excel</div>
                  <div className="muted" style={{ marginTop: 6 }}>Drag and drop a file here, or browse.</div>
                </div>
                <button className="btn" type="button" onClick={() => fileInputRef.current?.click()}>Browse files</button>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => { const file = e.target.files?.[0]; if (file) void loadImportFile(file); }} />
            </div>
            <div className="formGrid" style={{ marginTop: 16 }}>
              <label><span className="label">DomainName</span><input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} /></label>
              <label><span className="label">Default Currency (used if not present on a line)</span><input className="input" value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} /></label>
            </div>
            {orderKind === "Sales Orders" ? <div className="toolbar" style={{ marginTop: 12 }}><label><input type="checkbox" checked={useReleaseSuffixInGid} onChange={(e) => setUseReleaseSuffixInGid(e.target.checked)} /> Add release suffix (_R1) to Release GID (import)</label><label><input type="checkbox" checked={useReleaseSuffixInLineIds} onChange={(e) => setUseReleaseSuffixInLineIds(e.target.checked)} /> Add release suffix (_R1) to SO LINE IDs (import)</label></div> : null}
            <label style={{ display: "block", marginTop: 12 }}><span className="label">Imported content</span><textarea className="textarea" value={importText} onChange={(e) => setImportText(e.target.value)} /></label>
            <div className="toolbar" style={{ marginTop: 16 }}>
              <button className="btn primary" onClick={generatePreview}>Generate from file</button>
              <button className="btn" onClick={generateAndPost}>Generate &amp; POST from file</button>
            </div>
          </section>
        </>
      ) : (
        <>
          <details open className="card" style={{ marginBottom: 16 }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>📄 Header Template</summary><div className="formGrid" style={{ marginTop: 16 }}>
            <label><span className="label">DomainName</span><input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} /></label>
            <label><span className="label">Base XID (SO prefix or PO XID)</span><input className="input" value={baseXid} onChange={(e) => setBaseXid(e.target.value)} /></label>
            <label><span className="label">Currency</span><input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
          </div></details>

          <details open className="card" style={{ marginBottom: 16 }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>📍 Locations &amp; Items</summary><div style={{ marginTop: 16 }}>
            {orderKind === "Sales Orders" ? <label style={{ display: "block", marginBottom: 12 }}><span className="label">ShipFrom (Your DC) XID</span><input className="input" value={shipFromXid} onChange={(e) => setShipFromXid(e.target.value)} /></label> : <label style={{ display: "block", marginBottom: 12 }}><span className="label">Supplier ShipFrom XIDs (one per line)</span><textarea className="textarea" value={suppliersText} onChange={(e) => setSuppliersText(e.target.value)} /></label>}
            <label style={{ display: "block", marginBottom: 12 }}><span className="label">{orderKind === "Sales Orders" ? "ShipTo (Customers) XIDs" : "ShipTo (Your DC) XID(s) — first value will be used"}</span><textarea className="textarea" value={shipToText} onChange={(e) => setShipToText(e.target.value)} /></label>
            <label style={{ display: "block" }}><span className="label">PackagedItemGid XIDs (comma/newline)</span><textarea className="textarea" value={itemText} onChange={(e) => setItemText(e.target.value)} /></label>
          </div></details>

          <details open className="card" style={{ marginBottom: 16 }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>🧩 GID &amp; Line-ID Options</summary><div className="toolbar" style={{ marginTop: 16 }}>
            <label><input type="checkbox" checked={useReleaseSuffixInGid} onChange={(e) => setUseReleaseSuffixInGid(e.target.checked)} /> Add release suffix (_R#) to Release/PO XID</label>
            <label><input type="checkbox" checked={useReleaseSuffixInLineIds} onChange={(e) => setUseReleaseSuffixInLineIds(e.target.checked)} /> Add release suffix (_R#) to SO LINE IDs</label>
          </div></details>

          <details open className="card" style={{ marginBottom: 16 }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>🎚️ Generation Controls</summary><div className="formGrid" style={{ marginTop: 16 }}>
            <label><span className="label">How many orders</span><input className="input" type="number" value={releases} onChange={(e) => setReleases(Number(e.target.value || 1))} /></label>
            <label><span className="label">Min lines per order</span><input className="input" type="number" value={minLines} onChange={(e) => setMinLines(Number(e.target.value || 1))} /></label>
            <label><span className="label">Max lines per order</span><input className="input" type="number" value={maxLines} onChange={(e) => setMaxLines(Number(e.target.value || 1))} /></label>
            <label><span className="label">Min quantity</span><input className="input" type="number" value={minQty} onChange={(e) => setMinQty(Number(e.target.value || 1))} /></label>
            <label><span className="label">Max quantity</span><input className="input" type="number" value={maxQty} onChange={(e) => setMaxQty(Number(e.target.value || 1))} /></label>
            <label><span className="label">Min declared value</span><input className="input" type="number" value={minVal} onChange={(e) => setMinVal(Number(e.target.value || 1))} /></label>
            <label><span className="label">Max declared value</span><input className="input" type="number" value={maxVal} onChange={(e) => setMaxVal(Number(e.target.value || 1))} /></label>
            <label><span className="label">Random seed</span><input className="input" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value || 42))} /></label>
          </div><div className="toolbar" style={{ marginTop: 12 }}><label><input type="checkbox" checked={useGzip} onChange={(e) => setUseGzip(e.target.checked)} /> Send gzipped XML (Content-Encoding: gzip)</label></div></details>

          <section className="card" style={{ marginBottom: 16 }}>
            <SectionIntro title="Run" description="Generate XMLs or Generate &amp; POST to OTM." />
            <div className="toolbar">
              <button className="btn primary" onClick={generatePreview}>Generate XMLs</button>
              <button className="btn" onClick={generateAndPost}>Generate &amp; POST to OTM</button>
            </div>
            {(releases > 1 && !useReleaseSuffixInGid) ? <p className="muted" style={{ marginTop: 12 }}>⚠️ Multiple orders without suffix may create duplicate IDs. Consider enabling _R#.</p> : null}
            <div className="detailPane" style={{ marginTop: 16 }}><div className="kvGrid"><div><span className="muted">ShipTo count</span><div>{shipToList.length}</div></div><div><span className="muted">Item count</span><div>{itemList.length}</div></div><div><span className="muted">Supplier count</span><div>{orderKind === "Purchase Orders" ? supplierList.length : "n/a"}</div></div><div><span className="muted">Posted?</span><div>{dryRun ? "No (dry run)" : "Yes"}</div></div></div></div>
          </section>
        </>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <SectionIntro title="Preview &amp; results" description="Generated XML preview and result summary." />
        {summary ? <div className="kvGrid" style={{ marginBottom: 16 }}><div><span className="muted">Order Kind</span><div>{summary.orderKind}</div></div><div><span className="muted">Mode</span><div>{summary.inputMode}</div></div><div><span className="muted">Domain</span><div>{summary.domain}</div></div><div><span className="muted">Base XID</span><div>{summary.baseXid}</div></div><div><span className="muted">Lines</span><div>{summary.lineCount}</div></div></div> : null}
        {generatedPayloads.length ? <div style={{ overflowX: 'auto', marginBottom: 16 }}><table className="table"><thead><tr><th>Order ID</th><th>Ship From</th><th>Ship To</th><th># Lines</th></tr></thead><tbody>{generatedPayloads.map((p) => <tr key={p.humanId}><td>{p.humanId}</td><td>{p.shipFrom}</td><td>{p.shipTo}</td><td>{p.lineCount}</td></tr>)}</tbody></table></div> : null}
        {zipFiles.length ? <div className="toolbar" style={{ marginBottom: 16 }}><button className="btn" onClick={() => zipFiles.forEach((f) => downloadBase64File(f.name, f.contentBase64))}>⬇️ Download all XMLs</button>{lastXml ? <button className="btn" onClick={() => downloadBase64File('last_order.xml', btoa(unescape(encodeURIComponent(lastXml))))}>⬇️ Download last XML</button> : null}</div> : null}
        {postResult ? <div className="detailPane" style={{ marginBottom: 16 }}><div className="kvGrid"><div><span className="muted">Status</span><div>{postResult.status}</div></div><div><span className="muted">Endpoint</span><div>{postResult.endpoint || "-"}</div></div><div><span className="muted">Message</span><div>{postResult.message}</div></div><div><span className="muted">Bytes</span><div>{postResult.payloadBytes || "-"}</div></div></div></div> : null}
        <p className="muted mono" style={{ marginBottom: 12 }}>{status}</p>
        <pre className="pre">{preview}</pre>
      </section>
    </Shell>
  );
}
