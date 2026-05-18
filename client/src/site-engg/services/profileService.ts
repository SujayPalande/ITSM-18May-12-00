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

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'engineer' | 'hr' | 'client';
  phone: string | null;
  designation: string | null;
  profile_photo_url: string | null;
  mobile_number: string | null;
  alternate_number: string | null;
  personal_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  date_of_birth: string | null;
  gender: string | null;
  years_of_experience: number | null;
  skills: string | null;
  reporting_manager: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateInput {
  full_name?: string;
  phone?: string;
  designation?: string;
  profile_photo_url?: string;
  mobile_number?: string;
  alternate_number?: string;
  personal_email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  date_of_birth?: string;
  gender?: string;
  years_of_experience?: number;
  skills?: string;
  reporting_manager?: string;
  linkedin_url?: string;
  portfolio_url?: string;
}

class ProfileService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const profiles = await apiRequest('/profiles');
      const user = profiles.find((u: any) => u.id === userId);
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name || user.name || '',
        role: user.role,
        phone: user.phone || null,
        designation: user.designation || null,
        profile_photo_url: user.profile_photo_url || null,
        mobile_number: user.mobile_number || null,
        alternate_number: user.alternate_number || null,
        personal_email: user.personal_email || null,
        address_line1: user.address_line1 || null,
        address_line2: user.address_line2 || null,
        city: user.city || null,
        state: user.state || null,
        country: user.country || null,
        pincode: user.pincode || null,
        date_of_birth: user.date_of_birth || null,
        gender: user.gender || null,
        years_of_experience: user.years_of_experience || null,
        skills: user.skills || null,
        reporting_manager: user.reporting_manager || null,
        linkedin_url: user.linkedin_url || null,
        portfolio_url: user.portfolio_url || null,
        created_at: user.created_at || '',
        updated_at: user.updated_at || '',
      };
    } catch {
      return null;
    }
  }

  async getMyProfile(): Promise<UserProfile | null> {
    try {
      const me = await apiRequest('/auth/me');
      if (!me || !me.id) return null;
      return this.getProfile(me.id);
    } catch {
      return null;
    }
  }

  async getAllEngineers(page = 0, limit = 0): Promise<UserProfile[] | { data: UserProfile[], total: number }> {
    try {
      const url = page > 0 && limit > 0 ? `/engineers?page=${page}&limit=${limit}` : '/engineers';
      const response = await apiRequest(url);
      
      const rawData = Array.isArray(response) ? response : (response.data || []);
      const total = response.total !== undefined ? response.total : rawData.length;

      const mapped = rawData.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.fullName || u.full_name || u.name || '',
        role: u.role || 'engineer',
        phone: u.phone || null,
        designation: u.designation || null,
        profile_photo_url: u.profilePhotoUrl || u.profile_photo_url || null,
        mobile_number: u.mobileNumber || u.mobile_number || null,
        alternate_number: u.alternateNumber || u.alternate_number || null,
        personal_email: u.personalEmail || u.personal_email || null,
        address_line1: u.addressLine1 || u.address_line1 || null,
        address_line2: u.addressLine2 || u.address_line2 || null,
        city: u.city || null,
        state: u.state || null,
        country: u.country || null,
        pincode: u.pincode || null,
        date_of_birth: u.dateOfBirth || u.date_of_birth || null,
        gender: u.gender || null,
        years_of_experience: u.yearsOfExperience || u.years_of_experience || null,
        skills: u.skills || null,
        reporting_manager: u.reportingManager || u.reporting_manager || null,
        linkedin_url: u.linkedinUrl || u.linkedin_url || null,
        portfolio_url: u.portfolioUrl || u.portfolio_url || null,
        created_at: u.createdAt || u.created_at || '',
        updated_at: u.updatedAt || u.updated_at || '',
        checkInTime: u.checkInTime || null,
        checkOutTime: u.checkOutTime || null,
        checkInLocation: u.checkInLocation || null,
      }));

      return Array.isArray(response) ? mapped : { data: mapped, total };
    } catch {
      return Array.isArray(page > 0) ? { data: [], total: 0 } : [];
    }
  }

  async updateProfile(userId: string, updates: ProfileUpdateInput): Promise<UserProfile> {
    const result = await apiRequest(`/profiles/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    // Refresh the profile
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error('Profile not found after update');
    return result || profile;
  }

  async updateMyProfile(updates: ProfileUpdateInput): Promise<UserProfile> {
    const profile = await this.getMyProfile();
    if (!profile) throw new Error('Not authenticated');
    return this.updateProfile(profile.id, updates);
  }

  async getManagersList(): Promise<{ id: string; name: string }[]> {
    try {
      const profiles = await apiRequest('/profiles');
      return profiles
        .filter((u: any) => u.role === 'admin' || u.role === 'hr')
        .map((u: any) => ({ id: u.id, name: u.full_name || u.name || '' }));
    } catch {
      return [];
    }
  }

  async uploadProfilePhoto(file: File, userId: string): Promise<string> {
    // Upload as base64 for now, save to profile
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          await this.updateProfile(userId, { profile_photo_url: base64 });
          resolve(base64);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async deleteProfilePhoto(_photoUrl: string): Promise<void> {
    // No-op for now
  }

  validateProfilePhoto(file: File): { valid: boolean; error?: string } {
    const maxSize = 2 * 1024 * 1024;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only PNG and JPG images are allowed' };
    }
    if (file.size > maxSize) {
      return { valid: false, error: 'Image must be less than 2MB' };
    }
    return { valid: true };
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  isValidURL(url: string): boolean {
    try { new URL(url); return true; } catch { return false; }
  }

  exportProfilesAsJson(): string {
    return '{}';
  }

  importProfilesFromJson(_jsonString: string): void {
    // No-op - data is in the DB now
  }
}

export const profileService = new ProfileService();
