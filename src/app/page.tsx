import Link from "next/link";
import Shell from "@/components/Shell";

export default function Home() {
  return (
    <Shell title="otmOS Web">
      <section className="card">
        <h2>Tools</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Production-direction frontend for otmOS on Vercel.
        </p>
        <ul style={{ marginTop: 16, paddingLeft: 18, lineHeight: 1.8 }}>
          <li><Link href="/qa/tests">OTM QA Runner</Link> — remote-runner driven test execution</li>
          <li><Link href="/edi">EDI Explainer</Link> — polished frontend scaffold for explain / ingest / knowledge flows</li>
          <li><Link href="/orders">Order Generator</Link> — polished frontend scaffold for SO/PO generation and posting</li>
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
