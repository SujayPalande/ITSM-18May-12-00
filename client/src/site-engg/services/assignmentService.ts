import type { Assignment } from '../types';

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

export const assignmentService = {
  async getMyAssignments(engineerId: string): Promise<Assignment[]> {
    const url = `/assignments?engineerId=${engineerId}`;
    return apiRequest(url);
  },

  async getAllAssignments(): Promise<Assignment[]> {
    return apiRequest('/assignments');
  },

  async createAssignment(data: { engineerId: string; clientId: string; siteId?: string; assignedDate: string }): Promise<Assignment> {
    return apiRequest('/assignments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
