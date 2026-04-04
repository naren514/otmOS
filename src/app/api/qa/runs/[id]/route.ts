import { qaRunnerFetch } from "@/lib/qaProxy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return qaRunnerFetch(`/runs/${encodeURIComponent(id)}`);
}
