import Link from "next/link";
import Shell from "@/components/Shell";

export default function IntegrationToolsHome() {
  return (
    <Shell title="Integration Tools">
      <section className="card">
        <p className="muted">
          Quick utilities for working with integration payloads (client-side; nothing is posted anywhere).
        </p>

        <ul style={{ marginTop: 16, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>
            <Link href="/integration/xml-validator">XML Validator</Link> — validate + pretty-print XML
          </li>
          <li>
            <Link href="/integration/xpath-generator">XPath Generator</Link> — paste XML and browse generated XPath paths
          </li>
          <li>
            <Link href="/integration/json-validator">JSON Validator</Link> — validate + pretty-print JSON
          </li>
          <li>
            <Link href="/integration/jsonpath-generator">JSONPath Generator</Link> — paste JSON and browse generated JSONPath paths
          </li>
        </ul>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Notes</h2>
        <ul style={{ marginTop: 12, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>These tools run in your browser; no backend required.</li>
          <li>Next step (optional): add “copy path” buttons + path search + value preview.</li>
        </ul>
      </section>
    </Shell>
  );
}

