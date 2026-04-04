export default function Home() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>otmOS Web</h1>
      <p style={{ color: '#555', marginTop: 0 }}>
        Vercel-friendly frontend for Order Generator, EDI Explainer, and OTM QA Runner.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>Tools</h2>
        <ul>
          <li><strong>Order Generator</strong> — generate and post OTM SO/PO payloads via API</li>
          <li><strong>EDI Explainer</strong> — explain X12 messages, manage mappings, ingest docs</li>
          <li><strong>OTM QA Runner</strong> — configure QA envs, launch tests/cycles, inspect runs</li>
        </ul>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Migration status</h2>
        <ul>
          <li>Next.js shell scaffolded</li>
          <li>Vercel migration plan documented</li>
          <li>Next recommended step: build QA Runner pages first</li>
        </ul>
      </section>
    </main>
  );
}
