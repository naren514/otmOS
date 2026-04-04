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
  const [x12, setX12] = useState("ISA*00*          *00*          *ZZ*SENDERID       *ZZ*RECEIVERID     *250101*1200*U*00401*000000905*0*T*:~\nGS*SM*SENDER*RECEIVER*20250101*1200*1*X*004010~\nST*204*0001~\nB2**CARRIER*SCAC~\nSE*4*0001~");
  const [rows, setRows] = useState<EdiExplainRow[]>([]);
  const [kbQuery, setKbQuery] = useState("");
  const [kbMappings, setKbMappings] = useState<EdiMapping[]>([]);
  const [kbDocs, setKbDocs] = useState<EdiDoc[]>([]);
  const [docName, setDocName] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [docText, setDocText] = useState("");
  const [saveSegment, setSaveSegment] = useState("B2");
  const [savePos, setSavePos] = useState(3);
  const [saveCode, setSaveCode] = useState("SCAC");
  const [saveMeaning, setSaveMeaning] = useState("");
  const [status, setStatus] = useState("");

  const explain = useCallback(async () => {
    setStatus("Explaining...");
    const data = await ediPost<{ rows: EdiExplainRow[] }>(EDI_API_BASE, "/explain", { version, txSet, carrier, elementSep, segmentTerm, x12 });
    setRows(data.rows ?? []);
    setStatus("Explanation updated.");
  }, [version, txSet, carrier, elementSep, segmentTerm, x12]);

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
      await ediPost(EDI_API_BASE, "/docs", { version, txSet, carrier, sourceName: docName, notes: docNotes, rawText: docText });
      setStatus("Document ingested.");
      setDocName("");
      setDocNotes("");
      setDocText("");
      await loadKnowledge();
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

  return (
    <Shell title="EDI Explainer">
      <section className="card">
        <SectionIntro title="Explain EDI Message" description="Paste an X12 message and inspect a parsed, mapping-backed row-level view." actions={<button className="btn primary" onClick={explain}>Explain</button>} />
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
          <table className="table">
            <thead><tr><th>Seg #</th><th>Segment</th><th>Pos</th><th>Value</th><th>Meaning</th><th>Source</th></tr></thead>
            <tbody>{rows.map((row, idx) => <tr key={`${row.segIndex}-${row.segment}-${row.pos}-${idx}`}><td>{row.segIndex}</td><td>{row.segment}</td><td>{row.pos}</td><td className="mono">{row.value}</td><td>{row.meaning || <span className="muted">—</span>}</td><td>{row.source || <span className="muted">—</span>}</td></tr>)}</tbody>
          </table>
        </div>
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
          <label style={{ display: "block", marginTop: 16 }}><span className="label">Document text</span><textarea className="textarea" value={docText} onChange={(e) => setDocText(e.target.value)} /></label>
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
