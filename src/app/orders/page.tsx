"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Shell from "@/components/Shell";
import SectionIntro from "@/components/SectionIntro";
import StatusBadge from "@/components/StatusBadge";
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
  const [generatedPayloads, setGeneratedPayloads] = useState<Array<{ humanId: string; shipFrom: string; shipTo: string; lineCount: number; posted?: boolean; status?: string; timestamp?: string }>>([]);
  const [zipFiles, setZipFiles] = useState<Array<{ name: string; contentBase64: string }>>([]);
  const [lastXml, setLastXml] = useState("");
  const [postResult, setPostResult] = useState<PostResult>(null);
  const [status, setStatus] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
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

  const isEndpointValid = useMemo(() => {
    if (!endpoint) return null;
    const lower = endpoint.toLowerCase();
    return lower.includes("dev") || lower.includes("test");
  }, [endpoint]);

  function loadSampleData() {
    if (orderKind === "Sales Orders") {
      setDomain("THG");
      setBaseXid("SO_09000-1128");
      setCurrency("USD");
      setShipFromXid("110");
      setShipToText("10000000000013\n10000000000027");
      setItemText("400000002438186\n300000005438196");
    } else {
      setDomain("THG");
      setBaseXid("PO_09000-1128");
      setCurrency("USD");
      setSuppliersText("300000016179177\n300000016179200");
      setShipToText("110");
      setItemText("400000004438186\n300000005438196");
    }
    setReleases(2);
    setMinLines(2);
    setMaxLines(3);
    setMinQty(500);
    setMaxQty(3000);
    setMinVal(1000);
    setMaxVal(15000);
    setSeed(42);
    setStatus("Sample data loaded.");
  }

  function resetToDefaults() {
    loadSampleData();
    setUseReleaseSuffixInGid(false);
    setUseReleaseSuffixInLineIds(false);
    setUseGzip(false);
    setStatus("Reset to defaults.");
  }

  function copyXmlToClipboard() {
    navigator.clipboard.writeText(preview);
    setStatus("XML copied to clipboard!");
  }

  function formatXml(xml: string): string {
    if (!xml || xml === "<xml>Preview will appear here after generation.</xml>") return xml;
    try {
      const formatted = xml
        .replace(/(<\w+)/g, '\n$1')
        .replace(/(<\/\w+>)/g, '$1\n')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      return formatted
        .split('\n')
        .map(line => line.trim())
        .join('\n');
    } catch {
      return xml;
    }
  }

  function highlightXml(xml: string): string {
    if (!xml || xml === "<xml>Preview will appear here after generation.</xml>") {
      return `<span style="color: #6b7280;">${xml}</span>`;
    }

    return xml
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(&lt;\?xml.*?\?&gt;)/g, '<span style="color: #6366f1; font-weight: 600;">$1</span>')
      .replace(/(&lt;!--.*?--&gt;)/g, '<span style="color: #6b7280; font-style: italic;">$1</span>')
      .replace(/(&lt;\/?)(\w+)/g, '$1<span style="color: #dc2626; font-weight: 600;">$2</span>')
      .replace(/(&gt;)/g, '<span style="color: #dc2626;">$1</span>')
      .replace(/(\w+)=/g, '<span style="color: #2563eb;">$1</span>=')
      .replace(/="([^"]*)"/g, '=<span style="color: #059669;">"$1"</span>');
  }

  async function loadImportFile(file: File) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv") || name.endsWith(".txt")) {
      setImportText(await file.text());
      setUploadedFileName(file.name);
      setStatus("");
      return;
    }
    setUploadedFileName(file.name);
    setStatus("");
  }

  function clearUploadedFile() {
    setImportText("");
    setUploadedFileName("");
    setStatus("");
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
    setIsGenerating(true);
    setStatus("");

    // Clear previous generation data
    setGeneratedPayloads([]);
    setZipFiles([]);
    setSummary(null);
    setPostResult(null);

    try {
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

    // Add timestamp and initial status to payloads
    const timestamp = new Date().toISOString();
    const payloadsWithStatus = (data.payloads ?? []).map(p => ({
      ...p,
      posted: false,
      status: 'pending',
      timestamp
    }));
    setGeneratedPayloads(payloadsWithStatus);
    setZipFiles(data.zipFiles ?? []);
      setLastXml(data.lastXml ?? "");
      if (data.templates) setTemplates(data.templates);
      setStatus("");

      // Return both xml and the generated data for use in generateAndPost
      return { xml, payloads: payloadsWithStatus, zipFiles: data.zipFiles ?? [] };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return { xml: "", payloads: [], zipFiles: [] };
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateAndPost() {
    try {
      setIsPosting(true);
      const result = await generatePreview();
      if (!result.xml) {
        setIsPosting(false);
        return;
      }

      if (dryRun) {
        setPostResult({ id: "dry-run", endpoint, username, status: "dry-run", message: "Dry run enabled — payload generated but not POSTed.", createdAt: new Date().toISOString(), payloadBytes: String(result.xml.length) });
        setStatus("");
        setIsPosting(false);
        return;
      }

      // Post ALL generated orders, not just the first one
      const ordersToPost = result.zipFiles.length > 0 ? result.zipFiles : [{ name: 'order.xml', contentBase64: Buffer.from(result.xml).toString('base64') }];
      setStatus("");

      let successCount = 0;
      let failCount = 0;
      const results: PostResult[] = [];

      // Create a copy of payloads to update status
      const updatedPayloads = [...result.payloads];

      for (let i = 0; i < ordersToPost.length; i++) {
        const orderXml = Buffer.from(ordersToPost[i].contentBase64, 'base64').toString('utf-8');

        try {
          const data = await orderPost<{ result: PostResult }>(ORDERS_API_BASE, "/post", {
            endpoint,
            username,
            password,
            xml: orderXml,
            gzip: useGzip
          });

          if (data.result) {
            results.push(data.result);
            if (data.result.status === "OK") {
              successCount++;
              // Update payload status
              if (updatedPayloads[i]) {
                updatedPayloads[i].posted = true;
                updatedPayloads[i].status = 'OK';
              }
            } else {
              failCount++;
              if (updatedPayloads[i]) {
                updatedPayloads[i].posted = true;
                updatedPayloads[i].status = 'ERROR';
              }
            }
          }
        } catch (e) {
          failCount++;
          if (updatedPayloads[i]) {
            updatedPayloads[i].posted = true;
            updatedPayloads[i].status = 'ERROR';
          }
          results.push({
            id: `error-${i}`,
            endpoint,
            username,
            status: "error",
            message: e instanceof Error ? e.message : String(e),
            createdAt: new Date().toISOString(),
            payloadBytes: String(orderXml.length)
          });
        }
      }

      // Update the payloads state with post status
      setGeneratedPayloads(updatedPayloads);

      // Set the first result for display
      setPostResult(results[0] ?? null);
      setStatus(`Posted ${ordersToPost.length} orders: ${successCount} succeeded, ${failCount} failed.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setIsPosting(false);
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
          <label style={{ position: "relative" }}>
            <span className="label">OTM Endpoint (must contain &apos;dev&apos; or &apos;test&apos;)</span>
            <div style={{ position: "relative" }}>
              <input className="input" value={endpoint} onChange={(e) => { setEndpoint(e.target.value); if (rememberSession) window.sessionStorage.setItem(KEY_ENDPOINT, e.target.value); }} placeholder="https://&lt;pod&gt;-dev.gc3.oraclecloud.com/GC3/glog.integration.servlet.WMServlet" />
              {isEndpointValid !== null && (
                <span className={`validationIcon ${isEndpointValid ? "valid" : "invalid"}`} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
                  {isEndpointValid ? "✓" : "✕"}
                </span>
              )}
            </div>
            {isEndpointValid === false && <span className="errorText" style={{ fontSize: 12, display: "block", marginTop: 4 }}>⚠️ Endpoint must contain &apos;dev&apos; or &apos;test&apos;</span>}
          </label>
          <label><span className="label">OTM Username</span><input className="input" value={username} onChange={(e) => { setUsername(e.target.value); if (rememberSession) window.sessionStorage.setItem(KEY_USERNAME, e.target.value); }} placeholder="integration_user" /></label>
          <label><span className="label">OTM Password</span><input className="input" type="password" value={password} onChange={(e) => { setPassword(e.target.value); if (rememberSession) window.sessionStorage.setItem(KEY_PASSWORD, e.target.value); }} placeholder="••••••••" /></label>
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>OTM Order Generator</h2>
            <p className="muted" style={{ fontSize: 14 }}>Generate Sales or Purchase Orders for Oracle Transportation Management</p>
          </div>
          {inputMode === "Manual (builder)" && (
            <div className="toolbar">
              <button className="btn" onClick={loadSampleData}>📋 Use Sample Data</button>
              <button className="btn" onClick={resetToDefaults}>🔄 Reset</button>
            </div>
          )}
        </div>
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
            {uploadedFileName && (
              <div className="fileBadge">
                <span>📄 {uploadedFileName}</span>
                <button onClick={clearUploadedFile} title="Clear file">✕</button>
              </div>
            )}
            <div className="formGrid" style={{ marginTop: 16 }}>
              <label><span className="label">DomainName</span><input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} /></label>
              <label><span className="label">Default Currency (used if not present on a line)</span><input className="input" value={defaultCurrency} onChange={(e) => setDefaultCurrency(e.target.value)} /></label>
            </div>
            {orderKind === "Sales Orders" ? <div className="toolbar" style={{ marginTop: 12 }}><label><input type="checkbox" checked={useReleaseSuffixInGid} onChange={(e) => setUseReleaseSuffixInGid(e.target.checked)} /> Add release suffix (_R1) to Release GID (import)</label><label><input type="checkbox" checked={useReleaseSuffixInLineIds} onChange={(e) => setUseReleaseSuffixInLineIds(e.target.checked)} /> Add release suffix (_R1) to SO LINE IDs (import)</label></div> : null}
            <label style={{ display: "block", marginTop: 12 }}><span className="label">Imported content</span><textarea className="textarea" value={importText} onChange={(e) => setImportText(e.target.value)} /></label>
            <div className="toolbar" style={{ marginTop: 16 }}>
              <button className="btn primary" onClick={generatePreview} disabled={isGenerating || isPosting}>
                {isGenerating ? <><span className="spinner"></span> Generating...</> : "Generate from file"}
              </button>
              <button className="btn" onClick={generateAndPost} disabled={isGenerating || isPosting}>
                {isPosting ? <><span className="spinner"></span> Posting...</> : "Generate & POST from file"}
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
          <details className="card" style={{ marginBottom: 16 }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>📄 Header Template</summary><div className="formGrid" style={{ marginTop: 16 }}>
            <label><span className="label">DomainName</span><input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} /></label>
            <label><span className="label">Base XID (SO prefix or PO XID)</span><input className="input" value={baseXid} onChange={(e) => setBaseXid(e.target.value)} /></label>
            <label><span className="label">Currency</span><input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} /></label>
          </div></details>

          <details className="card" style={{ marginBottom: 16 }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>📍 Locations &amp; Items</summary><div style={{ marginTop: 16 }}>
            {orderKind === "Sales Orders" ? <label style={{ display: "block", marginBottom: 12 }}><span className="label">ShipFrom (Your DC) XID</span><input className="input" value={shipFromXid} onChange={(e) => setShipFromXid(e.target.value)} /></label> : <label style={{ display: "block", marginBottom: 12 }}><span className="label">Supplier ShipFrom XIDs (one per line)</span><textarea className="textarea" value={suppliersText} onChange={(e) => setSuppliersText(e.target.value)} /></label>}
            <label style={{ display: "block", marginBottom: 12 }}><span className="label">{orderKind === "Sales Orders" ? "ShipTo (Customers) XIDs" : "ShipTo (Your DC) XID(s) — first value will be used"}</span><textarea className="textarea" value={shipToText} onChange={(e) => setShipToText(e.target.value)} /></label>
            <label style={{ display: "block" }}><span className="label">PackagedItemGid XIDs (comma/newline)</span><textarea className="textarea" value={itemText} onChange={(e) => setItemText(e.target.value)} /></label>
          </div></details>

          <details className="card" style={{ marginBottom: 16 }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>🧩 GID &amp; Line-ID Options</summary><div className="toolbar" style={{ marginTop: 16 }}>
            <label><input type="checkbox" checked={useReleaseSuffixInGid} onChange={(e) => setUseReleaseSuffixInGid(e.target.checked)} /> Add release suffix (_R#) to Release/PO XID</label>
            <label><input type="checkbox" checked={useReleaseSuffixInLineIds} onChange={(e) => setUseReleaseSuffixInLineIds(e.target.checked)} /> Add release suffix (_R#) to SO LINE IDs</label>
          </div></details>

          <details className="card" style={{ marginBottom: 16 }}><summary style={{ fontWeight: 700, cursor: "pointer" }}>🎚️ Generation Controls</summary><div className="formGrid" style={{ marginTop: 16 }}>
            <label><span className="label">How many orders</span><input className="input" type="number" value={releases} onChange={(e) => setReleases(Number(e.target.value || 1))} /></label>
            <label><span className="label">Min lines per order</span><input className="input" type="number" value={minLines} onChange={(e) => setMinLines(Number(e.target.value || 1))} /></label>
            <label><span className="label">Max lines per order</span><input className="input" type="number" value={maxLines} onChange={(e) => setMaxLines(Number(e.target.value || 1))} /></label>
            <label><span className="label">Min quantity</span><input className="input" type="number" value={minQty} onChange={(e) => setMinQty(Number(e.target.value || 1))} /></label>
            <label><span className="label">Max quantity</span><input className="input" type="number" value={maxQty} onChange={(e) => setMaxQty(Number(e.target.value || 1))} /></label>
            <label><span className="label">Min declared value</span><input className="input" type="number" value={minVal} onChange={(e) => setMinVal(Number(e.target.value || 1))} /></label>
            <label><span className="label">Max declared value</span><input className="input" type="number" value={maxVal} onChange={(e) => setMaxVal(Number(e.target.value || 1))} /></label>
            <label><span className="label">Random seed</span><input className="input" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value || 42))} /></label>
          </div><div className="toolbar" style={{ marginTop: 12 }}><label><input type="checkbox" checked={useGzip} onChange={(e) => setUseGzip(e.target.checked)} /> Send gzipped XML (Content-Encoding: gzip)</label></div></details>

          <div style={{
            marginTop: 24,
            marginBottom: 24,
            padding: '20px',
            background: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                style={{
                  padding: '12px 32px',
                  fontSize: 15,
                  fontWeight: 600,
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: isGenerating || isPosting ? 'not-allowed' : 'pointer',
                  opacity: isGenerating || isPosting ? 0.6 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                }}
                onClick={generatePreview}
                disabled={isGenerating || isPosting}
                onMouseOver={(e) => !isGenerating && !isPosting && (e.currentTarget.style.background = '#2563eb')}
                onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
              >
                {isGenerating ? '⏳ Generating...' : '🎯 Generate XMLs'}
              </button>
              <button
                style={{
                  padding: '12px 32px',
                  fontSize: 15,
                  fontWeight: 600,
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: isGenerating || isPosting ? 'not-allowed' : 'pointer',
                  opacity: isGenerating || isPosting ? 0.6 : 1,
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                }}
                onClick={generateAndPost}
                disabled={isGenerating || isPosting}
                onMouseOver={(e) => !isGenerating && !isPosting && (e.currentTarget.style.background = '#059669')}
                onMouseOut={(e) => e.currentTarget.style.background = '#10b981'}
              >
                {isPosting ? '⏳ Posting...' : '🚀 Generate & POST to OTM'}
              </button>
            </div>
            {(releases > 1 && !useReleaseSuffixInGid) && (
              <p style={{
                margin: '12px 0 0 0',
                textAlign: 'center',
                fontSize: 13,
                color: '#f59e0b',
                fontWeight: 500
              }}>
                ⚠️ Multiple orders without suffix may create duplicate IDs. Consider enabling _R#.
              </p>
            )}
          </div>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        {summary && (
          <div style={{
            background: "#667eea",
            borderRadius: 6,
            padding: '8px 16px',
            marginBottom: 12,
            color: "white",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <strong style={{ fontSize: 13 }}>Generation Summary</strong>
              <span style={{ opacity: 0.9 }}>{summary.orderKind}</span>
              <span style={{ opacity: 0.75 }}>•</span>
              <span style={{ opacity: 0.9 }}>{summary.inputMode}</span>
              <span style={{ opacity: 0.75 }}>•</span>
              <span style={{ opacity: 0.9, fontFamily: 'monospace' }}>{summary.domain}</span>
              <span style={{ opacity: 0.75 }}>•</span>
              <span style={{ opacity: 0.9, fontFamily: 'monospace' }}>{summary.baseXid}</span>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.25)',
              padding: '4px 12px',
              borderRadius: 4,
              fontWeight: 700
            }}>
              {summary.lineCount} lines
            </div>
          </div>
        )}
        {generatedPayloads.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
              padding: '6px 12px',
              background: '#f8fafc',
              borderRadius: 6,
              border: '1px solid #e2e8f0'
            }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#334155' }}>
                📋 Generated Orders ({generatedPayloads.length})
              </h3>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {generatedPayloads.filter(p => p.posted).length > 0 &&
                  `${generatedPayloads.filter(p => p.posted).length} posted`
                }
              </div>
            </div>
            <div style={{
              overflowX: 'auto',
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
                tableLayout: 'fixed'
              }}>
                <thead>
                  <tr style={{ background: "#1e293b", borderBottom: '2px solid #334155' }}>
                    <th style={{ color: '#94a3b8', padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', width: '18%' }}>Order XID</th>
                    <th style={{ color: '#94a3b8', padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', width: '12%' }}>Date</th>
                    <th style={{ color: '#94a3b8', padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', width: '10%' }}>Ship To</th>
                    <th style={{ color: '#94a3b8', padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', width: '8%' }}>Lines</th>
                    <th style={{ color: '#94a3b8', padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', width: '8%' }}>Posted</th>
                    <th style={{ color: '#94a3b8', padding: '6px 4px', textAlign: 'center', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', width: '8%' }}>Status</th>
                    <th style={{ color: '#94a3b8', padding: '6px 8px', textAlign: 'left', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', width: '10%' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedPayloads.map((p, idx) => (
                    <tr key={p.humanId} style={{
                      background: idx % 2 === 0 ? "#0f172a" : "#1e293b",
                      borderBottom: '1px solid #1e293b'
                    }}>
                      <td style={{
                        fontWeight: 600,
                        fontFamily: "ui-monospace, monospace",
                        padding: '6px 8px',
                        color: '#f1f5f9',
                        fontSize: '11px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }} title={p.humanId}>{p.humanId}</td>
                      <td style={{
                        padding: '6px 8px',
                        color: '#94a3b8',
                        fontSize: '11px'
                      }}>
                        {p.timestamp ? new Date(p.timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) : '-'}
                      </td>
                      <td style={{
                        padding: '6px 8px',
                        color: '#cbd5e1',
                        fontWeight: 500,
                        fontSize: '11px'
                      }}>{p.shipTo}</td>
                      <td style={{ textAlign: "center", padding: '6px 4px' }}>
                        <span style={{
                          background: "#1e40af",
                          color: "#dbeafe",
                          padding: "2px 6px",
                          borderRadius: 3,
                          fontSize: 10,
                          fontWeight: 700
                        }}>
                          {p.lineCount}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                        {p.posted ? (
                          <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                        {p.status === 'OK' ? (
                          <span style={{ color: '#10b981', fontSize: '14px' }}>✓</span>
                        ) : p.status === 'ERROR' ? (
                          <span style={{ color: '#ef4444', fontSize: '14px' }}>✗</span>
                        ) : (
                          <span style={{ color: '#475569', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{
                        padding: '6px 8px',
                        color: '#94a3b8',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '10px'
                      }}>
                        {p.timestamp ? new Date(p.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {zipFiles.length > 0 && (
          <div style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 16,
            marginBottom: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Download Generated Files</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {zipFiles.length} XML file{zipFiles.length > 1 ? 's' : ''} ready for download
                </div>
              </div>
              <div className="toolbar">
                <button className="btn primary" onClick={() => zipFiles.forEach((f) => downloadBase64File(f.name, f.contentBase64))}>
                  📦 Download all XMLs ({zipFiles.length})
                </button>
                {lastXml && (
                  <button className="btn" onClick={() => downloadBase64File('last_order.xml', btoa(unescape(encodeURIComponent(lastXml))))}>
                    📄 Download last XML
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {postResult ? (
          <div className="detailPane" style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 700 }}>POST Result</h3>
            <div className="kvGrid">
              <div><span className="muted">Status</span><div style={{ marginTop: 6 }}><StatusBadge status={postResult.status} /></div></div>
              <div><span className="muted">Endpoint</span><div style={{ marginTop: 6, fontSize: 13 }}>{postResult.endpoint || "-"}</div></div>
              <div><span className="muted">Payload Size</span><div style={{ marginTop: 6 }}>{postResult.payloadBytes || "-"} bytes</div></div>
              <div><span className="muted">Timestamp</span><div style={{ marginTop: 6, fontSize: 13 }}>{new Date(postResult.createdAt).toLocaleString()}</div></div>
            </div>
            {postResult.message && (
              <details style={{ marginTop: 16 }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: 8 }}>Response Details</summary>
                <pre style={{ background: "#f3f4f6", padding: 12, borderRadius: 8, fontSize: 12, overflow: "auto" }}>{postResult.message}</pre>
              </details>
            )}
          </div>
        ) : null}
        {status && (
          <p style={{
            fontSize: 12,
            color: '#ef4444',
            background: '#fef2f2',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #fecaca',
            marginBottom: 12
          }}>{status}</p>
        )}
      </div>
    </Shell>
  );
}
