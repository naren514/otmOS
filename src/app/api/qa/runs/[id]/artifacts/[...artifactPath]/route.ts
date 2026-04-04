import { qaRunnerFetch } from "@/lib/qaProxy";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; artifactPath: string[] }> }) {
  const { id, artifactPath } = await params;
  return qaRunnerFetch(`/runs/${encodeURIComponent(id)}/artifacts/${artifactPath.map(encodeURIComponent).join('/')}`);
}
