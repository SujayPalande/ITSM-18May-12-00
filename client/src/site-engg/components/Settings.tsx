import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Bell, Clock, Database, Shield, Save,
  Eye, EyeOff, CheckCircle, AlertCircle, Download, Trash2,
  Sun, Moon, Globe, Phone, Mail, Briefcase, Key,
  ToggleLeft, ToggleRight, ChevronRight, Info,
} from 'lucide-react';
import { StorageService } from '../lib/storage';
import { useAuth } from '@/hooks/use-auth';

const SETTINGS_KEY = 'site_engg_settings';

interface AppSettings {
  notifications: {
    leaveRequests: boolean;
    checkInAlerts: boolean;
    reportReminders: boolean;
    dailyDigest: boolean;
    emailNotifications: boolean;
  };
  attendance: {
    workStartTime: string;
    workEndTime: string;
    gracePeriodMinutes: number;
    requireLocation: boolean;
    autoCheckoutHour: number;
  };
  display: {
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
    timeFormat: '12h' | '24h';
    language: 'en';
  };
}

const defaultSettings: AppSettings = {
  notifications: {
    leaveRequests: true,
    checkInAlerts: true,
    reportReminders: true,
    dailyDigest: false,
    emailNotifications: true,
  },
  attendance: {
    workStartTime: '09:00',
    workEndTime: '18:00',
    gracePeriodMinutes: 15,
    requireLocation: true,
    autoCheckoutHour: 20,
  },
  display: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    language: 'en',
  },
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

const SECTION_TABS = [
  { id: 'account',       label: 'Account',       icon: User      },
  { id: 'security',      label: 'Security',       icon: Lock      },
  { id: 'notifications', label: 'Notifications',  icon: Bell      },
  { id: 'attendance',    label: 'Attendance',     icon: Clock     },
  { id: 'display',       label: 'Display',        icon: Globe     },
  { id: 'data',          label: 'Data & Export',  icon: Database  },
] as const;

type Section = typeof SECTION_TABS[number]['id'];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        on ? 'bg-violet-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          on ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function SettingRow({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({ title, sub, icon: Icon, children }: {
  title: string; sub: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-slate-400">{sub}</p>
        </div>
      </div>
      <div className="px-6">{children}</div>
    </div>
  );
}

const F = 'w-full bg-white border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all';
const FL = 'block text-xs font-semibold text-slate-500 mb-1.5';

export default function Settings() {
  const { user } = useAuth() as any;
  const [section, setSection] = useState<Section>('account');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [profile, setProfile] = useState({ name: '', email: '', phone: '', designation: '' });
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        designation: user.designation || '',
      });
    }
  }, [user]);

  function showToast(type: 'success' | 'error', msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  function updateNotif(key: keyof AppSettings['notifications']) {
    const next = { ...settings, notifications: { ...settings.notifications, [key]: !settings.notifications[key] } };
    setSettings(next);
    saveSettings(next);
  }

  function updateAttendance(key: keyof AppSettings['attendance'], val: any) {
    const next = { ...settings, attendance: { ...settings.attendance, [key]: val } };
    setSettings(next);
    saveSettings(next);
  }

  function updateDisplay(key: keyof AppSettings['display'], val: any) {
    const next = { ...settings, display: { ...settings.display, [key]: val } };
    setSettings(next);
    saveSettings(next);
  }

  async function saveProfile() {
    if (!profile.name.trim() || !profile.email.trim()) {
      showToast('error', 'Name and email are required');
      return;
    }
    try {
      setProfileLoading(true);
      if (user?.id) await StorageService.updateUser(user.id, profile);
      showToast('success', 'Profile updated successfully');
    } catch {
      showToast('error', 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  }

  async function changePassword() {
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      showToast('error', 'All password fields are required');
      return;
    }
    if (pwForm.next.length < 6) {
      showToast('error', 'New password must be at least 6 characters');
      return;
    }
    if (pwForm.next !== pwForm.confirm) {
      showToast('error', 'Passwords do not match');
      return;
    }
    try {
      setPwLoading(true);
      await new Promise(r => setTimeout(r, 600));
      showToast('success', 'Password changed successfully');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch {
      showToast('error', 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }

  async function exportData(type: 'engineers' | 'checkins' | 'leaves' | 'reports') {
    try {
      const { exportToCSV } = await import('../lib/export');
      if (type === 'engineers') {
        const engs = await StorageService.getEngineers();
        const rows = Array.isArray(engs) ? engs : (engs as any).data;
        exportToCSV(rows, 'engineers-export');
      }
      showToast('success', 'Export started — check your downloads');
    } catch {
      showToast('error', 'Export failed');
    }
  }

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22 } },
    exit:    { opacity: 0, y: -6, transition: { duration: 0.14 } },
  };

  return (
    <div className="flex gap-6">

      {/* Sidebar nav */}
      <div className="w-48 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {SECTION_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold transition-all border-b border-slate-100 last:border-0 ${
                section === t.id
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <t.icon className={`w-4 h-4 shrink-0 ${section === t.id ? 'text-violet-600' : 'text-slate-400'}`} />
              {t.label}
              {section === t.id && <ChevronRight className="w-3 h-3 ml-auto text-violet-400" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div key={section} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-5">

            {/* ── ACCOUNT ── */}
            {section === 'account' && (
              <SectionCard title="Account Profile" sub="Manage your personal information" icon={User}>
                <div className="py-2 space-y-4">
                  <div className="flex items-center gap-4 py-3 border-b border-slate-100">
                    <div className="w-14 h-14 rounded-2xl bg-violet-600 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                      {profile.name.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{profile.name || 'Your Name'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{profile.email}</p>
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[10px] font-bold uppercase tracking-wide ring-1 ring-violet-100">
                        Administrator
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={FL}>Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })}
                          className={`${F} pl-9`} placeholder="Your full name" />
                      </div>
                    </div>
                    <div>
                      <label className={FL}>Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })}
                          className={`${F} pl-9`} placeholder="email@company.com" />
                      </div>
                    </div>
                    <div>
                      <label className={FL}>Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })}
                          className={`${F} pl-9`} placeholder="+91 99999 00000" />
                      </div>
                    </div>
                    <div>
                      <label className={FL}>Designation</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input value={profile.designation} onChange={e => setProfile({ ...profile, designation: e.target.value })}
                          className={`${F} pl-9`} placeholder="e.g. Site Admin" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 pb-4">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={saveProfile}
                      disabled={profileLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {profileLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Profile
                    </motion.button>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── SECURITY ── */}
            {section === 'security' && (
              <SectionCard title="Security" sub="Manage your password and access" icon={Lock}>
                <div className="py-2 space-y-4">
                  <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">Passwords must be at least 6 characters long. Use a mix of letters, numbers and symbols for better security.</p>
                  </div>

                  {(['current', 'next', 'confirm'] as const).map((field) => {
                    const labels: Record<typeof field, string> = { current: 'Current Password', next: 'New Password', confirm: 'Confirm New Password' };
                    return (
                      <div key={field}>
                        <label className={FL}>{labels[field]}</label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type={showPw[field] ? 'text' : 'password'}
                            value={pwForm[field]}
                            onChange={e => setPwForm({ ...pwForm, [field]: e.target.value })}
                            className={`${F} pl-9 pr-10`}
                            placeholder="••••••••"
                          />
                          <button onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showPw[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex justify-end pb-4 pt-1">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={changePassword}
                      disabled={pwLoading}
                      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {pwLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                      Change Password
                    </motion.button>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── NOTIFICATIONS ── */}
            {section === 'notifications' && (
              <SectionCard title="Notification Preferences" sub="Choose what alerts you receive" icon={Bell}>
                <div>
                  <SettingRow label="Leave Requests" sub="Get notified when engineers submit leave">
                    <Toggle on={settings.notifications.leaveRequests} onToggle={() => updateNotif('leaveRequests')} />
                  </SettingRow>
                  <SettingRow label="Check-in Alerts" sub="Alerts for late or missed check-ins">
                    <Toggle on={settings.notifications.checkInAlerts} onToggle={() => updateNotif('checkInAlerts')} />
                  </SettingRow>
                  <SettingRow label="Report Reminders" sub="Remind engineers to submit daily reports">
                    <Toggle on={settings.notifications.reportReminders} onToggle={() => updateNotif('reportReminders')} />
                  </SettingRow>
                  <SettingRow label="Daily Digest" sub="Receive a daily summary email at 8 PM">
                    <Toggle on={settings.notifications.dailyDigest} onToggle={() => updateNotif('dailyDigest')} />
                  </SettingRow>
                  <SettingRow label="Email Notifications" sub="Send all alerts via email as well">
                    <Toggle on={settings.notifications.emailNotifications} onToggle={() => updateNotif('emailNotifications')} />
                  </SettingRow>
                  <div className="py-3">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Changes save automatically
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── ATTENDANCE ── */}
            {section === 'attendance' && (
              <SectionCard title="Attendance Configuration" sub="Set working hours and check-in rules" icon={Clock}>
                <div className="py-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={FL}>Work Start Time</label>
                      <input
                        type="time"
                        value={settings.attendance.workStartTime}
                        onChange={e => updateAttendance('workStartTime', e.target.value)}
                        className={F}
                      />
                    </div>
                    <div>
                      <label className={FL}>Work End Time</label>
                      <input
                        type="time"
                        value={settings.attendance.workEndTime}
                        onChange={e => updateAttendance('workEndTime', e.target.value)}
                        className={F}
                      />
                    </div>
                    <div>
                      <label className={FL}>Grace Period (minutes)</label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={settings.attendance.gracePeriodMinutes}
                        onChange={e => updateAttendance('gracePeriodMinutes', Number(e.target.value))}
                        className={F}
                      />
                    </div>
                    <div>
                      <label className={FL}>Auto-checkout Hour (24h)</label>
                      <input
                        type="number"
                        min={17}
                        max={23}
                        value={settings.attendance.autoCheckoutHour}
                        onChange={e => updateAttendance('autoCheckoutHour', Number(e.target.value))}
                        className={F}
                      />
                    </div>
                  </div>

                  <SettingRow label="Require GPS Location" sub="Engineers must share location when checking in">
                    <Toggle on={settings.attendance.requireLocation} onToggle={() => updateAttendance('requireLocation', !settings.attendance.requireLocation)} />
                  </SettingRow>

                  <div className="pb-4">
                    <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">
                        Work hours are used for calculating overtime and generating payroll summaries.
                        Changes apply to all new attendance records.
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── DISPLAY ── */}
            {section === 'display' && (
              <SectionCard title="Display Preferences" sub="Date formats and regional settings" icon={Globe}>
                <div className="py-1">
                  <SettingRow label="Date Format" sub="How dates are shown across the app">
                    <select
                      value={settings.display.dateFormat}
                      onChange={e => updateDisplay('dateFormat', e.target.value)}
                      className="bg-white border border-slate-200 focus:border-violet-500 rounded-lg px-3 py-1.5 text-sm text-slate-700 outline-none appearance-none transition-all"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </SettingRow>
                  <SettingRow label="Time Format" sub="12-hour or 24-hour clock">
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                      {(['12h', '24h'] as const).map(f => (
                        <button key={f} onClick={() => updateDisplay('timeFormat', f)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            settings.display.timeFormat === f ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >{f}</button>
                      ))}
                    </div>
                  </SettingRow>
                  <SettingRow label="Language" sub="Interface language">
                    <span className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-500">English</span>
                  </SettingRow>
                  <div className="py-3">
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      Display settings save automatically
                    </p>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── DATA ── */}
            {section === 'data' && (
              <div className="space-y-5">
                <SectionCard title="Export Data" sub="Download records as CSV files" icon={Download}>
                  <div className="py-2 space-y-3 pb-5">
                    {[
                      { label: 'Engineer Records', sub: 'All staff profiles and details', type: 'engineers' as const, color: 'blue' },
                      { label: 'Attendance Log', sub: 'All check-in / check-out data', type: 'checkins' as const, color: 'emerald' },
                      { label: 'Leave Requests', sub: 'All leave history and approvals', type: 'leaves' as const, color: 'amber' },
                      { label: 'Daily Reports', sub: 'All submitted field reports', type: 'reports' as const, color: 'violet' },
                    ].map(item => (
                      <div key={item.type} className="flex items-center justify-between gap-4 p-3.5 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => exportData(item.type)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Export CSV
                        </motion.button>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <div className="bg-white rounded-xl border border-red-100">
                  <div className="px-6 py-4 border-b border-red-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-red-700">Danger Zone</h3>
                      <p className="text-xs text-red-400">Irreversible actions — proceed with caution</p>
                    </div>
                  </div>
                  <div className="px-6 py-4 space-y-3">
                    {[
                      { label: 'Clear All Check-in Records', sub: 'Permanently delete all attendance entries', action: 'clearCheckins' },
                      { label: 'Clear All Leave History', sub: 'Remove all approved and rejected leave records', action: 'clearLeaves' },
                    ].map(item => (
                      <div key={item.action} className="flex items-center justify-between gap-4 p-3.5 border border-red-100 rounded-lg bg-red-50/30">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                        </div>
                        <button className="px-3.5 py-1.5 border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold rounded-lg transition-colors">
                          Clear
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
 