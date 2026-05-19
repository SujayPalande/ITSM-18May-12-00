import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, XCircle, Clock, Download, FileText, TrendingUp, Database,
  Mail, Send, BarChart3, Calendar, AlertCircle, ChevronLeft, ChevronRight,
  RefreshCw, LayoutDashboard, MapPin,
} from 'lucide-react';
import { CheckIn, LeaveRequest, Engineer, DailyReport } from '../../types';
import { exportToCSV } from '../../lib/export';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { StorageService } from '../../lib/storage';
import { useAuth } from '@/hooks/use-auth';
import { hrReportService, AttendanceRecord, EngineerSummary, ClientReport, PayrollRecord } from '../../services/hrReportService';
import { profileService, UserProfile } from '../../services/profileService';
import HRClientWiseView from './HRClientWiseView';
import ProfileViewer from '../ProfileViewer';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'attendance' | 'muster' | 'leave' | 'reports' | 'clientwise' | 'enterprise' | 'profiles';

const NAV: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard, desc: 'HR summary' },
  { id: 'attendance', label: 'Daily Reg.',  icon: CheckCircle,     desc: 'Attendance register' },
  { id: 'muster',     label: 'Muster Roll', icon: Calendar,        desc: 'Monthly calendar' },
  { id: 'leave',      label: 'Leaves',      icon: Clock,           desc: 'Leave approvals' },
  { id: 'reports',    label: 'Reports',     icon: FileText,        desc: 'Work reports' },
  { id: 'enterprise', label: 'Enterprise',  icon: TrendingUp,      desc: 'Analytics & payroll' },
  { id: 'profiles',   label: 'Staff',       icon: Users,           desc: 'Engineer profiles' },
];

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    present:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    leave:     'bg-blue-100 text-blue-700 border-blue-200',
    absent:    'bg-red-100 text-red-700 border-red-200',
    approved:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected:  'bg-red-100 text-red-700 border-red-200',
    pending:   'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-slate-100 text-slate-600 border-slate-200',
    active:    'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${cfg[status] || cfg.absent}`}>
      {status}
    </span>
  );
}

const F = 'w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm';

export default function HRDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [engineerProfiles, setEngineerProfiles] = useState<UserProfile[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [emailSending, setEmailSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [enterpriseTab, setEnterpriseTab] = useState<'daily' | 'weekly' | 'monthly' | 'backup' | 'payroll'>('daily');
  const [attendanceRegister, setAttendanceRegister] = useState<AttendanceRecord[]>([]);
  const [weeklyStart, setWeeklyStart] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [weeklyEnd, setWeeklyEnd] = useState(new Date().toISOString().split('T')[0]);
  const [engineerSummary, setEngineerSummary] = useState<EngineerSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [clientReports, setClientReports] = useState<ClientReport[]>([]);
  const [backupUsage, setBackupUsage] = useState<any>(null);
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [profilePage, setProfilePage] = useState(1);
  const [profileTotal, setProfileTotal] = useState(0);
  const profileLimit = 20;
  const [backupSelections, setBackupSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
    if (tab === 'profiles') loadProfiles();
    if (tab === 'enterprise' || tab === 'overview') loadEnterprise();
  }, [tab, selectedDate, enterpriseTab, weeklyStart, weeklyEnd, selectedMonth]);

  useEffect(() => { loadProfiles(); }, [profilePage]);

  async function loadProfiles() {
    try {
      const r = await profileService.getAllEngineers(profilePage, profileLimit);
      if (Array.isArray(r)) { setEngineerProfiles(r as any); setProfileTotal(r.length); }
      else { setEngineerProfiles(r.data as any); setProfileTotal(r.total); }
    } catch (e) { console.error(e); }
  }

  async function loadData() {
    try {
      const el = await StorageService.getEngineers();
      setEngineers(Array.isArray(el) ? (el as any) : ((el as any).data || []));
      const [ci, lv, rp] = await Promise.all([checkInService.getAllCheckIns(), leaveService.getAllLeaveRequests(), reportService.getReports()]);
      setLeaveRequests(lv);
      setCheckIns(ci.filter((c: any) => c.date === selectedDate));
      setReports(rp.filter((r: any) => r.date === selectedDate));
    } catch (e) { console.error(e); }
  }

  async function loadEnterprise() {
    try {
      setLoading(true);
      if (enterpriseTab === 'daily' || tab === 'overview') setAttendanceRegister(await hrReportService.getDailyAttendanceRegister(selectedDate));
      if (enterpriseTab === 'weekly') setEngineerSummary(await hrReportService.getWeeklyEngineerSummary(weeklyStart, weeklyEnd));
      if (enterpriseTab === 'monthly') setClientReports(await hrReportService.getMonthlyClientReport(selectedMonth));
      if (enterpriseTab === 'backup') setBackupUsage(await hrReportService.getBackupUsage());
      if (enterpriseTab === 'payroll') setPayrollData(await hrReportService.getPayrollData(selectedMonth));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  function showToast(type: 'success' | 'error', text: string) { setToast({ type, text }); setTimeout(() => setToast(null), 4000); }

  async function handleLeave(id: string, status: 'approved' | 'rejected') {
    if (!user) return;
    setLoading(true);
    try {
      if (status === 'approved') await leaveService.approveLeave(id, String(user.id));
      else await leaveService.rejectLeave(id, String(user.id));
      await loadData(); alert(`Leave ${status} successfully!`);
    } catch (e: any) { alert(e.message || 'Failed'); } finally { setLoading(false); }
  }

  async function sendEmail(reportType: string, data: any[], subject: string, to?: string) {
    if (!data?.length) { alert('No data to send.'); return; }
    setEmailSending(true);
    try {
      const r = await fetch('/api/send-report-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportType, reportData: data, subject, recipientEmail: to || 'sujay.palande@cybaemtech.com' }) });
      const result = await r.json();
      if (r.ok) { showToast('success', 'Email sent!'); alert('Email sent!'); }
      else throw new Error(result.details || result.error || 'Failed');
    } catch (e: any) { showToast('error', e.message); alert(`Error: ${e.message}`); } finally { setEmailSending(false); }
  }

  const pending   = leaveRequests.filter(l => l.status === 'pending').length;
  const present   = attendanceRegister.filter(r => r.status === 'present').length;
  const absent    = attendanceRegister.filter(r => r.status === 'absent').length;

  const statBlocks = [
    { label: 'Present Today',   value: present,          icon: CheckCircle, gradient: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Pending Leaves',  value: pending,          icon: Clock,       gradient: 'from-amber-500 to-orange-500',  bg: 'bg-amber-50',   iconColor: 'text-amber-600' },
    { label: 'Total Engineers', value: engineers.length, icon: Users,       gradient: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-50',    iconColor: 'text-blue-600' },
    { label: 'Reports Today',   value: reports.length,   icon: FileText,    gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50',  iconColor: 'text-violet-600' },
  ];

  const ActionBar = ({ exportFn, emailFn, showDate = true }: { exportFn: () => void; emailFn: () => void; showDate?: boolean }) => (
    <div className="flex flex-wrap items-center gap-2">
      {showDate && (
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm" />
      )}
      <button onClick={exportFn} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
        <Download className="w-3.5 h-3.5" />Export
      </button>
      <button onClick={emailFn} disabled={emailSending}
        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-semibold hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-40 shadow-md shadow-emerald-200">
        <Send className="w-3.5 h-3.5" />{emailSending ? 'Sending...' : 'Email'}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f4f6f9]">

      {/* ─── TOAST ─── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl border text-sm font-semibold shadow-2xl ${toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
          {toast.text}
        </div>
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className="w-64 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[#0d1117] flex flex-col z-30 overflow-y-auto">
        <div className="px-3 pt-6 pb-4 flex-1">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 px-2">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-150 text-left group ${
                  tab === n.id
                    ? 'bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-900/40'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06] font-medium'
                }`}>
                <n.icon className={`w-4 h-4 shrink-0 ${tab === n.id ? 'text-white' : 'text-white/30 group-hover:text-white/70'}`} />
                <span className="truncate">{n.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="px-3 pb-6 pt-4 border-t border-white/[0.06]">
          <button onClick={() => { loadData(); loadEnterprise(); }} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white/60 hover:text-white rounded-xl text-sm font-semibold transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh Data
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-64 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-8 py-4 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">{NAV.find(n => n.id === tab)?.label}</h1>
          <p className="text-slate-400 text-xs mt-0.5 font-medium">HR Dashboard — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="flex-1 p-8 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {statBlocks.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-px transition-all duration-200 overflow-hidden relative">
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.gradient}`} />
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>
                <p className="text-3xl font-black text-slate-900 tracking-tight">{s.value}</p>
                <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-4">Quick Reports</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Daily Attendance', sub: selectedDate, icon: CheckCircle, color: 'emerald', gradient: 'from-emerald-500 to-teal-600',
                      data: () => attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, 'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-', 'Check Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-', Hours: r.hoursWorked ? r.hoursWorked.toFixed(1) : '-' })) },
                    { label: 'Leave Summary', sub: `${leaveRequests.length} requests`, icon: Calendar, color: 'amber', gradient: 'from-amber-500 to-orange-500',
                      data: () => leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Reason: l.reason, Status: l.status })) },
                    { label: 'Work Reports', sub: `${reports.length} today`, icon: FileText, color: 'violet', gradient: 'from-violet-500 to-purple-600',
                      data: () => reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone, Issues: r.issues || 'None' })) },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md hover:-translate-y-px transition-all duration-150">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-md`}>
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{item.label}</p>
                          <p className="text-slate-400 text-xs font-medium">{item.sub}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => exportToCSV(item.data(), item.label.toLowerCase().replace(/ /g, '-'))} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                        <button onClick={() => sendEmail(item.label, item.data(), `${item.label} - ${selectedDate}`)} disabled={emailSending} className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors border border-emerald-100 disabled:opacity-40"><Mail className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-4">Recent Leave Requests</p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {leaveRequests.slice(0, 6).map(l => (
                    <div key={l.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{l.engineerName || 'Unknown'}</p>
                        <p className="text-slate-400 text-xs font-medium mt-0.5">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</p>
                      </div>
                      <StatusPill status={l.status} />
                    </div>
                  ))}
                  {leaveRequests.length === 0 && <div className="py-12 text-center text-slate-400 text-sm font-medium">No requests</div>}
                </div>
              </div>
            </div>
          )}

          {/* ── MUSTER ── */}
          {tab === 'muster' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
              <MusterRoll />
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-slate-500 text-sm font-medium">{checkIns.length} check-ins for {new Date(selectedDate).toLocaleDateString()}</p>
                <ActionBar
                  exportFn={() => exportToCSV(checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': new Date(c.checkInTime).toLocaleString(), 'Check Out': c.checkOutTime ? new Date(c.checkOutTime).toLocaleString() : '-', Date: c.date, Location: c.locationName || '-' })), `attendance-${selectedDate}`)}
                  emailFn={() => sendEmail('attendance', checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': c.checkInTime ? new Date(c.checkInTime).toLocaleString() : '-', Date: c.date })), `Attendance Report - ${selectedDate}`)}
                />
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      {['Engineer','Check In','Check Out','Location','Status'].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {checkIns.map(ci => (
                      <tr key={ci.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center font-bold text-emerald-700 text-sm">{((ci as any).engineerName || 'U')[0].toUpperCase()}</div>
                            <span className="font-semibold text-slate-800 text-sm">{(ci as any).engineerName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 text-sm font-semibold">{ci.checkInTime ? new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm font-medium">{ci.checkOutTime ? new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-slate-200">—</span>}</td>
                        <td className="px-6 py-4">
                          {ci.latitude && ci.longitude && parseFloat(String(ci.latitude)) !== 0 ? (
                            <a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 text-xs font-bold transition-colors bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                              <MapPin className="w-3 h-3" />Map ↗
                            </a>
                          ) : (ci as any).locationName ? (
                            <span className="text-slate-400 text-xs truncate max-w-[140px] block font-medium">{(ci as any).locationName}</span>
                          ) : <span className="text-slate-200 text-sm">—</span>}
                        </td>
                        <td className="px-6 py-4"><StatusPill status={ci.checkOutTime ? 'completed' : 'active'} /></td>
                      </tr>
                    ))}
                    {checkIns.length === 0 && (
                      <tr><td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><CheckCircle className="w-6 h-6 text-slate-400" /></div>
                          <p className="text-slate-500 text-sm font-semibold">No check-ins for this date</p>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── LEAVE ── */}
          {tab === 'leave' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-slate-500 text-sm font-medium">{leaveRequests.length} total leave requests</p>
                <ActionBar
                  exportFn={() => exportToCSV(leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Reason: l.reason, Status: l.status })), `leave-${new Date().toISOString().split('T')[0]}`)}
                  emailFn={() => sendEmail('leave', leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Status: l.status })), `Leave Summary - ${new Date().toLocaleDateString()}`)}
                  showDate={false}
                />
              </div>
              <div className="space-y-3">
                {leaveRequests.map(l => (
                  <div key={l.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-emerald-200 hover:shadow-md transition-all duration-150">
                    <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold shadow-md shadow-amber-200">{(l.engineerName || 'U')[0].toUpperCase()}</div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{l.engineerName || 'Unknown'}</p>
                          <p className="text-slate-400 text-xs font-medium mt-0.5">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <StatusPill status={l.status} />
                    </div>
                    <div className="px-6 py-4 space-y-3">
                      <p className="text-slate-600 text-sm leading-relaxed">{l.reason}</p>
                      {l.backupEngineerName && (
                        <p className="text-slate-400 text-xs flex items-center gap-1.5 font-medium">
                          <Users className="w-3 h-3" />Backup: <span className="text-slate-700 font-bold ml-1">{l.backupEngineerName}</span>
                        </p>
                      )}
                      {l.status === 'pending' && (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select Backup Engineer</label>
                            <select
                              value={backupSelections[l.id] || ''}
                              onChange={e => setBackupSelections(prev => ({ ...prev, [l.id]: e.target.value }))}
                              className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none transition-all shadow-sm appearance-none"
                            >
                              <option value="">No backup needed</option>
                              {engineers.filter((e: any) => e.id !== l.engineerId).map((e: any) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleLeave(l.id, 'approved')} disabled={loading}
                              className="flex-1 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold border border-emerald-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5" />Approve
                            </button>
                            <button onClick={() => handleLeave(l.id, 'rejected')} disabled={loading}
                              className="flex-1 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold border border-red-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5" />Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {leaveRequests.length === 0 && (
                  <div className="py-20 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Clock className="w-6 h-6 text-slate-400" /></div>
                      <p className="text-slate-500 text-sm font-semibold">No leave requests</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-slate-500 text-sm font-medium">{reports.length} reports for {new Date(selectedDate).toLocaleDateString()}</p>
                <ActionBar
                  exportFn={() => exportToCSV(reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone, Issues: r.issues || 'None' })), `reports-${selectedDate}`)}
                  emailFn={() => sendEmail('reports', reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone })), `Work Reports - ${selectedDate}`)}
                />
              </div>
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-emerald-200 hover:shadow-md transition-all duration-150">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">{((r as any).engineerName || 'E')[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{(r as any).engineerName || 'Staff'}</p>
                        <p className="text-slate-400 text-xs font-medium">{(r as any).clientName || ''}</p>
                      </div>
                      <span className="text-slate-400 text-xs font-medium bg-slate-100 px-2.5 py-1 rounded-full">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="px-6 py-4 space-y-3">
                      <p className="text-slate-600 text-sm leading-relaxed">{r.workDone}</p>
                      {r.issues && (
                        <div className="flex gap-2.5 bg-red-50 rounded-xl p-3 border border-red-100">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-red-600 text-sm">{r.issues}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <div className="py-20 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><FileText className="w-6 h-6 text-slate-400" /></div>
                      <p className="text-slate-500 text-sm font-semibold">No reports for this date</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CLIENT WISE ── */}
          {tab === 'clientwise' && <HRClientWiseView />}

          {/* ── ENTERPRISE ── */}
          {tab === 'enterprise' && (
            <div className="space-y-5">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1.5 w-fit shadow-sm">
                {(['daily', 'weekly', 'monthly', 'backup', 'payroll'] as const).map(t => (
                  <button key={t} onClick={() => setEnterpriseTab(t)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 ${enterpriseTab === t ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {enterpriseTab === 'daily' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-slate-500 text-sm font-medium">{attendanceRegister.length} engineers for {selectedDate}</p>
                    <ActionBar
                      exportFn={() => exportToCSV(attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, Hours: r.hoursWorked?.toFixed(1) || '-' })), `daily-${selectedDate}`)}
                      emailFn={() => sendEmail('daily', attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status })), `Daily Attendance - ${selectedDate}`)}
                    />
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          {['Engineer','Status','Check In','Check Out','Hours'].map(h => (
                            <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {attendanceRegister.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{r.engineerName}</td>
                            <td className="px-6 py-4"><StatusPill status={r.status} /></td>
                            <td className="px-6 py-4 text-slate-600 text-sm font-medium">{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm font-medium">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="px-6 py-4 text-slate-500 text-sm font-semibold">{r.hoursWorked ? `${r.hoursWorked.toFixed(1)}h` : '—'}</td>
                          </tr>
                        ))}
                        {attendanceRegister.length === 0 && (
                          <tr><td colSpan={5} className="py-16 text-center text-slate-400 text-sm font-medium">No data for this date</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {enterpriseTab === 'weekly' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input type="date" value={weeklyStart} onChange={e => setWeeklyStart(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all shadow-sm" />
                      <span className="text-slate-300 font-bold">—</span>
                      <input type="date" value={weeklyEnd} onChange={e => setWeeklyEnd(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all shadow-sm" />
                    </div>
                    <button onClick={() => exportToCSV(engineerSummary.map(e => ({ Engineer: e.engineerName, Days: e.presentDays, Hours: e.totalHours?.toFixed(1) })), 'weekly-summary')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm">
                      <Download className="w-3.5 h-3.5" />Export
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          {['Engineer','Days Present','Total Hours','Avg Hours/Day'].map(h => (
                            <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {engineerSummary.map((e, i) => (
                          <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{e.engineerName}</td>
                            <td className="px-6 py-4 text-slate-700 text-sm font-bold">{e.presentDays}</td>
                            <td className="px-6 py-4 text-slate-600 text-sm font-semibold">{e.totalHours?.toFixed(1) || '—'}h</td>
                            <td className="px-6 py-4 text-slate-500 text-sm font-medium">{e.presentDays ? ((e.totalHours || 0) / e.presentDays).toFixed(1) : '—'}h</td>
                          </tr>
                        ))}
                        {engineerSummary.length === 0 && (
                          <tr><td colSpan={4} className="py-16 text-center text-slate-400 text-sm font-medium">No data for selected range</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {enterpriseTab === 'monthly' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all shadow-sm" />
                    <button onClick={() => exportToCSV(clientReports.map(c => ({ Client: c.clientName, Engineers: c.engineerCount, Reports: c.reportCount })), `monthly-${selectedMonth}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm">
                      <Download className="w-3.5 h-3.5" />Export
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {clientReports.map((c, i) => (
                      <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all">
                        <p className="font-bold text-slate-800 text-sm mb-3">{c.clientName}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-2xl font-black text-slate-900">{c.engineerCount}</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Engineers</p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                            <p className="text-2xl font-black text-emerald-700">{c.reportCount}</p>
                            <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest mt-1">Reports</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {clientReports.length === 0 && (
                      <div className="col-span-2 py-16 text-center text-slate-400 text-sm font-medium">No data for this month</div>
                    )}
                  </div>
                </div>
              )}

              {enterpriseTab === 'backup' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-4">Backup Usage</p>
                  {backupUsage ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(backupUsage).map(([k, v]) => (
                        <div key={k} className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                          <p className="text-2xl font-black text-slate-900">{String(v)}</p>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{k}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-slate-400 text-sm text-center py-8 font-medium">No backup data available</p>}
                </div>
              )}

              {enterpriseTab === 'payroll' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all shadow-sm" />
                    <button onClick={() => exportToCSV(payrollData.map(p => ({ Engineer: p.engineerName, Days: p.presentDays, Amount: p.amount })), `payroll-${selectedMonth}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all shadow-sm">
                      <Download className="w-3.5 h-3.5" />Export
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100">
                          {['Engineer','Days Present','Amount'].map(h => (
                            <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {payrollData.map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800 text-sm">{p.engineerName}</td>
                            <td className="px-6 py-4 text-slate-700 text-sm font-bold">{p.presentDays}</td>
                            <td className="px-6 py-4 text-emerald-700 text-sm font-bold">₹{p.amount?.toLocaleString() || '—'}</td>
                          </tr>
                        ))}
                        {payrollData.length === 0 && (
                          <tr><td colSpan={3} className="py-16 text-center text-slate-400 text-sm font-medium">No payroll data</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PROFILES ── */}
          {tab === 'profiles' && (
            <div className="space-y-5">
              <p className="text-slate-500 text-sm font-medium">{profileTotal} staff profiles</p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {engineerProfiles.map(ep => (
                  <div key={(ep as any).id || (ep as any).userId} className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-emerald-200 hover:shadow-md transition-all duration-150">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-emerald-200">
                        {((ep as any).name || 'E')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{(ep as any).name || 'Engineer'}</p>
                        <p className="text-slate-400 text-xs font-medium truncate">{(ep as any).email || ''}</p>
                      </div>
                    </div>
                    {(ep as any).designation && (
                      <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {(ep as any).designation}
                      </span>
                    )}
                  </div>
                ))}
                {engineerProfiles.length === 0 && (
                  <div className="col-span-3 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Users className="w-6 h-6 text-slate-400" /></div>
                      <p className="text-slate-500 text-sm font-semibold">No staff profiles</p>
                    </div>
                  </div>
                )}
              </div>
              {profileTotal > profileLimit && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Page {profilePage} of {Math.ceil(profileTotal / profileLimit)}</span>
                  <div className="flex gap-2">
                    <button disabled={profilePage === 1} onClick={() => setProfilePage(p => p - 1)} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={profilePage * profileLimit >= profileTotal} onClick={() => setProfilePage(p => p + 1)} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
