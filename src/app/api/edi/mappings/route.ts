import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { loadStore, saveStore } from "@/lib/demoStore";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const version = q.get("version");
  const txSet = q.get("txSet");
  const carrier = q.get("carrier");
  const store = await loadStore();
  let mappings = store.edi.mappings;
  if (version) mappings = mappings.filter((m) => m.version === version);
  if (txSet) mappings = mappings.filter((m) => m.txSet === txSet);
  if (carrier) mappings = mappings.filter((m) => m.carrier === carrier || m.carrier === "industry");
  return NextResponse.json({ mappings });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await loadStore();
  const existing = store.edi.mappings.find((m) =>
    m.version === body.version && m.txSet === body.txSet && m.carrier === body.carrier && m.segment === body.segment && Number(m.elementPos) === Number(body.elementPos) && m.code === body.code,
  );
  if (existing) {
    existing.meaning = body.meaning;
    existing.notes = body.notes ?? "";
    existing.source = body.source ?? "user";
  } else {
    store.edi.mappings.unshift({
      id: randomUUID(),
      version: body.version,
      txSet: body.txSet,
      carrier: body.carrier,
      segment: body.segment,
      elementPos: Number(body.elementPos),
      code: body.code,
      meaning: body.meaning,
      notes: body.notes ?? "",
      source: body.source ?? "user",
    });
  }
  await saveStore(store);
  return NextResponse.json({ ok: true });
}
