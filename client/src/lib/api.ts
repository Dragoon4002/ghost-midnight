import { SERVER } from "./constants";

export const ts = () => Math.floor(Date.now() / 1000);

export async function get(path: string) {
  const res = await fetch(`${SERVER}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function post(path: string, body: any) {
  const res = await fetch(`${SERVER}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}
