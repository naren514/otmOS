import { NextRequest, NextResponse } from "next/server";
import { loadStore } from "@/lib/demoStore";
import { parseX12 } from "@/lib/ediParser";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = parseX12(body.x12 ?? "", body.elementSep ?? "*", body.segmentTerm ?? "~");
  const store = await loadStore();
  const mappings = store.edi.mappings;

  const explained = rows.map((row) => {
    const match = mappings.find((m) =>
      m.version === body.version &&
      m.txSet === body.txSet &&
      (m.carrier === body.carrier || m.carrier === "industry") &&
      m.segment === row.segment &&
      Number(m.elementPos) === row.pos &&
      m.code === row.value,
    );
    return {
      ...row,
      meaning: match?.meaning ?? "",
      notes: match?.notes ?? "",
      source: match?.source ?? (match ? "mapping" : ""),
    };
  });

  return NextResponse.json({ rows: explained });
}
