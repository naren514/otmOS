import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const INDEX_PATH = path.join(process.cwd(), "data", "data-dictionary-index.json");

type TableField = {
  name: string;
  description: string;
};

type TableEntry = {
  tableName: string;
  description: string;
  fields: TableField[];
  fileName: string;
  subjectArea: string;
  relationships?: { fieldName: string; targetTable: string; targetLabel?: string }[];
};

async function loadIndex() {
  const raw = await fs.readFile(INDEX_PATH, "utf8");
  return JSON.parse(raw) as { tables: TableEntry[] };
}

export async function GET(req: NextRequest) {
  try {
    const table = req.nextUrl.searchParams.get("table");
    const field = req.nextUrl.searchParams.get("field");
    const index = await loadIndex();

    if (table) {
      const found = index.tables.find((entry) => entry.tableName.toUpperCase() === table.toUpperCase());
      if (!found) {
        return NextResponse.json({ error: `Table not found: ${table}` }, { status: 404 });
      }
      return NextResponse.json(found);
    }

    if (field) {
      const q = field.toUpperCase();
      const matches = index.tables.flatMap((entry) =>
        entry.fields
          .filter((f) => f.name.toUpperCase().includes(q) || f.description.toUpperCase().includes(q))
          .map((f) => ({
            tableName: entry.tableName,
            subjectArea: entry.subjectArea,
            fieldName: f.name,
            description: f.description,
          }))
      );
      return NextResponse.json({ matches: matches.slice(0, 500) });
    }

    return NextResponse.json({
      tables: index.tables.map(({ tableName, subjectArea, fileName }) => ({ tableName, subjectArea, fileName })),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
