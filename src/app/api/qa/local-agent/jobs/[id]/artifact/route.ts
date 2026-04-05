import { NextRequest } from "next/server";
import { qaRunnerFetch } from "@/lib/qaProxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.text();
  return qaRunnerFetch(`/local-agent/jobs/${encodeURIComponent(id)}/artifact`, { method: 'POST', body });
}
