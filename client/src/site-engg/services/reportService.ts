import type { DailyReport } from '../types';

const API_BASE = '/api/site-engg';

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export const reportService = {
  async createReport(_engineerId: string, clientId: string, workDone: string, issues?: string, siteId?: string): Promise<DailyReport> {
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({ clientId, siteId, workDone, issues })
    });
  },

  async getReports(engineerId?: string): Promise<DailyReport[]> {
    const url = engineerId ? `/reports?engineerId=${engineerId}` : '/reports';
    return apiRequest(url);
  }
};
