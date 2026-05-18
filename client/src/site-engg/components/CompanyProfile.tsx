import { useState, useEffect, useRef } from 'react';
import { Building2, Upload, Palette, Mail, Phone, MapPin, Save, Eye } from 'lucide-react';
import { companyProfileService, CompanyProfile as CompanyProfileType } from '../services/companyProfileService';
import { useAuth } from '../contexts/AuthContext';
import { useCompanyBranding } from '../contexts/CompanyBrandingContext';

export default function CompanyProfile() {
  const { user } = useAuth();
  const { refreshBranding } = useCompanyBranding();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CompanyProfileType | null>(null);
  const [preview, setPreview] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    company_name: '',
    brand_name: '',
    logo_url: '',
    primary_color: '#2563eb',
    secondary_color: '#1e40af',
    support_email: '',
    contact_number: '',
    address: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await companyProfileService.getCompanyProfile();
      if (data) {
        setProfile(data);
        setFormData({
          company_name: data.company_name,
          brand_name: data.brand_name,
          logo_url: data.logo_url || '',
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          support_email: data.support_email,
          contact_number: data.contact_number,
          address: data.address,
        });
        setLogoPreview(data.logo_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = companyProfileService.validateLogoFile(file);
    if (!validation.valid) {
      setErrors(prev => ({ ...prev, logo: validation.error || '' }));
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setErrors(prev => ({ ...prev, logo: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (!formData.brand_name.trim()) {
      newErrors.brand_name = 'Brand name is required';
    }

    if (!companyProfileService.isValidEmail(formData.support_email)) {
      newErrors.support_email = 'Invalid email address';
    }

    if (!companyProfileService.isValidHexColor(formData.primary_color)) {
      newErrors.primary_color = 'Invalid color format (use #RRGGBB)';
    }

    if (!companyProfileService.isValidHexColor(formData.secondary_color)) {
      newErrors.secondary_color = 'Invalid color format (use #RRGGBB)';
    }

    if (!formData.contact_number.trim()) {
      newErrors.contact_number = 'Contact number is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!user) return;

    try {
      setSaving(true);

      const profileData = {
        ...formData,
        logo_url: logoPreview || null,
      };

      await fetch('/api/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      await loadProfile();
      await refreshBranding();
      alert('Company profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save company profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading company profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Company Profile & Branding</h2>
          </div>
          <button
            onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <Eye className="w-4 h-4" />
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {preview ? (
          <div className="space-y-6 p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <h3 className="text-[15px] font-semibold mb-4">Brand Preview</h3>
              {logoPreview && (
                <div className="mb-4">
                  <img src={logoPreview} alt="Logo" className="h-20 mx-auto" />
                </div>
              )}
              <div className="space-y-2">
                <h4 className="text-2xl font-bold" style={{ color: formData.primary_color }}>
                  {formData.brand_name}
                </h4>
                <p className="text-xl text-gray-700">{formData.company_name}</p>
              </div>
              <div className="mt-6 flex gap-4 justify-center">
                <div
                  className="w-24 h-24 rounded-lg flex items-center justify-center text-slate-800 font-semibold"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  Primary
                </div>
                <div
                  className="w-24 h-24 rounded-lg flex items-center justify-center text-slate-800 font-semibold"
                  style={{ backgroundColor: formData.secondary_color }}
                >
                  Secondary
                </div>
              </div>
              <div className="mt-6 text-left space-y-2 text-sm text-gray-600">
                <p><strong>Email:</strong> {formData.support_email}</p>
                <p><strong>Phone:</strong> {formData.contact_number}</p>
                <p><strong>Address:</strong> {formData.address}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600"
                  placeholder="Enter company name"
                />
                {errors.company_name && (
                  <p className="mt-1 text-sm text-red-400">{errors.company_name}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Brand Name *
                </label>
                <input
                  type="text"
                  name="brand_name"
                  value={formData.brand_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600"
                  placeholder="Enter brand name"
                />
                {errors.brand_name && (
                  <p className="mt-1 text-sm text-red-400">{errors.brand_name}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                <Upload className="w-4 h-4 inline mr-2" />
                Company Logo
              </label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <div className="w-24 h-24 border-2 border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                    <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Choose File
                  </button>
                  <p className="mt-1 text-xs text-gray-500">PNG or JPG, max 5MB</p>
                </div>
              </div>
              {errors.logo && (
                <p className="mt-1 text-sm text-red-400">{errors.logo}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-2" />
                  Primary Color *
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleInputChange}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    name="primary_color"
                    value={formData.primary_color}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600"
                    placeholder="#2563eb"
                  />
                </div>
                {errors.primary_color && (
                  <p className="mt-1 text-sm text-red-400">{errors.primary_color}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-2" />
                  Secondary Color *
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleInputChange}
                    className="w-16 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    name="secondary_color"
                    value={formData.secondary_color}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600"
                    placeholder="#1e40af"
                  />
                </div>
                {errors.secondary_color && (
                  <p className="mt-1 text-sm text-red-400">{errors.secondary_color}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Support Email *
                </label>
                <input
                  type="email"
                  name="support_email"
                  value={formData.support_email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600"
                  placeholder="support@company.com"
                />
                {errors.support_email && (
                  <p className="mt-1 text-sm text-red-400">{errors.support_email}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Contact Number *
                </label>
                <input
                  type="text"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600"
                  placeholder="+1 (555) 123-4567"
                />
                {errors.contact_number && (
                  <p className="mt-1 text-sm text-red-400">{errors.contact_number}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600"
                placeholder="Enter company address"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-400">{errors.address}</p>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-lg hover:bg-indigo-500/[0.18] disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
