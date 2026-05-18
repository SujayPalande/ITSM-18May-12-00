import { useState, useEffect, useRef } from 'react';
import { User, Upload, Mail, Phone, MapPin, Briefcase, Link as LinkIcon, Save, X, CheckCircle } from 'lucide-react';
import { profileService, UserProfile, ProfileUpdateInput } from '../services/profileService';
import { useAuth } from '../contexts/AuthContext';

interface ProfileEditorProps {
  onClose?: () => void;
}

export default function ProfileEditor({ onClose }: ProfileEditorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileUpdateInput>({
    full_name: '',
    phone: '',
    designation: '',
    mobile_number: '',
    alternate_number: '',
    personal_email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    date_of_birth: '',
    gender: '',
    years_of_experience: undefined,
    skills: '',
    reporting_manager: '',
    linkedin_url: '',
    portfolio_url: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProfile();
    loadManagers();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileService.getMyProfile();
      if (data) {
        setProfile(data);
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          designation: data.designation || '',
          mobile_number: data.mobile_number || '',
          alternate_number: data.alternate_number || '',
          personal_email: data.personal_email || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || '',
          pincode: data.pincode || '',
          date_of_birth: data.date_of_birth || '',
          gender: data.gender || '',
          years_of_experience: data.years_of_experience || undefined,
          skills: data.skills || '',
          reporting_manager: data.reporting_manager || '',
          linkedin_url: data.linkedin_url || '',
          portfolio_url: data.portfolio_url || '',
        });
        setPhotoPreview(data.profile_photo_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    const managersList = await profileService.getManagersList();
    setManagers(managersList);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setSaved(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = profileService.validateProfilePhoto(file);
    if (!validation.valid) {
      setErrors(prev => ({ ...prev, photo: validation.error || '' }));
      return;
    }

    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setErrors(prev => ({ ...prev, photo: '' }));
    setSaved(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name?.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (formData.personal_email && !profileService.isValidEmail(formData.personal_email)) {
      newErrors.personal_email = 'Invalid email address';
    }

    if (formData.linkedin_url && !profileService.isValidURL(formData.linkedin_url)) {
      newErrors.linkedin_url = 'Invalid URL format';
    }

    if (formData.portfolio_url && !profileService.isValidURL(formData.portfolio_url)) {
      newErrors.portfolio_url = 'Invalid URL format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!user) return;

    try {
      setSaving(true);

      let photoUrl = profile?.profile_photo_url;

      if (photoFile) {
        photoUrl = await profileService.uploadProfilePhoto(photoFile, user.id);
      }

      const updates: ProfileUpdateInput = {
        ...formData,
        profile_photo_url: photoUrl || undefined,
      };

      await profileService.updateMyProfile(updates);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isEngineer = user?.role === 'engineer';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 text-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">My Profile</h2>
                <p className="text-blue-100 mt-1">Manage your personal information (saved locally)</p>
              </div>
            </div>
            {onClose && (
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="flex items-start gap-6 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100">
            <div className="flex-shrink-0">
              {photoPreview ? (
                <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white shadow-lg">
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shadow-lg">
                  <User className="w-12 h-12 text-slate-500" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Profile Photo
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition font-medium"
              >
                Choose Photo
              </button>
              <p className="mt-2 text-xs text-slate-500">PNG or JPG, max 2MB</p>
              {errors.photo && (
                <p className="mt-1 text-sm text-red-400">{errors.photo}</p>
              )}
              <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-slate-600 flex items-center gap-2">
                  <Mail className="w-3 h-3" />
                  <strong>Email:</strong> {profile?.email}
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-2 mt-1">
                  <Briefcase className="w-3 h-3" />
                  <strong>Role:</strong> <span className="capitalize">{profile?.role}</span>
                </p>
                <p className="text-xs text-blue-600 mt-2 font-medium">These fields are read-only</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-400">{errors.full_name}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-600" />
              Contact Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Mobile Number
                </label>
                <input
                  type="text"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  placeholder="+91-9876543210"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Alternate Number
                </label>
                <input
                  type="text"
                  name="alternate_number"
                  value={formData.alternate_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  placeholder="+91-9876543210"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Work Phone
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Personal Email
                </label>
                <input
                  type="email"
                  name="personal_email"
                  value={formData.personal_email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  placeholder="personal@example.com"
                />
                {errors.personal_email && (
                  <p className="mt-1 text-sm text-red-400">{errors.personal_email}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              Address
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Address Line 1
                </label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  placeholder="Apartment, suite, etc. (optional)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-purple-600" />
              Professional Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEngineer && (
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-2">
                    Designation
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                    placeholder="Site Engineer, Senior Engineer, etc."
                  />
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  name="years_of_experience"
                  value={formData.years_of_experience || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  min="0"
                />
              </div>

              <div className={isEngineer ? 'md:col-span-1' : 'md:col-span-2'}>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Reporting Manager
                </label>
                <select
                  name="reporting_manager"
                  value={formData.reporting_manager}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                >
                  <option value="">Select manager</option>
                  {managers.map(manager => (
                    <option key={manager.id} value={manager.id}>{manager.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Skills / Expertise
                </label>
                <textarea
                  name="skills"
                  value={formData.skills}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  placeholder="e.g., Site supervision, AutoCAD, Quality control, Safety management"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-cyan-600" />
              Social & Professional Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  name="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  placeholder="https://linkedin.com/in/username"
                />
                {errors.linkedin_url && (
                  <p className="mt-1 text-sm text-red-400">{errors.linkedin_url}</p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-600 mb-2">
                  Portfolio URL
                </label>
                <input
                  type="url"
                  name="portfolio_url"
                  value={formData.portfolio_url}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-white/[0.12] focus:bg-slate-100 bg-slate-100 text-slate-600 transition-all"
                  placeholder="https://yourwebsite.com"
                />
                {errors.portfolio_url && (
                  <p className="mt-1 text-sm text-red-400">{errors.portfolio_url}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100">
            <div className="text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-xl">
              Changes are saved locally in JSON format
            </div>
            <div className="flex gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="px-6 py-3 text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition font-medium"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all shadow-md ${
                  saved 
                    ? 'bg-green-600 text-slate-800' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-slate-800 hover:from-blue-700 hover:to-blue-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
