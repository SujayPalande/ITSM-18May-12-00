import type { LeaveRequest } from '../types';

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

export const leaveService = {
  async getMyLeaveRequests(engineerId: string): Promise<LeaveRequest[]> {
    const url = `/leaves?engineerId=${engineerId}`;
    return apiRequest(url);
  },

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return apiRequest('/leaves');
  },

  async createLeaveRequest(_engineerId: string, startDate: string, endDate: string, reason: string): Promise<LeaveRequest> {
    return apiRequest('/leaves', {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate, reason })
    });
  },

  async approveLeave(leaveId: string, approvedBy: string, backupEngineerId?: string): Promise<LeaveRequest | null> {
    return apiRequest(`/leaves/${leaveId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvedBy, backupEngineerId })
    });
  },

  async rejectLeave(leaveId: string, rejectedBy: string): Promise<LeaveRequest | null> {
    return apiRequest(`/leaves/${leaveId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectedBy })
    });
  }
};
