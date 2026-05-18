import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Environment-aware API configuration
const isProdDomain = /(^|\.)cybaemtech\.(in|net|com)$/i.test(window.location.hostname);
const forcePhpBackend = import.meta.env.VITE_USE_PHP_BACKEND === 'true';

// Production PHP base URL
const PRODUCTION_PHP_BASE = 'https://itsm.cybaemtech.app/php';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Simplified backend detection - always use PHP for IIS deployment
function getBackendType(): 'node' | 'php' {
  return 'php';
}

export function getApiUrl(endpoint: string): string {
  const PHP_BASE = '/php'; 
  let phpEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  if (phpEndpoint.startsWith('api/')) {
    // Already has PHP extension?
    if (phpEndpoint.endsWith('.php') || phpEndpoint.includes('.php?')) {
      return `${PHP_BASE}/${phpEndpoint}`;
    }
    
    // Handle auth actions
    if (phpEndpoint === 'api/login') return `${PHP_BASE}/api/auth.php?action=login`;
    if (phpEndpoint === 'api/register') return `${PHP_BASE}/api/auth.php?action=register`;
    if (phpEndpoint === 'api/logout') return `${PHP_BASE}/api/auth.php?action=logout`;
    if (phpEndpoint === 'api/user') return `${PHP_BASE}/api/auth.php`;
    if (phpEndpoint === 'api/forgot-password') return `${PHP_BASE}/api/auth.php?action=forgot-password`;
    if (phpEndpoint === 'api/reset-password') return `${PHP_BASE}/api/auth.php?action=reset-password`;

    // Handle REST patterns
    // 1. api/tickets/my -> api/tickets.php?user=my
    if (phpEndpoint === 'api/tickets/my') {
      return `${PHP_BASE}/api/tickets.php?user=my`;
    }
    
    // 2. api/tickets/123 -> api/tickets.php?id=123
    const ticketMatch = phpEndpoint.match(/^api\/tickets\/(\d+)$/);
    if (ticketMatch) {
      return `${PHP_BASE}/api/tickets.php?id=${ticketMatch[1]}`;
    }

    // 3. api/tickets/123/comments -> api/tickets.php?action=comment&id=123
    const commentMatch = phpEndpoint.match(/^api\/tickets\/(\d+)\/comments$/);
    if (commentMatch) {
      return `${PHP_BASE}/api/tickets.php?action=comment&id=${commentMatch[1]}`;
    }
    
    // Handle domains and users entity IDs
    const entityMatch = phpEndpoint.match(/^api\/(domains|users)\/(\d+)$/);
    if (entityMatch) {
      return `${PHP_BASE}/api/${entityMatch[1]}.php?id=${entityMatch[2]}`;
    }
    
    // Also handle resource actions like /api/users/123/password
    const entityActionMatch = phpEndpoint.match(/^api\/(domains|users)\/(\d+)\/([a-zA-Z0-9-]+)$/);
    if (entityActionMatch) {
      return `${PHP_BASE}/api/${entityActionMatch[1]}.php?id=${entityActionMatch[2]}&action=${entityActionMatch[3]}`;
    }

    // Default mapping: api/tickets -> api/tickets.php
    const parts = phpEndpoint.split('?');
    const base = parts[0];
    const query = parts.length > 1 ? '?' + parts[1] : '';
    return `${PHP_BASE}/${base}.php${query}`;
  }

  return endpoint;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  isBlob: boolean = false
): Promise<Response> {
  const fullUrl = url.startsWith('/') ? getApiUrl(url) : url;

  // Handle different data types properly
  let headers: Record<string, string> = {};
  let body: BodyInit | undefined;

  if (data instanceof FormData) {
    // Don't set Content-Type for FormData - browser will set it with boundary
    body = data;
  } else if (data instanceof Blob || data instanceof File) {
    // Handle file uploads
    body = data;
  } else if (data) {
    // JSON data
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(data);
  }

  const res = await fetch(fullUrl, {
    method,
    headers,
    body,
    credentials: "include",
  });

  // Don't throw for blob responses - let the caller handle it
  if (!isBlob) {
    await throwIfResNotOk(res);
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const url = queryKey[0] as string;
      const fullUrl = url.startsWith('/') ? getApiUrl(url) : url;
      const res = await fetch(fullUrl, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
