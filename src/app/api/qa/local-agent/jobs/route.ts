import { NextRequest } from "next/server";
import { qaRunnerFetch } from "@/lib/qaProxy";

export async function POST(req: NextRequest) {
  const body = await req.text();
  return qaRunnerFetch('/local-agent/jobs', { method: 'POST', body });
}
