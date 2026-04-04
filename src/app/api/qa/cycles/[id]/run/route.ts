import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { loadStore, saveStore } from "@/lib/demoStore";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await loadStore();
  const cycle = store.qa.cycles.find((c) => String(c.id) === id);
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });

  const createdRuns = (cycle.testIds as string[]).map((testId) => ({
    id: randomUUID(),
    testId,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: "passed",
    error: null,
    artifacts: { summary: `Cycle ${cycle.name} demo run`, execLog: `Executed ${testId}` },
  }));

  store.qa.runs.unshift(...createdRuns);
  await saveStore(store);
  return NextResponse.json({ result: { cycleId: id, createdRuns } });
}
