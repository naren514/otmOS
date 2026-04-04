import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { loadStore, saveStore } from "@/lib/demoStore";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await loadStore();
  const result = {
    id: randomUUID(),
    endpoint: body.endpoint,
    username: body.username,
    status: body.endpoint?.toLowerCase().includes("dev") || body.endpoint?.toLowerCase().includes("test") ? "accepted" : "blocked",
    message: body.endpoint?.toLowerCase().includes("dev") || body.endpoint?.toLowerCase().includes("test")
      ? "Demo post accepted for non-prod endpoint."
      : "Blocked: endpoint must contain dev or test.",
    createdAt: new Date().toISOString(),
  };
  store.orders.results.unshift(result);
  await saveStore(store);
  return NextResponse.json({ result }, { status: result.status === "accepted" ? 200 : 400 });
}
