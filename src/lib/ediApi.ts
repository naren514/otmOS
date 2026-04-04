export type EdiExplainRow = { segIndex: number; segment: string; pos: number; value: string; meaning: string; notes: string; source: string };
export type EdiMapping = { id: string; version: string; txSet: string; carrier: string; segment: string; elementPos: number; code: string; meaning: string; notes: string; source: string };
export type EdiDoc = { id: string; sourceName: string; status: string; snippetPreview: string; chunkCount: number; charCount: number; createdAt: string };

function headers() {
  return { "content-type": "application/json" };
}

export async function ediPost<T>(baseUrl: string, path: string, body: object): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `POST ${path} failed`);
  return data as T;
}

export async function ediGet<T>(baseUrl: string, path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `GET ${path} failed`);
  return data as T;
}
