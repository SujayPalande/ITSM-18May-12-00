export interface CompanyProfile {
  id: string;
  company_name: string;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  support_email: string;
  contact_number: string;
  address: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface CompanyProfileInput {
  company_name: string;
  brand_name: string;
  logo_url?: string | null;
  primary_color: string;
  secondary_color: string;
  support_email: string;
  contact_number: string;
  address: string;
}

class CompanyProfileService {
  async getCompanyProfile(): Promise<CompanyProfile | null> {
    const res = await fetch('/api/site-engg/company-profile', {
      credentials: 'include'
    });
    if (!res.ok) return null;
    return res.json();
  }

  async createCompanyProfile(profile: CompanyProfileInput, _userId: string): Promise<CompanyProfile> {
    const res = await fetch('/api/site-engg/company-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Failed to create profile');
    return res.json();
  }

  async updateCompanyProfile(_id: string, profile: Partial<CompanyProfileInput>, _userId: string): Promise<CompanyProfile> {
    const res = await fetch('/api/site-engg/company-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  }

  async uploadLogo(_file: File): Promise<string> {
    return 'https://via.placeholder.com/150';
  }

  async deleteLogo(_logoUrl: string): Promise<void> {
    // No-op
  }

  validateLogoFile(file: File): { valid: boolean; error?: string } {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload PNG or JPG images only.',
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Maximum size is 5MB.',
      };
    }

    return { valid: true };
  }

  isValidHexColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const companyProfileService = new CompanyProfileService();
