// Unified API Configuration - pointed to PHP backend for IIS
const getApiBaseUrl = () => {
  return '/php/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Utility function to ensure endpoint starts with '/'
const normalizeEndpoint = (endpoint: string): string => {
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
};

// Get endpoint URL - Routes /api/users to /php/api/users.php
const getEndpointUrl = (endpoint: string): string => {
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  
  // Route specific core modules to their PHP handlers
  if (normalizedEndpoint.startsWith('/tickets')) {
    return `${API_BASE_URL}/tickets.php${normalizedEndpoint.replace('/tickets', '')}`;
  }
  if (normalizedEndpoint.startsWith('/users')) {
    return `${API_BASE_URL}/users.php${normalizedEndpoint.replace('/users', '')}`;
  }
  if (normalizedEndpoint.startsWith('/auth')) {
    return `${API_BASE_URL}/auth.php${normalizedEndpoint.replace('/auth', '')}`;
  }
  if (normalizedEndpoint.startsWith('/categories')) {
    return `${API_BASE_URL}/categories.php${normalizedEndpoint.replace('/categories', '')}`;
  }
  
  // Default: map /api/something to /php/api/something.php
  return `${API_BASE_URL}${normalizedEndpoint}.php`;
};

export const apiRequest = async (
  method: string,
  endpoint: string,
  data?: unknown
): Promise<Response> => {
  const url = getEndpointUrl(endpoint);

  
  try {
    const headers: Record<string, string> = {};
    let body: any = undefined;
    
    // Set default accept header for all requests
    headers["Accept"] = "application/json, text/csv, text/plain, */*";
    
    if (data) {
      if (data instanceof FormData) {
        // For FormData, don't set Content-Type (let browser set it with boundary)
        body = data;
      } else {
        // For JSON data, set content type and stringify
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(data);
      }
    }
    
    const res = await fetch(url, {
      method,
      headers,
      body,
      credentials: "include",
    });



    if (!res.ok) {
      const text = await res.text();

      
      try {
        const errorData = JSON.parse(text);
        const error = new Error(`${res.status}: ${errorData.message || errorData.error || res.statusText}`);
        (error as any).response = { status: res.status, data: errorData };
        throw error;
      } catch (parseError) {
        // If not JSON, use the text as is
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
    }

    return res;
  } catch (error) {

    throw error;
  }
};

export const apiGet = async (endpoint: string) => {
  const res = await apiRequest('GET', endpoint);
  return res.json();
};

export const apiPost = async (endpoint: string, data: unknown) => {
  const res = await apiRequest('POST', endpoint, data);
  return res.json();
};

export const apiPatch = async (endpoint: string, data: unknown) => {
  const res = await apiRequest('PATCH', endpoint, data);
  return res.json();
};

export const apiDelete = async (endpoint: string) => {
  const res = await apiRequest('DELETE', endpoint);
  return res.status === 204 ? null : res.json();
};

// Export a unified function that can handle all HTTP methods
export const apiCall = async (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: unknown
): Promise<any> => {
  const res = await apiRequest(method, endpoint, data);
  return res.status === 204 ? null : res.json();
};