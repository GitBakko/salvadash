const API_BASE = '/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function refreshTokens(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function request<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<{ success: boolean; data?: T; error?: string; [key: string]: unknown }> {
  const { body, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string>),
  };

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config: RequestInit = {
    ...rest,
    headers,
    credentials: 'include',
    body: body !== undefined
      ? body instanceof FormData ? body : JSON.stringify(body)
      : undefined,
  };

  let res = await fetch(`${API_BASE}${endpoint}`, config);

  // Auto-refresh on 401
  if (res.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
    const refreshed = await refreshTokens();
    if (refreshed) {
      res = await fetch(`${API_BASE}${endpoint}`, config);
    }
  }

  const json = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));
  return json;
}

export const api = {
  get: <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: 'GET' }),

  post: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body }),

  put: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body }),

  delete: <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'DELETE', body }),
};
