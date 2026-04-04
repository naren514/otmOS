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
          <li>EDI Explainer — planned next</li>
          <li>Order Generator — planned after EDI</li>
        </ul>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Current focus</h2>
        <ul style={{ marginTop: 16, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>QA Runner UI on Next.js</li>
          <li>Remote API contract instead of local Selenium/npm coupling</li>
          <li>Vercel-compatible frontend behavior</li>
        </ul>
      </section>
    </Shell>
  );
}
