import Link from "next/link";
import Shell from "@/components/Shell";

export default function Home() {
  return (
    <Shell title="otmOS">
      <section className="card">
        <h2>Tools</h2>
        <ul style={{ marginTop: 16, paddingLeft: 18, lineHeight: 1.8 }}>
          <li><Link href="/orders">Order Generator</Link> — generate and post Sales Orders / Purchase Orders</li>
          <li><Link href="/edi">EDI Explainer</Link> — explain X12, manage mappings, and ingest docs</li>
          <li><Link href="/integration">Integration Tools</Link> — XML/JSON utilities (validators + XPath/JSONPath helpers)</li>
          <li><Link href="/database">Database Tools</Link> — browse OTM data dictionary diagrams and subject areas</li>
          <li><Link href="/qa">OTM QA</Link> — Selenium-backed QA runs, cycles, and run history</li>
        </ul>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Current focus</h2>
        <ul style={{ marginTop: 16, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>QA Runner UI with run detail + polling</li>
          <li>EDI Explainer and Order Generator Vercel-facing scaffolds</li>
          <li>Remote API contract instead of local Selenium/npm coupling</li>
        </ul>
      </section>
    </Shell>
  );
}
