const DEFAULT_REMOTE_BASE = "http://136.114.93.164:4010/api";
const DEFAULT_REMOTE_TOKEN = "RXDhRkOEosUUzc3U7Cg2AajpeiluuMmH";

export function getQaRunnerBase() {
  return (process.env.QA_RUNNER_BASE_URL ?? DEFAULT_REMOTE_BASE).trim();
}

export function getQaRunnerToken() {
  return (process.env.QA_RUNNER_TOKEN ?? DEFAULT_REMOTE_TOKEN).trim();
}

export async function qaRunnerFetch(path: string, init?: RequestInit) {
  const base = getQaRunnerBase().replace(/\/$/, "");
  const token = getQaRunnerToken();
  const headers = new Headers(init?.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const buffer = await res.arrayBuffer();
    return new Response(buffer, {
      status: res.status,
      headers: { "Content-Type": contentType || "application/octet-stream" },
    });
  }

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    return new Response(JSON.stringify(data ?? { error: `Runner request failed (${res.status})` }), {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
