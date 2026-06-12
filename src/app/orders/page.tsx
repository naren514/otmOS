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
      setStatus(`Loaded ${file.name}`);
      return;
    }
    setUploadedFileName(file.name);
    setStatus(`Loaded ${file.name}, but CSV/text parsing is currently enabled in-browser. Paste content manually for now.`);
  }

  function clearUploadedFile() {
    setImportText("");
    setUploadedFileName("");
    setStatus("Cleared uploaded file.");
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
    setStatus("Generating preview...");
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
      setStatus("Preview ready.");
      return xml;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
      return "";
    } finally {
      setIsGenerating(false);
    }
  }

  async function generateAndPost() {
    try {
      setIsPosting(true);
      const xml = await generatePreview();
      if (!xml) {
        setIsPosting(false);
        return;
      }
      if (dryRun) {
        setPostResult({ id: "dry-run", endpoint, username, status: "dry-run", message: "Dry run enabled — payload generated but not POSTed.", createdAt: new Date().toISOString(), payloadBytes: String(xml.length) });
        setStatus("Dry run complete.");
        setIsPosting(false);
        return;
      }

      // Post ALL generated orders, not just the first one
      const ordersToPost = zipFiles.length > 0 ? zipFiles : [{ name: 'order.xml', contentBase64: Buffer.from(xml).toString('base64') }];
      setStatus(`Posting ${ordersToPost.length} order(s) to OTM...`);

      let successCount = 0;
      let failCount = 0;
      const results: PostResult[] = [];

      // Create a copy of payloads to update status
      const updatedPayloads = [...generatedPayloads];

      for (let i = 0; i < ordersToPost.length; i++) {
        const orderXml = Buffer.from(ordersToPost[i].contentBase64, 'base64').toString('utf-8');
        setStatus(`Posting order ${i + 1} of ${ordersToPost.length} to OTM...`);

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
              <button className="btn primary" onClick={generatePreview} disabled={isGenerating || isPosting}>
                {isGenerating ? <><span className="spinner"></span> Generating...</> : "Generate XMLs"}
              </button>
              <button className="btn" onClick={generateAndPost} disabled={isGenerating || isPosting}>
                {isPosting ? <><span className="spinner"></span> Posting...</> : "Generate & POST to OTM"}
              </button>
            </div>
            {(releases > 1 && !useReleaseSuffixInGid) ? <p className="muted" style={{ marginTop: 12 }}>⚠️ Multiple orders without suffix may create duplicate IDs. Consider enabling _R#.</p> : null}
            <div className="detailPane" style={{ marginTop: 16 }}><div className="kvGrid"><div><span className="muted">ShipTo count</span><div>{shipToList.length}</div></div><div><span className="muted">Item count</span><div>{itemList.length}</div></div><div><span className="muted">Supplier count</span><div>{orderKind === "Purchase Orders" ? supplierList.length : "n/a"}</div></div><div><span className="muted">Posted?</span><div>{dryRun ? "No (dry run)" : "Yes"}</div></div></div></div>
          </section>
        </>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <SectionIntro title="Preview &amp; results" description="Generated XML preview and result summary." />
        {summary && (
          <div style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
            color: "white"
          }}>
            <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700, color: "white" }}>
              Generation Summary
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Order Kind</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{summary.orderKind}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Mode</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{summary.inputMode}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Domain</div>
                <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "monospace" }}>{summary.domain}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Base XID</div>
                <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "monospace" }}>{summary.baseXid}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>Total Lines</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.lineCount}</div>
              </div>
            </div>
          </div>
        )}
        {generatedPayloads.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ marginBottom: 12, fontSize: 16, fontWeight: 700 }}>
              Generated Orders ({generatedPayloads.length})
            </h3>
            <div style={{ overflowX: 'auto', background: '#1e293b', padding: 16, borderRadius: 8 }}>
              <table className="table" style={{ width: '100%', color: '#e2e8f0' }}>
                <thead>
                  <tr style={{ background: "#334155", borderBottom: '2px solid #475569' }}>
                    <th style={{ color: '#f1f5f9', padding: '12px 8px' }}>Order Xid</th>
                    <th style={{ color: '#f1f5f9', padding: '12px 8px' }}>Order ID</th>
                    <th style={{ color: '#f1f5f9', padding: '12px 8px' }}>Ellig Date</th>
                    <th style={{ color: '#f1f5f9', padding: '12px 8px' }}>Ship To</th>
                    <th style={{ color: '#f1f5f9', padding: '12px 8px', textAlign: 'right' }}># Lines</th>
                    <th style={{ color: '#f1f5f9', padding: '12px 8px', textAlign: 'center' }}>Posted?</th>
                    <th style={{ color: '#f1f5f9', padding: '12px 8px', textAlign: 'center' }}>Status</th>
                    <th style={{ color: '#f1f5f9', padding: '12px 8px' }}>Job1 Date</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedPayloads.map((p, idx) => (
                    <tr key={p.humanId} style={{ background: idx % 2 === 0 ? "#1e293b" : "#0f172a", borderBottom: '1px solid #334155' }}>
                      <td style={{ fontWeight: 600, fontFamily: "monospace", padding: '10px 8px', fontSize: '13px' }}>{p.humanId}</td>
                      <td style={{ fontFamily: "monospace", padding: '10px 8px', fontSize: '13px', color: '#94a3b8' }}>{p.humanId}</td>
                      <td style={{ padding: '10px 8px', fontSize: '13px', color: '#94a3b8' }}>
                        {p.timestamp ? new Date(p.timestamp).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: '13px', color: '#94a3b8' }}>{p.shipTo}</td>
                      <td style={{ textAlign: "right", padding: '10px 8px' }}>
                        <span style={{
                          background: "#1e40af",
                          color: "#bfdbfe",
                          padding: "4px 10px",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600
                        }}>
                          {p.lineCount}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                        {p.posted ? (
                          <span style={{ color: '#22c55e', fontSize: '18px' }}>✓</span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '14px' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '10px 8px' }}>
                        {p.status === 'OK' ? (
                          <span style={{ color: '#22c55e', fontSize: '18px' }}>✓</span>
                        ) : p.status === 'ERROR' ? (
                          <span style={{ color: '#ef4444', fontSize: '18px' }}>✗</span>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '14px' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {p.timestamp || new Date().toLocaleString()}
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
        <p className="muted mono" style={{ marginBottom: 12 }}>{status}</p>

        <div style={{ position: "relative" }}>
          {preview !== "<xml>Preview will appear here after generation.</xml>" && (
            <button className="copyBtn" onClick={copyXmlToClipboard}>📋 Copy</button>
          )}
          <div style={{
            background: "#0f1720",
            borderRadius: 10,
            padding: 16,
            position: "relative",
            border: "1px solid #1f2937",
            maxHeight: 600,
            overflowY: "auto"
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: "1px solid #374151"
            }}>
              <span style={{
                background: "#374151",
                padding: "4px 10px",
                borderRadius: 6,
                fontSize: 12,
                color: "#9ca3af",
                fontWeight: 600
              }}>XML</span>
              <span style={{ color: "#6b7280", fontSize: 12 }}>
                {preview.split('\n').length} lines • {preview.length} characters
              </span>
            </div>
            <pre
              style={{
                margin: 0,
                color: "#dbe5f0",
                fontFamily: "monospace",
                fontSize: 13,
                lineHeight: 1.6,
                whiteSpace: "pre",
                overflow: "visible"
              }}
              dangerouslySetInnerHTML={{ __html: highlightXml(formatXml(preview)) }}
            />
          </div>
        </div>
      </section>
    </Shell>
  );
}
