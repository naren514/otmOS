import Link from "next/link";
import Shell from "@/components/Shell";
import SectionIntro from "@/components/SectionIntro";

export default function QAPage() {
  return (
    <Shell title="OTM QA">
      <section className="card">
        <SectionIntro
          title="OTM QA"
          description="Run Selenium-backed OTM tests, inspect runs, and manage cycles from one place."
        />
        <div className="grid2">
          <Link href="/qa/tests" className="listItem" style={{ textDecoration: "none", color: "inherit" }}>
            <strong>Test Library</strong>
            <div className="muted" style={{ marginTop: 8 }}>Browse discovered tests and run one, many, or selected scenarios.</div>
          </Link>
          <Link href="/qa/runs" className="listItem" style={{ textDecoration: "none", color: "inherit" }}>
            <strong>Runs</strong>
            <div className="muted" style={{ marginTop: 8 }}>Watch active runs, inspect recent results, and review artifacts.</div>
          </Link>
          <Link href="/qa/cycles" className="listItem" style={{ textDecoration: "none", color: "inherit" }}>
            <strong>Cycles</strong>
            <div className="muted" style={{ marginTop: 8 }}>Save groups of tests and run them in sequence.</div>
          </Link>
          <Link href="/admin" className="listItem" style={{ textDecoration: "none", color: "inherit" }}>
            <strong>QA Admin</strong>
            <div className="muted" style={{ marginTop: 8 }}>Configure runner API, environment URL, username, browser, and session password.</div>
          </Link>
        </div>
      </section>
    </Shell>
  );
}
