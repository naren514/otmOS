function headers() {
  return { "content-type": "application/json" };
}

export async function orderPost<T>(baseUrl: string, path: string, body: object): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? `POST ${path} failed`);
  return data as T;
}
