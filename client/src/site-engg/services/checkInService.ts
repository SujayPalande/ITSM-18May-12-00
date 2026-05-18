import type { CheckIn } from '../types';

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

export const checkInService = {
  async getTodayCheckIn(engineerId: string): Promise<CheckIn | null> {
    const url = `/check-ins?engineerId=${engineerId}`;
    const checkIns: CheckIn[] = await apiRequest(url);
    const today = new Date().toISOString().split('T')[0];
    return checkIns.find((c: any) => c.date === today && !c.checkOutTime) || null;
  },

  async createCheckIn(engineerId: string, latitude: number, longitude: number, locationName: string, siteId?: string): Promise<CheckIn> {
    return apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({ engineerId, latitude, longitude, locationName, siteId })
    });
  },

  async checkOut(checkInId: string): Promise<CheckIn> {
    return apiRequest(`/check-ins/${checkInId}/checkout`, {
      method: 'POST'
    });
  },

  async getAllCheckIns(engineerId?: string): Promise<CheckIn[]> {
    const url = engineerId ? `/check-ins?engineerId=${engineerId}` : '/check-ins';
    return apiRequest(url);
  },
};
