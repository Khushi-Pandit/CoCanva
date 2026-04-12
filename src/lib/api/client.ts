// ── Type-safe API client with Firebase token injection ─────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let _getToken: (() => Promise<string | null>) | null = null;
let _getShareToken: (() => string | undefined) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn;
}

/** Register a function that returns the current canvas shareToken (if any) */
export function setShareTokenProvider(fn: () => string | undefined) {
  _getShareToken = fn;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { shareToken?: string } = {},
): Promise<T> {
  const { shareToken, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (_getToken) {
    const token = await _getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach shareToken from explicit option OR from registered store provider
  const resolvedShareToken = shareToken ?? (_getShareToken ? _getShareToken() : undefined);
  if (resolvedShareToken) {
    headers['x-share-token'] = resolvedShareToken;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    let errorData: { error?: { code?: string; message?: string } } = {};
    try { errorData = await res.json(); } catch {}
    throw new ApiError(
      res.status,
      errorData.error?.code ?? 'UNKNOWN',
      errorData.error?.message ?? `HTTP ${res.status}`,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function get<T>(path: string, opts?: RequestInit & { shareToken?: string }) {
  return apiRequest<T>(path, { method: 'GET', ...opts });
}

export function post<T>(path: string, body?: unknown, opts?: RequestInit & { shareToken?: string }) {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  });
}

export function put<T>(path: string, body?: unknown, opts?: RequestInit) {
  return apiRequest<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...opts,
  });
}

export function del<T>(path: string, opts?: RequestInit) {
  return apiRequest<T>(path, { method: 'DELETE', ...opts });
}
