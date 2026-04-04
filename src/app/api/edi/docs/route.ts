import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { loadStore, saveStore } from "@/lib/demoStore";

export async function GET() {
  const store = await loadStore();
  return NextResponse.json({ docs: store.edi.docs });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await loadStore();
  const rawText = body.rawText ?? "";
  const doc = {
    id: randomUUID(),
    version: body.version,
    txSet: body.txSet,
    carrier: body.carrier,
    sourceName: body.sourceName,
    notes: body.notes ?? "",
    status: rawText ? "processed" : "registered",
    chunkCount: rawText ? Math.max(1, Math.ceil(rawText.length / 1200)) : 0,
    charCount: rawText.length,
    snippetPreview: rawText.slice(0, 240),
    createdAt: new Date().toISOString(),
  };
  store.edi.docs.unshift(doc);
  await saveStore(store);
  return NextResponse.json({ doc });
}
