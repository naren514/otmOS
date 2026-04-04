import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Admin" },
  { href: "/qa/tests", label: "QA Tests" },
  { href: "/qa/cycles", label: "QA Cycles" },
  { href: "/qa/runs", label: "QA Runs" },
  { href: "/edi", label: "EDI Explainer" },
  { href: "/orders", label: "Order Generator" },
];

export default function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <div className="brand">otmOS Web</div>
          <div className="muted">Vercel-friendly frontend</div>
        </div>
        <nav className="nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="navLink">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="pageHeader">
          <h1>{title}</h1>
        </header>
        {children}
      </main>
    </div>
  );
}
