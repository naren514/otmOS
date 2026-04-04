import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { loadStore, saveStore } from "@/lib/demoStore";

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const store = await loadStore();
  return NextResponse.json({ runs: store.qa.runs.slice(0, limit) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await loadStore();
  const run = {
    id: randomUUID(),
    testId: body.testId,
    startedAt: new Date().toISOString(),
    finishedAt: new Date(Date.now() + 1500).toISOString(),
    status: "passed",
    error: null,
    artifacts: {
      summary: "Embedded demo QA run completed successfully.",
      execLog: `Executed ${body.testId} against ${store.qa.config.baseUrl || "demo environment"}`,
      screenshots: [],
    },
  };
  store.qa.runs.unshift(run);
  await saveStore(store);
  return NextResponse.json({ run });
}
