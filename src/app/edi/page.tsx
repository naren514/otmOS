"use client";

import { useMemo, useState } from "react";
import Shell from "@/components/Shell";
import RunnerSettings from "@/components/RunnerSettings";
import SectionIntro from "@/components/SectionIntro";

function parseX12(x12: string, elementSep: string, segmentTerm: string) {
  const raw = x12.trim();
  if (!raw) return [] as Array<{ segment: string; pos: number; value: string; segIndex: number }>;
  const segs = raw.split(segmentTerm).map((s) => s.trim()).filter(Boolean);
  const rows: Array<{ segment: string; pos: number; value: string; segIndex: number }> = [];
  segs.forEach((seg, idx) => {
    const parts = seg.split(elementSep);
    const tag = parts[0]?.trim() ?? "";
    parts.slice(1).forEach((value, i) => {
      rows.push({ segment: tag, pos: i + 1, value, segIndex: idx + 1 });
    });
  });
  return rows;
}

export default function EDIPage() {
  const [version, setVersion] = useState("4010");
  const [txSet, setTxSet] = useState("204");
  const [carrier, setCarrier] = useState("industry");
  const [elementSep, setElementSep] = useState("*");
  const [segmentTerm, setSegmentTerm] = useState("~");
  const [x12, setX12] = useState("ISA*00*          *00*          *ZZ*SENDERID       *ZZ*RECEIVERID     *250101*1200*U*00401*000000905*0*T*:~\nGS*SM*SENDER*RECEIVER*20250101*1200*1*X*004010~\nST*204*0001~\nB2**CARRIER*SCAC~\nSE*4*0001~");
  const [kbQuery, setKbQuery] = useState("");
  const [docName, setDocName] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const rows = useMemo(() => parseX12(x12, elementSep, segmentTerm), [x12, elementSep, segmentTerm]);

  return (
    <Shell title="EDI Explainer">
      <RunnerSettings />

      <section className="card" style={{ marginTop: 16 }}>
        <SectionIntro title="Explain EDI Message" description="Paste an X12 message and inspect a parsed row-level view. API-backed enrichment can be wired next." />
        <div className="formGrid">
          <label>
            <span className="label">Version</span>
            <select className="input" value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="4010">4010</option>
              <option value="5010">5010</option>
            </select>
          </label>
          <label>
            <span className="label">Tx Set</span>
            <select className="input" value={txSet} onChange={(e) => setTxSet(e.target.value)}>
              {["300", "204", "301", "990", "210", "310", "214", "315"].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Carrier / Scope</span>
            <input className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          </label>
          <label>
            <span className="label">Element Separator</span>
            <input className="input" value={elementSep} onChange={(e) => setElementSep(e.target.value)} />
          </label>
          <label>
            <span className="label">Segment Terminator</span>
            <input className="input" value={segmentTerm} onChange={(e) => setSegmentTerm(e.target.value)} />
          </label>
        </div>
        <label style={{ display: "block", marginTop: 16 }}>
          <span className="label">Paste X12</span>
          <textarea className="textarea" value={x12} onChange={(e) => setX12(e.target.value)} />
        </label>
        <div style={{ overflowX: "auto", marginTop: 16 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Seg #</th>
                <th>Segment</th>
                <th>Pos</th>
                <th>Value</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={`${row.segIndex}-${row.segment}-${row.pos}-${idx}`}>
                  <td>{row.segIndex}</td>
                  <td>{row.segment}</td>
                  <td>{row.pos}</td>
                  <td className="mono">{row.value}</td>
                  <td className="muted">API-backed explanation placeholder</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid2" style={{ marginTop: 16 }}>
        <section className="card">
          <SectionIntro title="Document Ingestion" description="Prepare carrier guides and IG docs for knowledge-backed explanation." />
          <div className="formGrid">
            <label>
              <span className="label">Source name</span>
              <input className="input" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Carrier 204 Guide" />
            </label>
            <label>
              <span className="label">Notes</span>
              <input className="input" value={docNotes} onChange={(e) => setDocNotes(e.target.value)} placeholder="Optional notes" />
            </label>
          </div>
          <div className="dropzone" style={{ marginTop: 16 }}>
            Upload UI placeholder — wire to remote EDI docs API next.
          </div>
        </section>

        <section className="card">
          <SectionIntro title="Knowledge Base" description="Search mappings and ingested docs." />
          <input className="input" value={kbQuery} onChange={(e) => setKbQuery(e.target.value)} placeholder="Search mappings + docs" />
          <div className="emptyState" style={{ marginTop: 16 }}>
            Query: <span className="mono">{kbQuery || "(none)"}</span><br />
            Search results panel placeholder — remote API hookup next.
          </div>
        </section>
      </div>
    </Shell>
  );
}
