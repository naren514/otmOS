import { NextRequest, NextResponse } from "next/server";
import { loadStore, saveStore } from "@/lib/demoStore";

export async function GET() {
  const store = await loadStore();
  return NextResponse.json({ config: store.qa.config });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await loadStore();
  store.qa.config = {
    baseUrl: body.baseUrl ?? "",
    username: body.username ?? "",
    browser: body.browser ?? "chrome",
  };
  await saveStore(store);
  return NextResponse.json({ ok: true, config: store.qa.config });
}
