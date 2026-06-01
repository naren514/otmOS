"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import SectionIntro from "@/components/SectionIntro";
import { ediGet, ediPost, type EdiDoc, type EdiExplainRow, type EdiMapping } from "@/lib/ediApi";
import { getDefaultEdiApiBase } from "@/lib/runtimeConfig";

const EDI_API_BASE = getDefaultEdiApiBase();

export default function EDIPage() {
  const [version, setVersion] = useState("4010");
  const [txSet, setTxSet] = useState("204");
  const [carrier, setCarrier] = useState("industry");
  const [elementSep, setElementSep] = useState("*");
  const [segmentTerm, setSegmentTerm] = useState("~");

  const defaultSamples: Record<string, string> = {
    "204": "ISA*00*          *00*          *ZZ*PATINDPROD     *02*TQYL           *260512*2051*U*00401*000000533*0*P*>~\nGS*SM*PATINDPROD*TQYL*20260512*2051*441*X*004010~\nST*204*0001~\nB2**TQYL**366120**PP~\nB2A*00~\nL11*1013955*TN~\nG62*64*20260513*I*2051*UT~\nN1*BT*990_107WIN~\nN2*TRANSPORTATION DEPARTMENT~\nN3*107 W. Franklin St.~\nN4*ELKHART*IN*46516~\nG61*IC*TRANSPORTATION DEPARTMENT*TE*5742947511~\nS5*1*CL~\nG62*10*20260512*I*1651*UT~\nAT8*E*L*18306*20**E*1124496~\nN1*SH*170_291941~\nN2*John Gamble~\nN3*29194 Phillips St~\nN4*ELKHART*IN*46514~\nG61*SH*John Gamble*TE*5742624664~\nS5*2*CU~\nG62*68*20260513*Z*1551*UT~\nAT8*E*L*18306*20**E*1124496~\nN1*CN*SCHUL201I1~\nN2*Amy Mude~\nN3*201 Industrial Dr~\nN4*REDWOOD FALLS*MN*56283~\nG61*IC*Amy Mude*TE*5076443555~\nOID*500076***PC*4*L*6252*E*331776~\nL5*076*4 X 8 SKIDS OF PLYWOOD*60.0*N~\nOID*500077***PC*3*L*300*E*25920~\nL5*077*BOXES OF MOLDINGS*70.0*N~\nOID*500078***PC*3*L*1824*E*334800~\nL5*078*CABINET DOORS*92.5*N*PLT~\nOID*500079***PC*10*L*9930*E*432000~\nL5*079*COFFINS OF MOLDINGS*55.0*N~\nL3*18306*N*******1124496*E*20*L~\nSE*36*0001~\nGE*1*441~\nIEA*1*000000533~",
    "214": "ISA*00*          *00*          *02*RLCA           *ZZ*PATINDPROD     *260512*1902*U*00401*000006045*0*P*>\nGS*QM*RLCA*PATINDPROD*20260512*1902*6045*X*004010\nST*214*0001\nB10*IAG4395357*366102*RLCA*1\nL11*IAG4395357*CN\nL11*1013953*TN\nN1*SH*CUSTOM VINLYS*94*160\nN3*8399 W VANBUREN\nN4*TOLLESON*AZ*85353*USA\nG62*86*20260512*E*153534\nN1*CN*CUSTOM VINLYS*94*161\nN3*13414 SLOVER AVE\nN4*FONTANA*CA*92337*USA\nG62*17*20260513*E*110000\nN1*BT*PATRICK INDUSTRIES*93*PA4651\nN3*107 W FRANKLIN ST\nN4*ELKHART*IN*46516*USA\nLX*1\nAT7*CP*NS***20260512*153534*LT\nMS1*TOLLESON*AZ\nL11*01*QN\nSE*23*0001\nGE*1*6045\nIEA*1*000006045"
  };

  const [x12, setX12] = useState(defaultSamples["204"]);
  const [rows, setRows] = useState<EdiExplainRow[]>([]);
  const [kbQuery, setKbQuery] = useState("");
  const [kbMappings, setKbMappings] = useState<EdiMapping[]>([]);
  const [kbDocs, setKbDocs] = useState<EdiDoc[]>([]);
  const [docName, setDocName] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docText, setDocText] = useState("");
  const [detectedTxSets, setDetectedTxSets] = useState<string[]>([]);
  const [relevantDocs, setRelevantDocs] = useState<EdiDoc[]>([]);
  const [saveSegment, setSaveSegment] = useState("B2");
  const [savePos, setSavePos] = useState(3);
  const [saveCode, setSaveCode] = useState("SCAC");
  const [saveMeaning, setSaveMeaning] = useState("");
  const [status, setStatus] = useState("");

  const exportAsCSV = () => {
    if (rows.length === 0) {
      setStatus("No explanation to export.");
      return;
    }

    const headers = ["Loop/Context", "Segment", "Element", "Segment Element Name", "Value", "Element Description"];
    const csvRows = [headers.join(",")];

    rows.forEach(row => {
      const csvRow = [
        `"${(row as any).loop || "Detail"}"`,
        `"${row.segment}"`,
        `"${String(row.pos).padStart(2, "0")}"`,
        `"${((row as any).elementName || `Element ${row.pos}`).replace(/"/g, '""')}"`,
        `"${(row.value || "—").replace(/"/g, '""')}"`,
        `"${((row as any).elementDescription || row.meaning || "No description information found").replace(/"/g, '""')}"`
      ];
      csvRows.push(csvRow.join(","));
    });

    const csvContent = csvRows.join("\n");
    downloadFile(csvContent, `edi-explanation-${txSet}-${Date.now()}.csv`, "text/csv");
    setStatus("Exported as CSV.");
  };

  const exportAsJSON = () => {
    if (rows.length === 0) {
      setStatus("No explanation to export.");
      return;
    }

    const exportData = {
      metadata: {
        version,
        txSet,
        carrier,
        elementSeparator: elementSep,
        segmentTerminator: segmentTerm,
        exportedAt: new Date().toISOString()
      },
      rows: rows.map(row => ({
        loopContext: (row as any).loop || "Detail",
        segment: row.segment,
        element: row.pos,
        segmentElementName: (row as any).elementName || `Element ${row.pos}`,
        value: row.value || "",
        elementDescription: (row as any).elementDescription || row.meaning || "No description information found"
      }))
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    downloadFile(jsonContent, `edi-explanation-${txSet}-${Date.now()}.json`, "application/json");
    setStatus("Exported as JSON.");
  };

  const exportAsText = () => {
    if (rows.length === 0) {
      setStatus("No explanation to export.");
      return;
    }

    let textContent = `EDI Explanation Report\n`;
    textContent += `${"=".repeat(80)}\n\n`;
    textContent += `Version: ${version}\n`;
    textContent += `Transaction Set: ${txSet}\n`;
    textContent += `Carrier/Scope: ${carrier}\n`;
    textContent += `Element Separator: ${elementSep}\n`;
    textContent += `Segment Terminator: ${segmentTerm}\n`;
    textContent += `Generated: ${new Date().toISOString()}\n`;
    textContent += `\n${"=".repeat(80)}\n\n`;

    let currentLoop = "";
    rows.forEach((row, idx) => {
      const loop = (row as any).loop || "Detail";
      if (loop !== currentLoop) {
        if (idx > 0) textContent += "\n";
        textContent += `\n[${loop}]\n${"-".repeat(80)}\n`;
        currentLoop = loop;
      }

      textContent += `\nSegment: ${row.segment} | Element: ${String(row.pos).padStart(2, "0")}\n`;
      textContent += `Field: ${(row as any).elementName || `Element ${row.pos}`}\n`;
      textContent += `Value: ${row.value || "—"}\n`;
      const desc = (row as any).elementDescription || row.meaning || "No description information found";
      textContent += `Description: ${desc}\n`;
    });

    downloadFile(textContent, `edi-explanation-${txSet}-${Date.now()}.txt`, "text/plain");
    setStatus("Exported as formatted text.");
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const explain = useCallback(async () => {
    setStatus("Explaining...");
    const data = await ediPost<{ rows: EdiExplainRow[] }>(EDI_API_BASE, "/explain", { version, txSet, carrier, elementSep, segmentTerm, x12 });
    setRows(data.rows ?? []);
    setStatus("Explanation updated.");
    // Load relevant docs for this transaction type
    await loadRelevantDocs();
  }, [version, txSet, carrier, elementSep, segmentTerm, x12]);

  const loadRelevantDocs = useCallback(async () => {
    const path = `/search?txSet=${encodeURIComponent(txSet)}&carrier=${encodeURIComponent(carrier)}&version=${encodeURIComponent(version)}`;
    const data = await ediGet<{ docs: EdiDoc[] }>(EDI_API_BASE, path);
    setRelevantDocs(data.docs ?? []);
  }, [txSet, carrier, version]);

  const loadKnowledge = useCallback(async (query = kbQuery) => {
    const path = query ? `/search?q=${encodeURIComponent(query)}` : `/search?q=`;
    const data = await ediGet<{ mappings: EdiMapping[]; docs: EdiDoc[] }>(EDI_API_BASE, path);
    setKbMappings(data.mappings ?? []);
    setKbDocs(data.docs ?? []);
  }, [kbQuery]);

  async function saveMapping() {
    try {
      await ediPost(EDI_API_BASE, "/mappings", { version, txSet, carrier, segment: saveSegment, elementPos: savePos, code: saveCode, meaning: saveMeaning, notes: "", source: "user" });
      setStatus("Mapping saved.");
      await explain();
      await loadKnowledge();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function ingestDoc() {
    try {
      const result = await ediPost<{ doc: EdiDoc; detectedTxSets: string[] }>(EDI_API_BASE, "/docs", { version, txSet, carrier, sourceName: docName, notes: docNotes, rawText: docText });
      setDetectedTxSets(result.detectedTxSets ?? []);
      setStatus(`Document ingested. Detected transaction types: ${result.detectedTxSets?.join(", ") || "none"}`);
      setDocName("");
      setDocNotes("");
      setDocText("");
      await loadKnowledge();
      await loadRelevantDocs();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function uploadFile(file: File) {
    try {
      setStatus(`Uploading ${file.name}...`);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('version', version);
      formData.append('txSet', txSet);
      formData.append('carrier', carrier);
      formData.append('notes', docNotes);

      const response = await fetch(`${EDI_API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      setDetectedTxSets(result.detectedTxSets ?? []);
      setStatus(`${result.message}. Detected: ${result.detectedTxSets?.join(", ") || "none"}`);
      setDocName("");
      setDocNotes("");
      setDocText("");
      await loadKnowledge();
      await loadRelevantDocs();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void explain();
      void loadKnowledge();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [explain, loadKnowledge]);

  // Update sample when transaction type changes
  useEffect(() => {
    if (defaultSamples[txSet] && x12 !== defaultSamples[txSet]) {
      const currentIsSample = Object.values(defaultSamples).some(sample => sample === x12);
      if (currentIsSample) {
        setX12(defaultSamples[txSet]);
      }
    }
  }, [txSet]);

  return (
    <Shell title="EDI Explainer">
      <section className="card">
        <SectionIntro
          title="Explain EDI Message"
          description="Paste an X12 message and inspect a parsed, mapping-backed row-level view."
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" onClick={explain}>Explain</button>
              {rows.length > 0 && (
                <>
                  <button className="btn" onClick={exportAsCSV} title="Export as CSV">Export CSV</button>
                  <button className="btn" onClick={exportAsJSON} title="Export as JSON">Export JSON</button>
                  <button className="btn" onClick={exportAsText} title="Export as formatted text">Export TXT</button>
                </>
              )}
            </div>
          }
        />
        <div className="formGrid">
          <label><span className="label">Version</span><select className="input" value={version} onChange={(e) => setVersion(e.target.value)}><option value="4010">4010</option><option value="5010">5010</option></select></label>
          <label><span className="label">Tx Set</span><select className="input" value={txSet} onChange={(e) => setTxSet(e.target.value)}>{["300", "204", "301", "990", "210", "310", "214", "315"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
          <label><span className="label">Carrier / Scope</span><input className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)} /></label>
          <label><span className="label">Element Separator</span><input className="input" value={elementSep} onChange={(e) => setElementSep(e.target.value)} /></label>
          <label><span className="label">Segment Terminator</span><input className="input" value={segmentTerm} onChange={(e) => setSegmentTerm(e.target.value)} /></label>
        </div>
        <label style={{ display: "block", marginTop: 16 }}><span className="label">Paste X12</span><textarea className="textarea" value={x12} onChange={(e) => setX12(e.target.value)} /></label>
        <p className="muted mono" style={{ marginTop: 12 }}>{status}</p>
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table className="table" style={{ fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#2563eb", color: "white" }}>
                <th style={{ minWidth: 180 }}>Loop/Context</th>
                <th style={{ minWidth: 80 }}>Segment</th>
                <th style={{ minWidth: 60 }}>Element</th>
                <th style={{ minWidth: 220 }}>Segment Element Name</th>
                <th style={{ minWidth: 150 }}>Value</th>
                <th style={{ minWidth: 300 }}>Element Description</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${row.segIndex}-${row.segment}-${row.pos}-${idx}`} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td className="muted" style={{ fontSize: 12 }}>{(row as any).loop || "Detail"}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{row.segment}</td>
                  <td className="mono">{String(row.pos).padStart(2, "0")}</td>
                  <td style={{ fontSize: 12 }}>{(row as any).elementName || `Element ${row.pos}`}</td>
                  <td className="mono" style={{ fontWeight: 500 }}>{row.value || <span className="muted">—</span>}</td>
                  <td style={{ fontSize: 12 }}>{(row as any).elementDescription || row.meaning || <span className="muted">No description information found</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {relevantDocs.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12 }}>Relevant Documentation for {txSet}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {relevantDocs.map((doc) => (
                <div key={doc.id} className="detailPane" style={{ minHeight: "auto" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{doc.sourceName}</div>
                      <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                        {doc.carrier && <span style={{ marginRight: 12 }}>Carrier: {doc.carrier}</span>}
                        {doc.txSets && Array.isArray(doc.txSets) && doc.txSets.length > 0 && (
                          <span style={{ marginRight: 12 }}>
                            Transaction Types: {doc.txSets.map(t => (
                              <span key={t} style={{
                                padding: "2px 6px",
                                marginLeft: 4,
                                borderRadius: 4,
                                background: t === txSet ? "#2563eb" : "#6b7280",
                                color: "white",
                                fontSize: 11
                              }}>{t}</span>
                            ))}
                          </span>
                        )}
                        {doc.charCount && <span>{doc.charCount.toLocaleString()} chars</span>}
                      </div>
                      {doc.snippetPreview && (
                        <div className="muted mono" style={{ marginTop: 8, fontSize: 12 }}>{doc.snippetPreview}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid2" style={{ marginTop: 16 }}>
        <section className="card">
          <SectionIntro title="Save Mapping" description="Teach the explainer deterministic code meanings." actions={<button className="btn" onClick={saveMapping}>Save mapping</button>} />
          <div className="formGrid">
            <label><span className="label">Segment</span><input className="input" value={saveSegment} onChange={(e) => setSaveSegment(e.target.value)} /></label>
            <label><span className="label">Element Pos</span><input className="input" type="number" value={savePos} onChange={(e) => setSavePos(Number(e.target.value || 1))} /></label>
            <label><span className="label">Code</span><input className="input" value={saveCode} onChange={(e) => setSaveCode(e.target.value)} /></label>
            <label><span className="label">Meaning</span><input className="input" value={saveMeaning} onChange={(e) => setSaveMeaning(e.target.value)} /></label>
          </div>
        </section>

        <section className="card">
          <SectionIntro title="Document Ingestion" description="Load implementation guides and carrier notes into the local test knowledge base." actions={<button className="btn" onClick={ingestDoc}>Ingest document</button>} />
          <div className="formGrid">
            <label><span className="label">Source name</span><input className="input" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Carrier 204 Guide" /></label>
            <label><span className="label">Notes</span><input className="input" value={docNotes} onChange={(e) => setDocNotes(e.target.value)} placeholder="Optional notes" /></label>
          </div>
          <label style={{ display: "block", marginTop: 16 }}>
            <span className="label">Upload file (.pdf, .docx, .doc, .edi, .txt)</span>
            <input
              type="file"
              className="input"
              accept=".txt,.edi,.x12,.pdf,.doc,.docx"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setDocName(file.name);
                  const ext = file.name.toLowerCase().split('.').pop();

                  // For PDF and Word files, use upload API
                  if (ext === 'pdf' || ext === 'doc' || ext === 'docx') {
                    await uploadFile(file);
                  } else {
                    // For text/EDI files, read directly
                    const text = await file.text();
                    setDocText(text);
                    setStatus(`File loaded: ${file.name} (${file.size.toLocaleString()} bytes)`);
                  }
                }
              }}
            />
          </label>
          <label style={{ display: "block", marginTop: 16 }}><span className="label">Document text</span><textarea className="textarea" value={docText} onChange={(e) => setDocText(e.target.value)} placeholder="Paste document content or upload a file above" /></label>
          {detectedTxSets.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span className="label">Detected Transaction Types:</span>
              <div style={{ marginTop: 6 }}>
                {detectedTxSets.map(t => (
                  <span key={t} style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    marginRight: 8,
                    borderRadius: 6,
                    background: "#2563eb",
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600
                  }}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <SectionIntro title="Knowledge Base" description="Search saved mappings and ingested documents." actions={<button className="btn" onClick={() => loadKnowledge()}>Search</button>} />
        <input className="input" value={kbQuery} onChange={(e) => setKbQuery(e.target.value)} placeholder="Search mappings + docs" />
        <div className="grid2" style={{ marginTop: 16 }}>
          <div>
            <h3 style={{ marginBottom: 10 }}>Mappings</h3>
            <div style={{ overflowX: "auto" }}>
              <table className="table"><thead><tr><th>Segment</th><th>Pos</th><th>Code</th><th>Meaning</th></tr></thead><tbody>{kbMappings.map((m) => <tr key={m.id}><td>{m.segment}</td><td>{m.elementPos}</td><td className="mono">{m.code}</td><td>{m.meaning}</td></tr>)}</tbody></table>
            </div>
          </div>
          <div>
            <h3 style={{ marginBottom: 10 }}>Documents</h3>
            <div style={{ overflowX: "auto" }}>
              <table className="table"><thead><tr><th>Source</th><th>Status</th><th>Chars</th><th>Preview</th></tr></thead><tbody>{kbDocs.map((d) => <tr key={d.id}><td>{d.sourceName}</td><td>{d.status}</td><td>{d.charCount}</td><td className="muted">{d.snippetPreview}</td></tr>)}</tbody></table>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
