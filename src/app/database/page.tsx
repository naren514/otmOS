import Link from "next/link";
import Shell from "@/components/Shell";

export default function DatabaseToolsPage() {
  return (
    <Shell title="Database Tools">
      <section className="card">
        <p className="muted">
          Tools for exploring OTM database structure and reference material in a more usable way.
        </p>

        <ul style={{ marginTop: 16, paddingLeft: 18, lineHeight: 1.9 }}>
          <li>
            <Link href="/database/data-dictionary">Data Dictionary Explorer</Link> — searchable subject-area browser for the OTM data model diagrams.
          </li>
          <li>
            <Link href="/database/tables">Table Explorer</Link> — browse subject areas, tables, and field-level definitions from the richer OTM data dictionary export.
          </li>
          <li>
            <Link href="/database/sql-builder">SQL Builder</Link> — assemble SQL queries from tables and fields with dictionary assistance.
          </li>
        </ul>
      </section>
    </Shell>
  );
}
