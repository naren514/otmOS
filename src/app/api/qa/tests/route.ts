import { NextResponse } from "next/server";
import { loadStore } from "@/lib/demoStore";

export async function GET() {
  const store = await loadStore();
  return NextResponse.json({ tests: store.qa.tests });
}
