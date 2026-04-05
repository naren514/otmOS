import { NextRequest } from "next/server";
import { qaRunnerFetch } from "@/lib/qaProxy";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId') ?? 'local-agent-default';
  return qaRunnerFetch(`/local-agent/poll?agentId=${encodeURIComponent(agentId)}`);
}
