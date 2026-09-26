import { getValidAccessToken } from "../auth/googleAuth";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function findFile(name: string): Promise<string | null> {
  const headers = await authHeaders();
  const q = encodeURIComponent(`name = '${name}' and trashed = false`);
  const resp = await fetch(`${API}/files?q=${q}&fields=files(id,name)`, { headers });
  if (!resp.ok) throw new Error(`Drive files.list failed: ${resp.status}`);
  const data = await resp.json();
  const files = data.files as { id: string; name: string }[];
  return files.length > 0 ? files[0].id : null;
}

export async function listFiles(nameContains: string): Promise<{ id: string; name: string }[]> {
  const headers = await authHeaders();
  const q = encodeURIComponent(`name contains '${nameContains}' and trashed = false`);
  const resp = await fetch(`${API}/files?q=${q}&fields=files(id,name)`, { headers });
  if (!resp.ok) throw new Error(`Drive files.list failed: ${resp.status}`);
  const data = await resp.json();
  return data.files ?? [];
}

export async function readJson<T>(fileId: string): Promise<T> {
  const headers = await authHeaders();
  const resp = await fetch(`${API}/files/${fileId}?alt=media`, { headers });
  if (!resp.ok) throw new Error(`Drive files.get failed: ${resp.status}`);
  return resp.json();
}

export async function writeJson(fileId: string, data: unknown): Promise<void> {
  const headers = await authHeaders();
  const resp = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`Drive files.update failed: ${resp.status}`);
}

export async function createJson(name: string, data: unknown): Promise<string> {
  const headers = await authHeaders();
  const boundary = "shoplist-boundary";
  const metadata = JSON.stringify({ name });
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n` +
    `--${boundary}--`;

  const resp = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
    method: "POST",
    headers: { ...headers, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!resp.ok) throw new Error(`Drive files.create failed: ${resp.status}`);
  const created = await resp.json();
  return created.id;
}
