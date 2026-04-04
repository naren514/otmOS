import { NextRequest } from "next/server";
import { qaRunnerFetch } from "@/lib/qaProxy";

export async function GET(req: NextRequest) {
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";
  return qaRunnerFetch(`/runs?limit=${encodeURIComponent(limit)}`);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return qaRunnerFetch("/runs", { method: "POST", body });
}
