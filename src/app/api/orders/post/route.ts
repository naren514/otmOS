import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { gzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const endpoint = String(body.endpoint ?? "");
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");
  const xml = String(body.xml ?? "");
  const useGzip = Boolean(body.gzip);

  // Safety check: only allow dev/test endpoints
  const isAllowedEndpoint = endpoint.toLowerCase().includes("dev") || endpoint.toLowerCase().includes("test");

  if (!isAllowedEndpoint) {
    const result = {
      id: randomUUID(),
      endpoint,
      username,
      status: "blocked",
      message: "Blocked: endpoint must contain 'dev' or 'test' for safety.",
      createdAt: new Date().toISOString(),
      payloadBytes: String(Buffer.byteLength(xml, "utf8")),
    };
    return NextResponse.json({ result }, { status: 400 });
  }

  // Prepare payload
  let payload: BodyInit = xml;
  const headers: Record<string, string> = {
    "Content-Type": "text/xml; charset=utf-8",
  };

  if (useGzip) {
    const compressed = await gzipAsync(Buffer.from(xml, "utf8"));
    payload = compressed as BodyInit;
    headers["Content-Encoding"] = "gzip";
  }

  // Add Basic Auth
  if (username && password) {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    headers["Authorization"] = `Basic ${auth}`;
  }

  try {
    // POST to OTM
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: payload,
    });

    const responseText = await response.text();

    // Parse OTM acknowledgment XML to extract status
    let ackStatus = "UNKNOWN";
    let ackMessage = responseText.substring(0, 500);

    if (response.ok) {
      try {
        // Parse XML response to check for errors/warnings
        if (responseText.includes("SEVERITY_ERROR") || responseText.includes("ERROR")) {
          ackStatus = "ERROR";
          ackMessage = responseText.substring(0, 1000);
        } else if (responseText.includes("SEVERITY_WARNING") || responseText.includes("WARNING")) {
          ackStatus = "WARNING";
          ackMessage = responseText.substring(0, 1000);
        } else {
          ackStatus = "OK";
          ackMessage = `Successfully posted to OTM. HTTP ${response.status}`;
        }
      } catch {
        ackStatus = "OK";
        ackMessage = `Successfully posted to OTM. HTTP ${response.status}`;
      }
    } else {
      ackStatus = `HTTP_ERROR ${response.status}`;
      ackMessage = responseText.substring(0, 1000);
    }

    const result = {
      id: randomUUID(),
      endpoint,
      username,
      status: ackStatus,
      message: ackMessage,
      createdAt: new Date().toISOString(),
      payloadBytes: String(Buffer.byteLength(xml, "utf8")),
      responseStatus: response.status,
      responseBody: responseText.substring(0, 1000),
    };

    return NextResponse.json({ result }, { status: response.ok ? 200 : 500 });
  } catch (error) {
    const result = {
      id: randomUUID(),
      endpoint,
      username,
      status: "error",
      message: `Failed to connect to OTM: ${error instanceof Error ? error.message : String(error)}`,
      createdAt: new Date().toISOString(),
      payloadBytes: String(Buffer.byteLength(xml, "utf8")),
    };

    return NextResponse.json({ result }, { status: 500 });
  }
}
