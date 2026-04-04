import { NextRequest } from "next/server";
import { qaRunnerFetch } from "@/lib/qaProxy";

export async function GET() {
  return qaRunnerFetch("/config");
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return qaRunnerFetch("/config", { method: "POST", body });
}
