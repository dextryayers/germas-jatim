/// <reference types="vite/client" />

const ensureTrailingSlash = (value: string) => value.replace(/\/?$/, '/');

const ensureApiSuffix = (value: string) => {
  const trimmed = value.replace(/\/$/, '');
  return /\/api$/i.test(trimmed) ? trimmed : `${trimmed}/api`;
};

const deriveDefaultBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000/api';
  }

  try {
    const url = new URL(window.location.href);
    const origin = url.origin.replace(/\/$/, '');
    const isLocalHost = ['localhost', '127.0.0.1'].includes(url.hostname);
    const isVitePort = ['5173', '4173', '3000', '8080'].includes(url.port);

    if (isLocalHost && (isVitePort || url.port === '')) {
      return 'http://localhost:8000/api';
    }

    return ensureApiSuffix(origin);
  } catch {
    return 'http://localhost:8000/api';
  }
};

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? deriveDefaultBaseUrl();
const API_BASE_URL = ensureApiSuffix(rawApiBaseUrl).replace(/\/$/, '');

const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch (error) {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }

    return '';
  }
})();

const METHOD_REQUIRING_CSRF = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let csrfInitialized = false;

const ensureCsrfCookie = async () => {
  if (typeof window === 'undefined') {
    return false;
  }

  if (csrfInitialized) {
    return true;
  }

  try {
    await fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, {
      credentials: 'include',
    });

    csrfInitialized = true;
    return true;
  } catch (error) {
    csrfInitialized = false;
    return false;
  }
};

const readXsrfToken = () => {
  if (typeof document === 'undefined') {
    return null;
  }

  const tokenCookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('XSRF-TOKEN='));

  if (!tokenCookie) {
    return null;
  }

  const [, value] = tokenCookie.split('=');
  return decodeURIComponent(value ?? '');
};

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
}

const buildUrl = (path: string, query?: RequestOptions['query']) => {
  const url = new URL(path.startsWith('http') ? path : `${ensureTrailingSlash(API_BASE_URL)}${path.replace(/^\//, '')}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { headers, query, ...rest } = options;
  const token = typeof window !== 'undefined'
    ? sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token')
    : null;
  const tokenType = typeof window !== 'undefined'
    ? sessionStorage.getItem('token_type') ?? localStorage.getItem('token_type') ?? 'Bearer'
    : 'Bearer';

  const isFormData = rest.body instanceof FormData;

  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
  };

  if (!isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (token) {
    requestHeaders['Authorization'] = `${tokenType} ${token}`;
  }

  const method = (rest.method ?? 'GET').toString().toUpperCase();

  if (METHOD_REQUIRING_CSRF.has(method)) {
    await ensureCsrfCookie();

    const xsrfToken = readXsrfToken();
    if (xsrfToken) {
      requestHeaders['X-XSRF-TOKEN'] = xsrfToken;
    }
  } else if (method === 'GET' && path.startsWith('/sanctum')) {
    await ensureCsrfCookie();
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      credentials: 'include',
      ...rest,
      headers: {
        ...requestHeaders,
        ...headers,
      },
    });
  } catch (networkError) {
    throw Object.assign(new Error('Gagal terhubung ke server API.'), {
      status: 0,
      data: null,
      cause: networkError,
    });
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const error = payload && typeof payload === 'object' ? payload : { message: payload };
    throw Object.assign(new Error((error as any)?.message ?? 'Request failed'), {
      status: response.status,
      data: payload,
    });
  }

  return payload as T;
};

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
  prefetchCsrf: () => ensureCsrfCookie(),
};

export type { RequestOptions };
