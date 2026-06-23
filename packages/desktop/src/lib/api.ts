/**
 * Thin typed client over the Sanskar Palace REST API.
 *
 * The server base URL is configurable (the server PC's LAN IP) and persisted in
 * localStorage so each client PC can point at the server. The JWT is stored and
 * attached as a bearer token on every request.
 */

const SERVER_KEY = "sp.serverUrl";
const TOKEN_KEY = "sp.token";

export function getServerUrl(): string {
  return localStorage.getItem(SERVER_KEY) ?? "http://localhost:4000";
}

export function setServerUrl(url: string): void {
  localStorage.setItem(SERVER_KEY, url.replace(/\/$/, ""));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  // Only declare a JSON body when we actually send one — otherwise Fastify rejects
  // an empty body with content-type application/json (e.g. POST /finalize, /cancel).
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${getServerUrl()}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Check the server address and that it is running.");
  }

  if (res.status === 401) {
    setToken(null);
    throw new ApiError(401, "Session expired. Please sign in again.");
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      (data && typeof data.error === "string" && data.error) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
  health: async (): Promise<boolean> => {
    try {
      const res = await fetch(`${getServerUrl()}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
