import { NextRequest, NextResponse } from "next/server";
import { loadStore } from "@/lib/demoStore";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").toLowerCase();
  const store = await loadStore();
  const mappings = store.edi.mappings.filter((m) => JSON.stringify(m).toLowerCase().includes(q));
  const docs = store.edi.docs.filter((d) => JSON.stringify(d).toLowerCase().includes(q));
  return NextResponse.json({ mappings, docs });
}
