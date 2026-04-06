import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const endpoint = String(body.endpoint ?? "");
  const xml = String(body.xml ?? "");
  const isAllowedEndpoint = endpoint.toLowerCase().includes("dev") || endpoint.toLowerCase().includes("test");

  const result = {
    id: randomUUID(),
    endpoint,
    username: String(body.username ?? ""),
    status: isAllowedEndpoint ? "accepted" : "blocked",
    message: isAllowedEndpoint
      ? "Demo post accepted for non-prod endpoint."
      : "Blocked: endpoint must contain dev or test.",
    createdAt: new Date().toISOString(),
    payloadBytes: String(Buffer.byteLength(xml, "utf8")),
  };

  return NextResponse.json({ result }, { status: result.status === "accepted" ? 200 : 400 });
}
