import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, Clock, Download, FileText, TrendingUp, Database,
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
    present:   'bg-emerald-50 text-emerald-600 border border-emerald-100',
    leave:     'bg-blue-50 text-blue-600 border border-blue-100',
    absent:    'bg-red-50 text-red-600 border border-red-100',
    approved:  'bg-emerald-50 text-emerald-600 border border-emerald-100',
    rejected:  'bg-red-50 text-red-600 border border-red-100',
    pending:   'bg-amber-50 text-amber-600 border border-amber-100',
    completed: 'bg-slate-100 text-slate-500',
    active:    'bg-blue-50 text-blue-600 border border-blue-100',
  };
  return <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${cfg[status] || cfg.absent}`}>{status}</span>;
}

const F = 'w-full bg-white border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all';

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
    { label: 'Present Today',   value: present,          icon: CheckCircle, bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Pending Leaves',  value: pending,          icon: Clock,       bg: 'bg-amber-50',   iconColor: 'text-amber-600' },
    { label: 'Total Engineers', value: engineers.length, icon: Users,       bg: 'bg-blue-50',    iconColor: 'text-blue-600' },
    { label: 'Reports Today',   value: reports.length,   icon: FileText,    bg: 'bg-violet-50',  iconColor: 'text-violet-600' },
  ];

  const ActionBar = ({ exportFn, emailFn, showDate = true }: { exportFn: () => void; emailFn: () => void; showDate?: boolean }) => (
    <div className="flex flex-wrap items-center gap-2">
      {showDate && (
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition-all" />
      )}
      <button onClick={exportFn} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors">
        <Download className="w-3.5 h-3.5" />Export
      </button>
      <button onClick={emailFn} disabled={emailSending}
        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40">
        <Send className="w-3.5 h-3.5" />{emailSending ? 'Sending...' : 'Email'}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ─── TOAST ─── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl border text-sm font-semibold shadow-xl ${toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-700' : 'bg-white border-red-100 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
          {toast.text}
        </div>
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className="w-60 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-100 flex flex-col z-30 shadow-[1px_0_0_0_#f1f5f9] overflow-y-auto">
        <div className="px-3 pt-6 pb-4 flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group ${
                  tab === n.id
                    ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-[inset_2px_0_0_#059669]'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium'
                }`}>
                <n.icon className={`w-4 h-4 shrink-0 ${tab === n.id ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                <span className="truncate">{n.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="px-4 pb-6 pt-4 border-t border-slate-100">
          <button onClick={() => { loadData(); loadEnterprise(); }} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh Data
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">{NAV.find(n => n.id === tab)?.label}</h1>
          <p className="text-slate-400 text-xs mt-0.5">HR Dashboard — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="flex-1 p-8 space-y-7">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statBlocks.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 border border-slate-50">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                  <s.icon className={`w-[18px] h-[18px] ${s.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-slate-800 tracking-tight">{s.value}</p>
                <p className="text-slate-400 text-[11px] font-medium uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-4">Quick Reports</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Daily Attendance', sub: selectedDate, icon: CheckCircle, color: 'emerald',
                      data: () => attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, 'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-', 'Check Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-', Hours: r.hoursWorked ? r.hoursWorked.toFixed(1) : '-' })) },
                    { label: 'Leave Summary', sub: `${leaveRequests.length} requests`, icon: Calendar, color: 'amber',
                      data: () => leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Reason: l.reason, Status: l.status })) },
                    { label: 'Work Reports', sub: `${reports.length} today`, icon: FileText, color: 'violet',
                      data: () => reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone, Issues: r.issues || 'None' })) },
                  ].map(item => {
                    const iconBg: Record<string, string> = {
                      emerald: 'bg-emerald-50 text-emerald-600',
                      amber:   'bg-amber-50 text-amber-600',
                      violet:  'bg-violet-50 text-violet-600',
                    };
                    return (
                      <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-150">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg[item.color]}`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                            <p className="text-slate-400 text-xs">{item.sub}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => exportToCSV(item.data(), item.label.toLowerCase().replace(/ /g, '-'))} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                          <button onClick={() => sendEmail(item.label, item.data(), `${item.label} - ${selectedDate}`)} disabled={emailSending} className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors disabled:opacity-40"><Mail className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-4">Recent Leave Requests</p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {leaveRequests.slice(0, 6).map(l => (
                    <div key={l.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 transition-all">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{l.engineerName || 'Unknown'}</p>
                        <p className="text-slate-400 text-xs">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</p>
                      </div>
                      <StatusPill status={l.status} />
                    </div>
                  ))}
                  {leaveRequests.length === 0 && <div className="py-10 text-center text-slate-400 text-sm">No requests</div>}
                </div>
              </div>
            </div>
          )}

          {/* ── MUSTER ── */}
          {tab === 'muster' && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-50 overflow-hidden">
              <MusterRoll />
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-slate-500 text-sm">{checkIns.length} check-ins for {new Date(selectedDate).toLocaleDateString()}</p>
                <ActionBar
                  exportFn={() => exportToCSV(checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': new Date(c.checkInTime).toLocaleString(), 'Check Out': c.checkOutTime ? new Date(c.checkOutTime).toLocaleString() : '-', Date: c.date, Location: c.locationName || '-' })), `attendance-${selectedDate}`)}
                  emailFn={() => sendEmail('attendance', checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': c.checkInTime ? new Date(c.checkInTime).toLocaleString() : '-', Date: c.date })), `Attendance Report - ${selectedDate}`)}
                />
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Engineer','Check In','Check Out','Location','Status'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {checkIns.map(ci => (
                      <tr key={ci.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm">{((ci as any).engineerName || 'U')[0].toUpperCase()}</div>
                            <span className="font-semibold text-slate-800 text-sm">{(ci as any).engineerName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 text-sm">{ci.checkInTime ? new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-5 py-4 text-slate-500 text-sm">{ci.checkOutTime ? new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-4">
                          {ci.latitude && ci.longitude && parseFloat(String(ci.latitude)) !== 0 ? (
                            <a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs font-semibold transition-colors">
                              <MapPin className="w-3 h-3" />Map ↗
                            </a>
                          ) : (ci as any).locationName ? (
                            <span className="text-slate-400 text-xs truncate max-w-[140px] block">{(ci as any).locationName}</span>
                          ) : <span className="text-slate-300 text-sm">—</span>}
                        </td>
                        <td className="px-5 py-4"><StatusPill status={ci.checkOutTime ? 'completed' : 'active'} /></td>
                      </tr>
                    ))}
                    {checkIns.length === 0 && (
                      <tr><td colSpan={5} className="py-16 text-center text-slate-400 text-sm">No check-ins for this date</td></tr>
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
                <p className="text-slate-500 text-sm">{leaveRequests.length} total leave requests</p>
                <ActionBar
                  exportFn={() => exportToCSV(leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Reason: l.reason, Status: l.status })), `leave-${new Date().toISOString().split('T')[0]}`)}
                  emailFn={() => sendEmail('leave', leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Status: l.status })), `Leave Summary - ${new Date().toLocaleDateString()}`)}
                  showDate={false}
                />
              </div>
              <div className="space-y-3">
                {leaveRequests.map(l => (
                  <div key={l.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-slate-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all duration-150">
                    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-50 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold">{(l.engineerName || 'U')[0].toUpperCase()}</div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{l.engineerName || 'Unknown'}</p>
                          <p className="text-slate-400 text-xs">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <StatusPill status={l.status} />
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <p className="text-slate-600 text-sm">{l.reason}</p>
                      {l.backupEngineerName && <p className="text-slate-400 text-xs flex items-center gap-1.5"><Users className="w-3 h-3" />Backup: <span className="text-slate-600 font-semibold">{l.backupEngineerName}</span></p>}
                      {l.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <select onChange={e => { if (e.target.value) handleLeave(l.id, 'approved'); }} disabled={loading}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all">
                            <option value="">Select backup & approve...</option>
                            {engineers.filter((e: any) => e.id !== l.engineerId).map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                          <button onClick={() => handleLeave(l.id, 'rejected')} disabled={loading}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-semibold text-sm hover:bg-red-100 disabled:opacity-40 transition-colors">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {leaveRequests.length === 0 && (
                  <div className="py-16 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <p className="text-slate-400 text-sm font-medium">No leave requests</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-slate-500 text-sm">{reports.length} reports for {new Date(selectedDate).toLocaleDateString()}</p>
                <ActionBar
                  exportFn={() => exportToCSV(reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' })), `reports-${selectedDate}`)}
                  emailFn={() => sendEmail('daily-reports', reports.map(r => ({ Engineer: (r as any).engineerName || '', Date: r.date, 'Work Done': r.workDone })), `Daily Reports - ${selectedDate}`)}
                />
              </div>
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-violet-100 hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all duration-150">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 bg-slate-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm">{((r as any).engineerName || 'U')[0].toUpperCase()}</div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{(r as any).engineerName || 'Engineer'}</p>
                          {(r as any).clientName && <p className="text-slate-400 text-xs">{(r as any).clientName}</p>}
                        </div>
                      </div>
                      <span className="text-slate-400 text-xs">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="px-5 py-4 space-y-3">
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
                  <div className="py-16 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <p className="text-slate-400 text-sm font-medium">No reports for this date</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CLIENTWISE ── */}
          {tab === 'clientwise' && <HRClientWiseView />}

          {/* ── ENTERPRISE ── */}
          {tab === 'enterprise' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {(['daily','weekly','monthly','backup','payroll'] as const).map(t => (
                  <button key={t} onClick={() => setEnterpriseTab(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-150 ${
                      enterpriseTab === t
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}>{t}
                  </button>
                ))}
              </div>

              {enterpriseTab === 'daily' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all" />
                    <button onClick={() => exportToCSV(attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, 'Check In': r.checkInTime || '-', 'Check Out': r.checkOutTime || '-', Hours: r.hoursWorked?.toFixed(1) || '-' })), `daily-attendance-${selectedDate}`)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors">
                      <Download className="w-3.5 h-3.5" />Export
                    </button>
                  </div>
                  <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-50 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Engineer','Status','Check In','Check Out','Hours'].map(h => (
                            <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {attendanceRegister.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-4 font-semibold text-slate-800 text-sm">{r.engineerName}</td>
                            <td className="px-5 py-4"><StatusPill status={r.status} /></td>
                            <td className="px-5 py-4 text-slate-600 text-sm">{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="px-5 py-4 text-slate-500 text-sm">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="px-5 py-4 text-slate-500 text-sm">{r.hoursWorked ? `${r.hoursWorked.toFixed(1)}h` : '—'}</td>
                          </tr>
                        ))}
                        {attendanceRegister.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">No attendance data</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {enterpriseTab === 'weekly' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <div><label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block mb-1">From</label><input type="date" value={weeklyStart} onChange={e => setWeeklyStart(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none" /></div>
                    <div><label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block mb-1">To</label><input type="date" value={weeklyEnd} onChange={e => setWeeklyEnd(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none" /></div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {engineerSummary.map((s, i) => (
                      <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-200 transition-all">
                        <p className="font-semibold text-slate-800 text-sm mb-3">{s.engineerName}</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div><p className="text-lg font-bold text-slate-800">{s.presentDays}</p><p className="text-slate-400 text-[10px] uppercase tracking-wide">Present</p></div>
                          <div><p className="text-lg font-bold text-slate-800">{s.absentDays}</p><p className="text-slate-400 text-[10px] uppercase tracking-wide">Absent</p></div>
                          <div><p className="text-lg font-bold text-slate-800">{s.totalHours?.toFixed(0)}h</p><p className="text-slate-400 text-[10px] uppercase tracking-wide">Hours</p></div>
                        </div>
                      </div>
                    ))}
                    {engineerSummary.length === 0 && <div className="col-span-2 py-12 text-center text-slate-400 text-sm">No data for this period</div>}
                  </div>
                </div>
              )}

              {enterpriseTab === 'monthly' && (
                <div className="space-y-4">
                  <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none" />
                  <div className="space-y-3">
                    {clientReports.map((r, i) => (
                      <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
                        <p className="font-semibold text-slate-800 text-sm mb-2">{r.clientName}</p>
                        <div className="flex gap-6 text-sm text-slate-500">
                          <span><span className="text-slate-800 font-bold">{r.totalReports}</span> reports</span>
                          <span><span className="text-slate-800 font-bold">{r.activeEngineers}</span> engineers</span>
                        </div>
                      </div>
                    ))}
                    {clientReports.length === 0 && <div className="py-12 text-center text-slate-400 text-sm">No data for this month</div>}
                  </div>
                </div>
              )}

              {enterpriseTab === 'payroll' && (
                <div className="space-y-4">
                  <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none" />
                  <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-50 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Engineer','Days Present','Leaves','Total Hours','Overtime'].map(h => (
                            <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {payrollData.map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-4 font-semibold text-slate-800 text-sm">{p.engineerName}</td>
                            <td className="px-5 py-4 text-slate-600 text-sm">{p.workingDays}</td>
                            <td className="px-5 py-4 text-slate-500 text-sm">{p.leaveDays}</td>
                            <td className="px-5 py-4 text-slate-500 text-sm">{p.totalHours?.toFixed(0)}h</td>
                            <td className="px-5 py-4 text-slate-500 text-sm">{p.overtimeHours?.toFixed(1)}h OT</td>
                          </tr>
                        ))}
                        {payrollData.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">No payroll data</td></tr>}
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
              <p className="text-slate-500 text-sm">{profileTotal} staff members</p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {engineerProfiles.map((p: any) => (
                  <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-150">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-base">
                        {p.name?.charAt(0) || p.fullName?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{p.name || p.fullName}</p>
                        <p className="text-slate-400 text-xs">{p.designation || 'Engineer'}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-500 text-xs truncate">{p.email}</p>
                      <p className="text-slate-400 text-xs">{p.phone}</p>
                    </div>
                    <div className="mt-3">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold uppercase tracking-wide">{p.role || 'engineer'}</span>
                    </div>
                  </div>
                ))}
              </div>
              {profileTotal > profileLimit && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Page {profilePage} of {Math.ceil(profileTotal / profileLimit)}</span>
                  <div className="flex gap-2">
                    <button disabled={profilePage === 1} onClick={() => setProfilePage(p => p - 1)} className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={profilePage * profileLimit >= profileTotal} onClick={() => setProfilePage(p => p + 1)} className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
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
