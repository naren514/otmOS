"use client";

import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";

type SchemaResponse = {
  schemas: string[];
  samples?: string[];
  presetSchemas?: string[];
  defaultSchema?: string;
  error?: string;
};

type ValidationError = {
  line?: number;
  column?: number;
  message: string;
};

type ValidationResponse = {
  ok: boolean;
  schema?: string;
  autoDetectedSchema?: string | null;
  root?: { prefix: string | null; localName: string } | null;
  namespaces?: { prefix: string | null; uri: string }[];
  insights?: string[];
  businessIssues?: { severity: "warning" | "error"; line?: number; message: string }[];
  errors?: ValidationError[];
  raw?: string;
  error?: string;
  schemas?: string[];
};

type RepairSuggestion = {
  title: string;
  confidence: "high" | "medium" | "low";
  kind: "safe" | "guided";
  description: string;
};

type RepairResponse = {
  ok: boolean;
  suggestions?: RepairSuggestion[];
  repairedXml?: string;
  changed?: boolean;
  note?: string;
  error?: string;
};

const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<otm:Transmission xmlns:otm="http://xmlns.oracle.com/apps/otm/transmission/v6.4" xmlns:gtm="http://xmlns.oracle.com/apps/gtm/transmission/v6.4">
  <otm:TransmissionHeader>
    <otm:SenderTransmissionNo>SHIPMENT STATUS - 000311130</otm:SenderTransmissionNo>
    <otm:GLogXMLElementName>SHIPMENTSTATUS</otm:GLogXMLElementName>
  </otm:TransmissionHeader>
  <otm:TransmissionBody>
    <otm:GLogXMLElement>
      <otm:ShipmentStatus>
        <otm:StatusLevel>SHIPMENT</otm:StatusLevel>
      </otm:ShipmentStatus>
    </otm:GLogXMLElement>
  </otm:TransmissionBody>
</otm:Transmission>`;

function formatXml(xml: string) {
  const trimmed = xml.trim();
  if (!trimmed) return xml;

  const withBreaks = trimmed.replace(/>(\s*)</g, ">\n<");
  const lines = withBreaks.split("\n");
  let indent = 0;

  return lines
    .map((line) => {
      const current = line.trim();
      if (!current) return current;

      if (/^<\//.test(current)) {
        indent = Math.max(indent - 1, 0);
      }

      const formatted = `${"  ".repeat(indent)}${current}`;

      if (/^<[^!?/][^>]*[^/]?>$/.test(current) && !/^<.*<\//.test(current) && !/\/>$/.test(current)) {
        indent += 1;
      }

      return formatted;
    })
    .join("\n");
}

function summarizeError(message: string) {
  if (message.includes("This element is not expected")) {
    const found = message.match(/Element '\{[^}]+\}([^']+)'/);
    const expected = message.match(/Expected is one of \( (.*) \)\./);
    const cleanedExpected = expected?.[1]
      ?.split(",")
      .map((part) => part.replace(/\{[^}]+\}/g, "").trim())
      .join(", ");
    return `Unexpected element ${found?.[1] ?? ""}${cleanedExpected ? `. Expected: ${cleanedExpected}` : ""}`;
  }
  if (message.includes("fails to validate")) return "XML does not conform to the selected schema.";
  if (message.includes("Failed to load the document")) return "Schema dependency could not be loaded.";
  return message;
}

export default function XmlValidatorPage() {
  const [xml, setXml] = useState<string>(sampleXml);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [samples, setSamples] = useState<string[]>([]);
  const [presetSchemas, setPresetSchemas] = useState<string[]>([]);
  const [schemaMode, setSchemaMode] = useState<"auto" | "manual">("auto");
  const [selectedSchema, setSelectedSchema] = useState<string>("Transmission.xsd");
  const [selectedSample, setSelectedSample] = useState<string>("");
  const [loadingSchemas, setLoadingSchemas] = useState(true);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState<RepairResponse | null>(null);
  const [resultTab, setResultTab] = useState<"summary" | "business" | "schema" | "repair" | "technical">("summary");

  useEffect(() => {
    let cancelled = false;

    async function loadSchemas() {
      setLoadingSchemas(true);
      try {
        const res = await fetch("/api/integration/xml-validator");
        const data = (await res.json()) as SchemaResponse;
        if (cancelled) return;
        setSchemas(data.schemas ?? []);
        setSamples(data.samples ?? []);
        setPresetSchemas(data.presetSchemas ?? []);
        if (data.defaultSchema) setSelectedSchema(data.defaultSchema);
        if (data.samples?.length) setSelectedSample(data.samples[0]);
        setLoadError(data.error ?? null);
      } catch (error) {
        if (!cancelled) setLoadError((error as Error).message);
      } finally {
        if (!cancelled) setLoadingSchemas(false);
      }
    }

    void loadSchemas();
    return () => {
      cancelled = true;
    };
  }, []);

  const canValidate = useMemo(() => {
    if (!xml.trim() && !selectedSample) return false;
    if (schemaMode === "manual" && !selectedSchema) return false;
    return true;
  }, [xml, schemaMode, selectedSchema, selectedSample]);

  const summarizedErrors = useMemo(() => {
    if (!result?.errors?.length) return [];
    return result.errors.map((error) => ({ ...error, friendly: summarizeError(error.message) }));
  }, [result]);

  const diffLines = useMemo(() => {
    if (!repairResult?.repairedXml || repairResult.repairedXml === xml) return [] as { kind: "same" | "removed" | "added"; text: string }[];
    const oldLines = xml.split("\n");
    const newLines = repairResult.repairedXml.split("\n");
    const max = Math.max(oldLines.length, newLines.length);
    const out: { kind: "same" | "removed" | "added"; text: string }[] = [];
    for (let i = 0; i < max; i += 1) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      if (oldLine === newLine) {
        if (oldLine !== undefined) out.push({ kind: "same", text: oldLine });
      } else {
        if (oldLine !== undefined) out.push({ kind: "removed", text: oldLine });
        if (newLine !== undefined) out.push({ kind: "added", text: newLine });
      }
    }
    return out;
  }, [repairResult, xml]);

  async function validateXml() {
    setValidating(true);
    setResult(null);
    try {
      const res = await fetch("/api/integration/xml-validator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xml,
          sample: !xml.trim() ? selectedSample : null,
          mode: schemaMode,
          schema: schemaMode === "manual" ? selectedSchema : null,
        }),
      });
      const data = (await res.json()) as ValidationResponse;
      setResult(data);
      return data;
    } catch (error) {
      const data = { ok: false, error: (error as Error).message };
      setResult(data);
      return data;
    } finally {
      setValidating(false);
    }
  }

  async function runRepair(mode: "suggest" | "draft" | "apply") {
    setRepairing(true);
    try {
      let validationForRepair = result;
      if (!validationForRepair) {
        validationForRepair = await validateXml();
      }

      const res = await fetch("/api/integration/xml-repair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          xml,
          applySafeFixes: mode === "apply",
          generateDraft: mode === "draft" || mode === "apply",
          validationErrors: validationForRepair?.errors ?? [],
        }),
      });
      const data = (await res.json()) as RepairResponse;
      setRepairResult(data);
      if (mode === "apply" && data.repairedXml) {
        setXml(data.repairedXml);
      }
    } catch (error) {
      setRepairResult({ ok: false, error: (error as Error).message });
    } finally {
      setRepairing(false);
    }
  }

  async function loadSampleIntoEditor() {
    if (!selectedSample) return;
    try {
      const res = await fetch(`/api/integration/xml-validator/sample?name=${encodeURIComponent(selectedSample)}`);
      const data = (await res.json()) as { xml?: string; error?: string };
      if (data.error || !data.xml) {
        setResult({ ok: false, error: data.error ?? "Unable to load sample." });
        return;
      }
      setXml(data.xml);
      setResult(null);
    } catch (error) {
      setResult({ ok: false, error: (error as Error).message });
    }
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setXml(text);
    setResult(null);
  }

  async function copyReport() {
    if (!result) return;
    const report = JSON.stringify(result, null, 2);
    await navigator.clipboard.writeText(report);
  }

  function exportReport() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xml-validation-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function prettyPrintXml() {
    try {
      setXml(formatXml(xml));
    } catch {
      // leave content as-is if formatting fails
    }
  }

  return (
    <Shell title="XML Validator">
      <div className="grid2" style={{ alignItems: "start", gridTemplateColumns: "minmax(420px, 1.15fr) minmax(360px, 0.85fr)" }}>
        <section className="card">
          <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Validate XML against OTM XSD schemas</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Server-side XSD validation using the bundled OTM schema set.
              </div>
            </div>

            <div className="toolbar" style={{ justifyContent: "flex-end" }}>
              <button className="btn primary" onClick={validateXml} disabled={!canValidate || validating}>
                {validating ? "Validating..." : "Validate XML"}
              </button>
              <button className="btn" onClick={() => runRepair("suggest")} disabled={repairing}>Suggest fixes</button>
              <button className="btn" onClick={() => runRepair("draft")} disabled={repairing}>Generate draft</button>
              <button className="btn" onClick={() => runRepair("apply")} disabled={repairing}>Apply safe fixes</button>
            </div>
          </div>

          {repairing ? <div className="muted" style={{ marginTop: 10 }}>Working on repair...</div> : null}

          <div className="formGrid" style={{ marginTop: 14 }}>
            <div>
              <div className="label">Schema mode</div>
              <select className="input" value={schemaMode} onChange={(e) => setSchemaMode(e.target.value as "auto" | "manual")}>
                <option value="auto">Auto-detect</option>
                <option value="manual">Choose schema manually</option>
              </select>
            </div>

            <div>
              <div className="label">Schema</div>
              <select
                className="input"
                value={selectedSchema}
                onChange={(e) => setSelectedSchema(e.target.value)}
                disabled={schemaMode !== "manual" || loadingSchemas}
              >
                {schemas.map((schema) => (
                  <option key={schema} value={schema}>
                    {schema}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {presetSchemas.length ? (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ marginBottom: 8 }}>Common schemas</div>
              <div className="toolbar" style={{ rowGap: 8 }}>
                {presetSchemas.map((schema) => (
                  <button
                    key={schema}
                    className={`btn ${selectedSchema === schema ? "primary" : ""}`}
                    onClick={() => {
                      setSchemaMode("manual");
                      setSelectedSchema(schema);
                    }}
                  >
                    {schema.replace(/\.xsd$/, "")}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {samples.length ? (
            <div className="formGrid" style={{ marginTop: 12 }}>
              <div>
                <div className="label">Sample XML</div>
                <select className="input" value={selectedSample} onChange={(e) => setSelectedSample(e.target.value)}>
                  {samples.map((sample) => (
                    <option key={sample} value={sample}>{sample}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "end" }}>
                <button className="btn" onClick={loadSampleIntoEditor}>Use selected sample</button>
              </div>
            </div>
          ) : null}

          {loadError ? <div className="errorText" style={{ marginTop: 12 }}>{loadError}</div> : null}

          <div style={{ marginTop: 14 }}>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <div className="label">XML</div>
              <div className="toolbar">
                <button className="btn" onClick={prettyPrintXml}>Pretty print</button>
                <button className="btn" onClick={() => setXml(sampleXml)}>Reset starter sample</button>
              </div>
            </div>
            <div
              className={`dropzone ${dragActive ? "dropzoneActive" : ""}`}
              style={{ marginTop: 8, marginBottom: 8, padding: 14 }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
            >
              Drag and drop an XML file here, or use the sample picker below.
            </div>
            <textarea
              className="textarea mono"
              value={xml}
              onChange={(e) => setXml(e.target.value)}
              spellCheck={false}
              placeholder="Paste XML here, or leave empty and validate the selected sample file."
              style={{ minHeight: 720 }}
            />
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="card" style={{ marginTop: 0, overflow: "hidden" }}>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>Validation Result</h2>
              <div className="toolbar">
                {result ? (
                  <>
                    <span className={`badge ${result.ok ? "good" : "bad"}`}>{result.ok ? "Valid" : "Invalid"}</span>
                    <button className="btn" onClick={copyReport}>Copy report</button>
                    <button className="btn" onClick={exportReport}>Export report</button>
                  </>
                ) : (
                  <span className="badge">Not run yet</span>
                )}
              </div>
            </div>

            <div className="toolbar" style={{ marginTop: 12, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
              {[
                ["summary", "Summary"],
                ["business", "Business Rules"],
                ["schema", "Schema Errors"],
                ["repair", "Repair"],
                ["technical", "Technical"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`btn ${resultTab === key ? "primary" : ""}`}
                  onClick={() => setResultTab(key as "summary" | "business" | "schema" | "repair" | "technical")}
                >
                  {label}
                </button>
              ))}
            </div>

            {!result ? (
              <div className="muted" style={{ marginTop: 12 }}>Paste XML and click “Validate XML”.</div>
            ) : (
              <>
                {resultTab === "summary" ? (
                  <>
                    <div className="kvGrid" style={{ marginTop: 12 }}>
                      <div>
                        <div className="muted">Root element</div>
                        <div className="mono" style={{ marginTop: 4 }}>
                          {result.root ? `${result.root.prefix ? `${result.root.prefix}:` : ""}${result.root.localName}` : "—"}
                        </div>
                      </div>
                      <div>
                        <div className="muted">Schema used</div>
                        <div className="mono" style={{ marginTop: 4 }}>{result.schema ?? "—"}</div>
                      </div>
                      <div>
                        <div className="muted">Auto-detected schema</div>
                        <div className="mono" style={{ marginTop: 4 }}>{result.autoDetectedSchema ?? "—"}</div>
                      </div>
                    </div>

                    <div className="listStack" style={{ marginTop: 12 }}>
                      <div className="detailPane">
                        <div style={{ fontWeight: 600, marginBottom: 10 }}>OTM Hints</div>
                        {result.insights?.length ? (
                          <ul style={{ paddingLeft: 18, lineHeight: 1.7 }}>
                            {result.insights.map((insight, idx) => <li key={idx} style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{insight}</li>)}
                          </ul>
                        ) : (
                          <div className="muted">No special hints for this payload yet.</div>
                        )}
                      </div>
                    </div>

                    {result.error ? <div className="errorText" style={{ marginTop: 12 }}>{result.error}</div> : null}
                  </>
                ) : null}

                {resultTab === "business" ? (
                  result.businessIssues?.length ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="listStack">
                        {result.businessIssues.map((issue, index) => (
                          <div key={`${issue.line ?? "na"}-${index}`} className="detailPane" style={{ minHeight: "auto" }}>
                            <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ fontWeight: 600, overflowWrap: "anywhere", wordBreak: "break-word" }}>{issue.message}</div>
                              <div className="toolbar">
                                <span className={`badge ${issue.severity === "error" ? "bad" : "warn"}`}>{issue.severity}</span>
                                <span className="badge">Line: {issue.line ?? "—"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <div className="muted" style={{ marginTop: 12 }}>No business-rule issues found.</div>
                ) : null}

                {resultTab === "schema" ? (
                  summarizedErrors.length > 0 ? (
                    <div style={{ marginTop: 12 }}>
                      <div className="listStack">
                        {summarizedErrors.map((error, index) => (
                          <div key={`${error.line ?? "na"}-${error.column ?? "na"}-${index}`} className="detailPane" style={{ minHeight: "auto" }}>
                            <div style={{ fontWeight: 600, marginBottom: 8 }}>{error.friendly}</div>
                            <div className="toolbar" style={{ gap: 10, marginBottom: 8 }}>
                              <span className="badge">Line: {error.line ?? "—"}</span>
                              <span className="badge">Column: {error.column ?? "—"}</span>
                            </div>
                            <div className="mono muted" style={{ fontSize: 12, whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                              {error.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : result.ok ? (
                    <div style={{ marginTop: 12 }} className="badge good">Schema validation passed.</div>
                  ) : <div className="muted" style={{ marginTop: 12 }}>No schema errors to show.</div>
                ) : null}

                {resultTab === "repair" ? (
                  repairResult ? (
                    <div style={{ marginTop: 12 }} className="listStack">
                      {repairResult.note ? <div className="muted">{repairResult.note}</div> : null}
                      {repairResult.suggestions?.length ? repairResult.suggestions.map((suggestion, idx) => (
                        <div key={`${suggestion.title}-${idx}`} className="detailPane" style={{ minHeight: "auto" }}>
                          <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontWeight: 600, overflowWrap: "anywhere", wordBreak: "break-word" }}>{suggestion.title}</div>
                            <div className="toolbar">
                              <span className={`badge ${suggestion.confidence === "high" ? "good" : suggestion.confidence === "medium" ? "warn" : ""}`}>{suggestion.confidence}</span>
                              <span className="badge">{suggestion.kind}</span>
                            </div>
                          </div>
                          <div className="muted" style={{ marginTop: 8 }}>{suggestion.description}</div>
                        </div>
                      )) : <div className="muted">No repair suggestions yet.</div>}
                    </div>
                  ) : <div className="muted" style={{ marginTop: 12 }}>Run a repair action to populate this tab.</div>
                ) : null}

                {resultTab === "technical" ? (
                  result.raw ? (
                    <pre className="pre mono" style={{ marginTop: 12, fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>{result.raw}</pre>
                  ) : <div className="muted" style={{ marginTop: 12 }}>No technical output available.</div>
                ) : null}
              </>
            )}
          </section>

          <section className="card" style={{ marginTop: 0 }}>
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>Suggested Repair</h2>
              {repairResult?.changed ? <span className="badge good">Draft generated</span> : <span className="badge">No draft yet</span>}
            </div>

            {!repairResult ? (
              <div className="muted" style={{ marginTop: 12 }}>Use Suggest fixes / Generate corrected XML draft / Apply safe fixes.</div>
            ) : (
              <>
                {repairResult.error ? <div className="errorText" style={{ marginTop: 12 }}>{repairResult.error}</div> : null}
                {repairResult.note ? <div className="muted" style={{ marginTop: 12 }}>{repairResult.note}</div> : null}

                {repairResult.suggestions?.length ? (
                  <div className="listStack" style={{ marginTop: 12 }}>
                    {repairResult.suggestions.map((suggestion, idx) => (
                      <div key={`${suggestion.title}-${idx}`} className="detailPane" style={{ minHeight: "auto" }}>
                        <div className="toolbar" style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontWeight: 600, overflowWrap: "anywhere", wordBreak: "break-word" }}>{suggestion.title}</div>
                          <div className="toolbar">
                            <span className={`badge ${suggestion.confidence === "high" ? "good" : suggestion.confidence === "medium" ? "warn" : ""}`}>{suggestion.confidence}</span>
                            <span className="badge">{suggestion.kind}</span>
                          </div>
                        </div>
                        <div className="muted" style={{ marginTop: 8 }}>{suggestion.description}</div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {repairResult.repairedXml ? (
                  <div className="listStack" style={{ marginTop: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>Corrected XML Preview</div>
                      <pre className="pre mono" style={{ fontSize: 12, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>{repairResult.repairedXml}</pre>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 8 }}>Diff</div>
                      <div className="pre mono" style={{ fontSize: 12 }}>
                        {diffLines.length ? diffLines.map((line, idx) => (
                          <div
                            key={`${line.kind}-${idx}`}
                            style={{
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              padding: "2px 6px",
                              borderRadius: 6,
                              background:
                                line.kind === "added"
                                  ? "rgba(6, 118, 71, 0.18)"
                                  : line.kind === "removed"
                                    ? "rgba(180, 35, 24, 0.18)"
                                    : "transparent",
                              color:
                                line.kind === "added"
                                  ? "#b7f7cf"
                                  : line.kind === "removed"
                                    ? "#ffb4ab"
                                    : "#dbe5f0",
                              marginBottom: 2,
                            }}
                          >
                            {line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "} {line.text}
                          </div>
                        )) : <div>No changes.</div>}
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}
