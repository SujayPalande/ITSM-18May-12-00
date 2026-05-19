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
    present:   'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    leave:     'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    absent:    'bg-red-50 text-red-700 ring-1 ring-red-200',
    approved:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    rejected:  'bg-red-50 text-red-700 ring-1 ring-red-200',
    pending:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    completed: 'bg-slate-100 text-slate-500',
    active:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg[status] || cfg.absent}`}>
      {status}
    </span>
  );
}

const F = 'w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all';

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

  const pending = leaveRequests.filter(l => l.status === 'pending').length;
  const present = attendanceRegister.filter(r => r.status === 'present').length;
  const absent  = attendanceRegister.filter(r => r.status === 'absent').length;

  const statBlocks = [
    { label: 'Present Today',   value: present,          icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', desc: 'On duty today' },
    { label: 'Pending Leaves',  value: pending,          icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100',   desc: 'Awaiting approval' },
    { label: 'Total Engineers', value: engineers.length, icon: Users,       color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100',    desc: 'Registered staff' },
    { label: 'Reports Today',   value: reports.length,   icon: FileText,    color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100',  desc: 'Work logs submitted' },
  ];

  const ActionBar = ({ exportFn, emailFn, showDate = true }: { exportFn: () => void; emailFn: () => void; showDate?: boolean }) => (
    <div className="flex flex-wrap items-center gap-2">
      {showDate && (
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition-all" />
      )}
      <button onClick={exportFn} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all">
        <Download className="w-3.5 h-3.5" />Export
      </button>
      <button onClick={emailFn} disabled={emailSending}
        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-40">
        <Send className="w-3.5 h-3.5" />{emailSending ? 'Sending...' : 'Email'}
      </button>
    </div>
  );

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ─── TOAST ─── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-semibold shadow-lg ${toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' : 'bg-white border-red-200 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}
          {toast.text}
        </div>
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className="w-60 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 flex flex-col z-30 overflow-y-auto">

        <div className="px-4 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-slate-800 text-xs font-bold">HR Manager</p>
              <p className="text-slate-400 text-xs">{greeting}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 pt-4 pb-4 space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Navigation</p>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                tab === n.id
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}>
              <n.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-3 pb-5 pt-3 border-t border-slate-100">
          <button onClick={() => { loadData(); loadEnterprise(); }} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-slate-900">{NAV.find(n => n.id === tab)?.label}</h1>
              <p className="text-slate-400 text-xs mt-0.5">HR Dashboard — {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            {pending > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-700 text-xs font-semibold">{pending} leave{pending > 1 ? 's' : ''} pending</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-8 space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statBlocks.map(s => (
              <div key={s.label} className={`bg-white rounded-xl border p-5 ${s.border} flex items-center gap-4`}>
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-slate-500 text-xs font-medium mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-slate-700 text-sm font-semibold mb-3">Quick Reports</p>
                <div className="space-y-2">
                  {[
                    { label: 'Daily Attendance', sub: selectedDate, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50',
                      data: () => attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, 'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-', 'Check Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-', Hours: r.hoursWorked ? r.hoursWorked.toFixed(1) : '-' })) },
                    { label: 'Leave Summary', sub: `${leaveRequests.length} requests`, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50',
                      data: () => leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Reason: l.reason, Status: l.status })) },
                    { label: 'Work Reports', sub: `${reports.length} today`, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50',
                      data: () => reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone, Issues: r.issues || 'None' })) },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                          <p className="text-slate-400 text-xs">{item.sub}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => exportToCSV(item.data(), item.label.toLowerCase().replace(/ /g, '-'))} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                        <button onClick={() => sendEmail(item.label, item.data(), `${item.label} - ${selectedDate}`)} disabled={emailSending} className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors border border-emerald-100 disabled:opacity-40"><Mail className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-slate-700 text-sm font-semibold">Recent Leave Requests</p>
                  {pending > 0 && <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">{pending} pending</span>}
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {leaveRequests.slice(0, 6).map(l => (
                    <div key={l.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {(l.engineerName || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{l.engineerName || 'Unknown'}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <StatusPill status={l.status} />
                    </div>
                  ))}
                  {leaveRequests.length === 0 && (
                    <div className="py-10 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                      <p className="text-slate-400 text-sm font-medium">No leave requests</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── MUSTER ── */}
          {tab === 'muster' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <MusterRoll />
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-slate-800 text-sm font-bold">{checkIns.length} check-ins for {new Date(selectedDate).toLocaleDateString()}</p>
                  <p className="text-slate-400 text-xs mt-0.5">Daily attendance register</p>
                </div>
                <ActionBar
                  exportFn={() => exportToCSV(checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': new Date(c.checkInTime).toLocaleString(), 'Check Out': c.checkOutTime ? new Date(c.checkOutTime).toLocaleString() : '-', Date: c.date, Location: c.locationName || '-' })), `attendance-${selectedDate}`)}
                  emailFn={() => sendEmail('attendance', checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': c.checkInTime ? new Date(c.checkInTime).toLocaleString() : '-', Date: c.date })), `Attendance Report - ${selectedDate}`)}
                />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Engineer','Check In','Check Out','Location','Status'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {checkIns.map(ci => (
                      <tr key={ci.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-semibold text-white text-sm">{((ci as any).engineerName || 'U')[0].toUpperCase()}</div>
                            <span className="font-semibold text-slate-800 text-sm">{(ci as any).engineerName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-700 text-sm font-medium">{ci.checkInTime ? new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-5 py-4 text-slate-500 text-sm">{ci.checkOutTime ? new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-4">
                          {ci.latitude && ci.longitude && parseFloat(String(ci.latitude)) !== 0 ? (
                            <a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 w-fit">
                              <MapPin className="w-3 h-3" />Map ↗
                            </a>
                          ) : (ci as any).locationName ? (
                            <span className="text-slate-400 text-xs truncate max-w-[140px] block">{(ci as any).locationName}</span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-4"><StatusPill status={ci.checkOutTime ? 'completed' : 'active'} /></td>
                      </tr>
                    ))}
                    {checkIns.length === 0 && (
                      <tr><td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-400" /></div>
                          <p className="text-slate-500 text-sm font-medium">No check-ins for this date</p>
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
                <div>
                  <p className="text-slate-800 text-sm font-bold">{leaveRequests.length} total leave requests</p>
                  <p className="text-slate-400 text-xs mt-0.5">{pending} pending approval</p>
                </div>
                <ActionBar
                  exportFn={() => exportToCSV(leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Reason: l.reason, Status: l.status })), `leave-${new Date().toISOString().split('T')[0]}`)}
                  emailFn={() => sendEmail('leave', leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Status: l.status })), `Leave Summary - ${new Date().toLocaleDateString()}`)}
                  showDate={false}
                />
              </div>
              <div className="space-y-3">
                {leaveRequests.map(l => (
                  <div key={l.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-200 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">{(l.engineerName || 'U')[0].toUpperCase()}</div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{l.engineerName || 'Unknown'}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <StatusPill status={l.status} />
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <p className="text-slate-600 text-sm leading-relaxed">{l.reason}</p>
                      {l.backupEngineerName && (
                        <p className="text-slate-400 text-xs flex items-center gap-1.5">
                          <Users className="w-3 h-3" />Backup: <span className="text-slate-700 font-semibold ml-1">{l.backupEngineerName}</span>
                        </p>
                      )}
                      {l.status === 'pending' && (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Select Backup Engineer</label>
                            <select
                              value={backupSelections[l.id] || ''}
                              onChange={e => setBackupSelections(prev => ({ ...prev, [l.id]: e.target.value }))}
                              className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none transition-all appearance-none"
                            >
                              <option value="">No backup needed</option>
                              {engineers.filter((e: any) => e.id !== l.engineerId).map((e: any) => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleLeave(l.id, 'approved')} disabled={loading}
                              className="flex-1 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold border border-emerald-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                              <CheckCircle className="w-3.5 h-3.5" />Approve
                            </button>
                            <button onClick={() => handleLeave(l.id, 'rejected')} disabled={loading}
                              className="flex-1 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold border border-red-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5" />Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {leaveRequests.length === 0 && (
                  <div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-400" /></div>
                      <p className="text-slate-500 text-sm font-medium">No leave requests</p>
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
                <div>
                  <p className="text-slate-800 text-sm font-bold">{reports.length} reports for {new Date(selectedDate).toLocaleDateString()}</p>
                  <p className="text-slate-400 text-xs mt-0.5">Daily work logs from engineers</p>
                </div>
                <ActionBar
                  exportFn={() => exportToCSV(reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone, Issues: r.issues || 'None' })), `reports-${selectedDate}`)}
                  emailFn={() => sendEmail('reports', reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone })), `Work Reports - ${selectedDate}`)}
                />
              </div>
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-200 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold text-sm">{((r as any).engineerName || 'E')[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">{(r as any).engineerName || 'Staff'}</p>
                        <p className="text-slate-400 text-xs">{(r as any).clientName || ''}</p>
                      </div>
                      <span className="text-slate-400 text-xs">{new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="px-5 py-4 space-y-2.5">
                      <p className="text-slate-600 text-sm leading-relaxed">{r.workDone}</p>
                      {r.issues && (
                        <div className="flex gap-2 bg-red-50 rounded-lg p-3 border border-red-100">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-red-600 text-sm">{r.issues}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center"><FileText className="w-5 h-5 text-violet-400" /></div>
                      <p className="text-slate-500 text-sm font-medium">No reports for this date</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'clientwise' && <HRClientWiseView />}

          {/* ── ENTERPRISE ── */}
          {tab === 'enterprise' && (
            <div className="space-y-5">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
                {(['daily', 'weekly', 'monthly', 'backup', 'payroll'] as const).map(t => (
                  <button key={t} onClick={() => setEnterpriseTab(t)}
                    className={`px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wide transition-all ${enterpriseTab === t ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {enterpriseTab === 'daily' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-slate-600 text-sm font-medium">{attendanceRegister.length} engineers for {selectedDate}</p>
                    <ActionBar
                      exportFn={() => exportToCSV(attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, Hours: r.hoursWorked?.toFixed(1) || '-' })), `daily-${selectedDate}`)}
                      emailFn={() => sendEmail('daily', attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status })), `Daily Attendance - ${selectedDate}`)}
                    />
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {['Engineer','Status','Check In','Check Out','Hours'].map(h => (
                            <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceRegister.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 font-medium text-slate-800 text-sm">{r.engineerName}</td>
                            <td className="px-5 py-4"><StatusPill status={r.status} /></td>
                            <td className="px-5 py-4 text-slate-600 text-sm">{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="px-5 py-4 text-slate-500 text-sm">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td className="px-5 py-4 text-emerald-600 text-sm font-semibold">{r.hoursWorked ? `${r.hoursWorked.toFixed(1)}h` : '—'}</td>
                          </tr>
                        ))}
                        {attendanceRegister.length === 0 && (
                          <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">No data for this date</td></tr>
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
                      <input type="date" value={weeklyStart} onChange={e => setWeeklyStart(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all" />
                      <span className="text-slate-400">—</span>
                      <input type="date" value={weeklyEnd} onChange={e => setWeeklyEnd(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all" />
                    </div>
                    <button onClick={() => exportToCSV(engineerSummary.map(e => ({ Engineer: e.engineerName, Days: e.presentDays, Hours: e.totalHours?.toFixed(1) })), 'weekly-summary')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all">
                      <Download className="w-3.5 h-3.5" />Export
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {['Engineer','Days Present','Total Hours','Avg Hours/Day'].map(h => (
                            <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {engineerSummary.map((e, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 font-medium text-slate-800 text-sm">{e.engineerName}</td>
                            <td className="px-5 py-4 text-slate-700 text-sm font-semibold">{e.presentDays}</td>
                            <td className="px-5 py-4 text-emerald-600 text-sm font-semibold">{e.totalHours?.toFixed(1) || '—'}h</td>
                            <td className="px-5 py-4 text-slate-500 text-sm">{e.presentDays ? ((e.totalHours || 0) / e.presentDays).toFixed(1) : '—'}h</td>
                          </tr>
                        ))}
                        {engineerSummary.length === 0 && (
                          <tr><td colSpan={4} className="py-12 text-center text-slate-400 text-sm">No data for selected range</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {enterpriseTab === 'monthly' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all" />
                    <button onClick={() => exportToCSV(clientReports.map(c => ({ Client: c.clientName, Engineers: c.engineerCount, Reports: c.reportCount })), `monthly-${selectedMonth}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all">
                      <Download className="w-3.5 h-3.5" />Export
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {clientReports.map((c, i) => (
                      <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 hover:border-emerald-200 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                            {c.clientName?.[0] || 'C'}
                          </div>
                          <p className="font-semibold text-slate-800 text-sm">{c.clientName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                            <p className="text-xl font-bold text-slate-900">{c.engineerCount}</p>
                            <p className="text-slate-400 text-xs font-medium mt-0.5">Engineers</p>
                          </div>
                          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                            <p className="text-xl font-bold text-emerald-700">{c.reportCount}</p>
                            <p className="text-emerald-500 text-xs font-medium mt-0.5">Reports</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {clientReports.length === 0 && (
                      <div className="col-span-2 py-12 text-center text-slate-400 text-sm">No data for this month</div>
                    )}
                  </div>
                </div>
              )}

              {enterpriseTab === 'backup' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <p className="text-slate-700 text-sm font-semibold">Backup Usage</p>
                  </div>
                  {backupUsage ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(backupUsage).map(([k, v]) => (
                        <div key={k} className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                          <p className="text-xl font-bold text-slate-900">{String(v)}</p>
                          <p className="text-slate-400 text-xs font-medium mt-1">{k}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-slate-400 text-sm text-center py-8">No backup data available</p>}
                </div>
              )}

              {enterpriseTab === 'payroll' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all" />
                    <button onClick={() => exportToCSV(payrollData.map(p => ({ Engineer: p.engineerName, Days: p.presentDays, Amount: p.amount })), `payroll-${selectedMonth}`)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all">
                      <Download className="w-3.5 h-3.5" />Export
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          {['Engineer','Days Present','Amount'].map(h => (
                            <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payrollData.map((p, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 font-medium text-slate-800 text-sm">{p.engineerName}</td>
                            <td className="px-5 py-4 text-slate-700 text-sm font-semibold">{p.presentDays}</td>
                            <td className="px-5 py-4 text-emerald-600 text-sm font-semibold">₹{p.amount?.toLocaleString() || '—'}</td>
                          </tr>
                        ))}
                        {payrollData.length === 0 && (
                          <tr><td colSpan={3} className="py-12 text-center text-slate-400 text-sm">No payroll data</td></tr>
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
              <div>
                <p className="text-slate-800 text-sm font-bold">{profileTotal} staff profiles</p>
                <p className="text-slate-400 text-xs mt-0.5">All registered engineers and staff</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {engineerProfiles.map(ep => {
                  const role = ((ep as any).role || 'engineer').toLowerCase();
                  const roleCfg: Record<string, { bg: string; text: string; avatarBg: string }> = {
                    admin:    { bg: 'bg-violet-50', text: 'text-violet-700', avatarBg: 'bg-violet-600' },
                    engineer: { bg: 'bg-blue-50',   text: 'text-blue-700',   avatarBg: 'bg-blue-600' },
                    hr:       { bg: 'bg-emerald-50', text: 'text-emerald-700',avatarBg: 'bg-emerald-600' },
                    client:   { bg: 'bg-amber-50',  text: 'text-amber-700',  avatarBg: 'bg-amber-500' },
                  };
                  const cfg = roleCfg[role] || roleCfg.engineer;
                  return (
                    <div key={(ep as any).id || (ep as any).userId} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full ${cfg.avatarBg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                          {((ep as any).name || 'E')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{(ep as any).name || 'Staff'}</p>
                          <p className="text-slate-400 text-xs truncate">{(ep as any).email || ''}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>{role}</span>
                        {(ep as any).phone && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500">{(ep as any).phone}</span>}
                      </div>
                    </div>
                  );
                })}
                {engineerProfiles.length === 0 && (
                  <div className="col-span-3 py-16 text-center text-slate-400 text-sm">No profiles found</div>
                )}
              </div>
              {profileTotal > profileLimit && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-xs text-slate-400">{((profilePage - 1) * profileLimit) + 1}–{Math.min(profilePage * profileLimit, profileTotal)} of {profileTotal}</span>
                  <div className="flex gap-1.5">
                    <button disabled={profilePage === 1} onClick={() => setProfilePage(p => p - 1)} className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-all text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={profilePage * profileLimit >= profileTotal} onClick={() => setProfilePage(p => p + 1)} className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-all text-slate-500"><ChevronRight className="w-4 h-4" /></button>
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
