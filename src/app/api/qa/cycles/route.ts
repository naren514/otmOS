import { NextRequest } from "next/server";
import { qaRunnerFetch } from "@/lib/qaProxy";

export async function GET() {
  return qaRunnerFetch("/cycles");
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  return qaRunnerFetch("/cycles", { method: "POST", body });
}
