export type QAConfig = {
  baseUrl: string;
  username: string;
  browser: "chrome" | "firefox" | "edge";
};

export type QATest = {
  id: string;
  file: string;
  tags?: string[];
  title?: string;
};

export type QARun = {
  id: string;
  testId: string;
  startedAt: string;
  finishedAt?: string;
  status: "queued" | "running" | "passed" | "failed";
  error?: string | null;
  artifacts?: Record<string, unknown>;
};

export type QACycle = {
  id: string;
  name: string;
  testIds: string[];
  createdAt: string;
};

function authHeaders(token?: string) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function qaGet<T>(baseUrl: string, path: string, token?: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { headers: authHeaders(token), cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `GET ${path} failed`);
  return data as T;
}

export async function qaPost<T>(baseUrl: string, path: string, body: object, token?: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `POST ${path} failed`);
  return data as T;
}
