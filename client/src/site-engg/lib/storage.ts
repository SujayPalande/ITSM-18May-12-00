import type { User, Client, Site, Assignment, CheckIn, DailyReport, LeaveRequest } from '../types';

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`/api/site-engg${endpoint}`, {
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

export const StorageService = {
  getUsers: async (page = 0, limit = 0): Promise<User[] | { data: User[], total: number }> => {
    try {
      const url = page > 0 && limit > 0 ? `/profiles?page=${page}&limit=${limit}` : '/profiles';
      const res = await apiRequest(url);
      if (Array.isArray(res)) return res;
      return { data: res.data || [], total: res.total || 0 };
    } catch {
      return Array.isArray(page > 0) ? { data: [], total: 0 } : [];
    }
  },

  getEngineers: async (page = 0, limit = 0): Promise<User[] | { data: User[], total: number }> => {
    try {
      const url = page > 0 && limit > 0 ? `/engineers?page=${page}&limit=${limit}` : '/engineers';
      const res = await apiRequest(url);
      if (Array.isArray(res)) return res;
      return { data: res.data || [], total: res.total || 0 };
    } catch {
      return Array.isArray(page > 0) ? { data: [], total: 0 } : [];
    }
  },

  getClients: async (): Promise<Client[]> => {
    try {
      return await apiRequest('/clients');
    } catch {
      return [];
    }
  },

  getSites: async (): Promise<Site[]> => {
    try {
      return await apiRequest('/sites');
    } catch {
      return [];
    }
  },

  getAssignments: async (): Promise<Assignment[]> => {
    try {
      return await apiRequest('/assignments');
    } catch {
      return [];
    }
  },

  getCheckIns: async (): Promise<CheckIn[]> => {
    try {
      return await apiRequest('/check-ins');
    } catch {
      return [];
    }
  },

  getDailyReports: async (): Promise<DailyReport[]> => {
    try {
      return await apiRequest('/reports');
    } catch {
      return [];
    }
  },

  getLeaveRequests: async (): Promise<LeaveRequest[]> => {
    try {
      return await apiRequest('/leaves');
    } catch {
      return [];
    }
  },

  addUser: async (user: User) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        fullName: user.name,
        role: user.role,
        phone: user.phone,
        password: 'password123',
      }),
    });
  },

  createCheckIn: async (checkIn: Omit<CheckIn, 'id' | 'createdAt'>) => {
    return apiRequest('/check-ins', {
      method: 'POST',
      body: JSON.stringify({
        latitude: checkIn.latitude,
        longitude: checkIn.longitude,
        locationName: checkIn.locationName,
      }),
    });
  },

  updateCheckIn: async (id: string, updates: Partial<CheckIn>) => {
    if (updates.checkOutTime) {
      return apiRequest(`/check-ins/${id}/checkout`, {
        method: 'PUT',
      });
    }
    return null;
  },

  createDailyReport: async (report: Omit<DailyReport, 'id' | 'createdAt'>) => {
    return apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({
        clientId: report.clientId,
        siteId: report.siteId,
        workDone: report.workDone,
        issues: report.issues,
      }),
    });
  },

  createLeaveRequest: async (leave: Omit<LeaveRequest, 'id' | 'createdAt'>) => {
    return apiRequest('/leaves', {
      method: 'POST',
      body: JSON.stringify({
        startDate: leave.startDate,
        endDate: leave.endDate,
        reason: leave.reason,
      }),
    });
  },

  updateLeaveRequest: async (id: string, updates: Partial<LeaveRequest>) => {
    return apiRequest(`/leaves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  createAssignment: async (assignment: Omit<Assignment, 'id' | 'createdAt'>) => {
    return apiRequest('/assignments', {
      method: 'POST',
      body: JSON.stringify({
        engineerId: assignment.engineerId,
        clientId: assignment.clientId,
        siteId: assignment.siteId,
        assignedDate: assignment.assignedDate,
      }),
    });
  },

  createClient: async (client: Omit<Client, 'id' | 'createdAt'>) => {
    return apiRequest('/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: client.name,
        contactPerson: client.contactPerson,
        email: client.email,
        phone: client.phone,
        userId: client.userId,
      }),
    });
  },

  createSite: async (site: Omit<Site, 'id' | 'createdAt'>) => {
    return apiRequest('/sites', {
      method: 'POST',
      body: JSON.stringify({
        clientId: site.clientId,
        name: site.name,
        location: site.location,
      }),
    });
  },

  updateUser: async (id: string, updates: Partial<User>) => {
    return apiRequest(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteUser: async (id: string) => {
    return apiRequest(`/profiles/${id}`, {
      method: 'DELETE',
    });
  },

  updateClient: async (id: string, updates: Partial<Client>) => {
    return apiRequest(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteClient: async (id: string) => {
    return apiRequest(`/clients/${id}`, {
      method: 'DELETE',
    });
  },

  deleteAssignment: async (id: number) => {
    return apiRequest(`/assignments/${id}`, {
      method: 'DELETE',
    });
  },

  updateAssignment: async (id: number, updates: Partial<Assignment>) => {
    return apiRequest(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  notifyClients: async (engineerIds: string[]) => {
    return apiRequest('/notify-clients', {
      method: 'POST',
      body: JSON.stringify({ engineerIds }),
    });
  },
};
