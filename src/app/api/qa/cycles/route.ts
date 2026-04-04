import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { loadStore, saveStore } from "@/lib/demoStore";

export async function GET() {
  const store = await loadStore();
  return NextResponse.json({ cycles: store.qa.cycles });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await loadStore();
  const cycle = {
    id: randomUUID(),
    name: body.name || `cycle-${Date.now()}`,
    testIds: body.testIds || [],
    createdAt: new Date().toISOString(),
  };
  store.qa.cycles.unshift(cycle);
  await saveStore(store);
  return NextResponse.json({ cycle });
}
