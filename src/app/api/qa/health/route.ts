import { qaRunnerFetch } from "@/lib/qaProxy";

export async function GET() {
  return qaRunnerFetch("/health");
}
