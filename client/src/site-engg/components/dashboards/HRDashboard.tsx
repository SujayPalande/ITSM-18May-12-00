import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, Clock, Download, FileText, TrendingUp, Database,
  Mail, Send, BarChart3, Calendar, AlertCircle, ChevronLeft, ChevronRight,
  RefreshCw, LayoutDashboard,
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

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',       icon: LayoutDashboard },
  { id: 'attendance', label: 'Daily Reg.',      icon: CheckCircle },
  { id: 'muster',     label: 'Muster Roll',     icon: Calendar },
  { id: 'leave',      label: 'Leaves',          icon: Clock },
  { id: 'reports',    label: 'Reports',         icon: FileText },
  { id: 'enterprise', label: 'Enterprise',      icon: TrendingUp },
  { id: 'profiles',   label: 'Staff',           icon: Users },
];

const TH = 'px-5 py-3.5 text-left text-[10px] font-black text-white/30 uppercase tracking-widest';

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    present:   'bg-emerald-500/20 text-emerald-300',
    leave:     'bg-blue-500/20 text-blue-300',
    absent:    'bg-red-500/20 text-red-300',
    approved:  'bg-emerald-500/20 text-emerald-300',
    rejected:  'bg-red-500/20 text-red-300',
    pending:   'bg-amber-500/20 text-amber-300',
    completed: 'bg-white/10 text-white/40',
    active:    'bg-blue-500/20 text-blue-300',
  };
  return <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${cfg[status] || cfg.absent}`}>{status}</span>;
}

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
  const onLeave   = attendanceRegister.filter(r => r.status === 'leave').length;
  const absent    = attendanceRegister.filter(r => r.status === 'absent').length;

  const statBlocks = [
    { label: 'Present Today',   value: present,            icon: CheckCircle, color: 'from-emerald-500 to-emerald-700' },
    { label: 'Pending Leaves',  value: pending,            icon: Clock,       color: 'from-amber-500 to-orange-600' },
    { label: 'Total Engineers', value: engineers.length,   icon: Users,       color: 'from-blue-500 to-blue-700' },
    { label: 'Reports Today',   value: reports.length,     icon: FileText,    color: 'from-violet-500 to-violet-700' },
  ];

  const dateBar = (exportFn: () => void, emailFn: () => void, showDatePicker = true) => (
    <div className="flex flex-wrap items-center gap-2">
      {showDatePicker && (
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 outline-none focus:border-white/30 transition-all" />
      )}
      <button onClick={exportFn} className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 text-white/50 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors uppercase tracking-wider">
        <Download className="w-3.5 h-3.5" />Export
      </button>
      <button onClick={emailFn} disabled={emailSending}
        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/90 text-white rounded-xl text-xs font-bold hover:bg-emerald-400 transition-colors disabled:opacity-40 uppercase tracking-wider">
        <Send className="w-3.5 h-3.5" />{emailSending ? 'Sending...' : 'Email'}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#0a0f1e]">
      {/* ─── TOAST ─── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl border text-sm font-bold flex items-center gap-2.5 shadow-2xl ${toast.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300' : 'bg-red-950/80 border-red-500/30 text-red-300'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{toast.text}
        </div>
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className="w-56 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[#0f172a] border-r border-white/[0.06] flex flex-col z-30 overflow-y-auto">
        <div className="px-4 pt-6 pb-4">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.25em] mb-4">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === n.id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                <n.icon className={`w-4 h-4 shrink-0 ${tab === n.id ? 'text-emerald-400' : 'text-white/30'}`} />
                {n.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto px-4 pb-6 pt-4 border-t border-white/[0.06]">
          <button onClick={() => { loadData(); loadEnterprise(); }} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.06] border border-white/10 text-white/40 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-56 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4">
          <h1 className="text-lg font-black text-white tracking-tight">{NAV.find(n => n.id === tab)?.label}</h1>
          <p className="text-white/30 text-xs mt-0.5">HR Dashboard</p>
        </div>

        <div className="flex-1 p-8 space-y-8">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {statBlocks.map(s => (
              <div key={s.label} className="relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08] p-6 hover:border-white/20 transition-all">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-3xl font-black text-white tracking-tighter">{s.value}</p>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">Quick Reports</p>
                <div className="space-y-2">
                  {[
                    { label: 'Daily Attendance', sub: selectedDate, icon: CheckCircle, color: 'emerald',
                      data: () => attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, 'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-', 'Check Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-', Hours: r.hoursWorked ? r.hoursWorked.toFixed(1) : '-' })) },
                    { label: 'Leave Summary', sub: `${leaveRequests.length} requests`, icon: Calendar, color: 'amber',
                      data: () => leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Reason: l.reason, Status: l.status })) },
                    { label: 'Work Reports', sub: `${reports.length} today`, icon: FileText, color: 'violet',
                      data: () => reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone, Issues: r.issues || 'None' })) },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.05] transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-300' : item.color === 'amber' ? 'bg-amber-500/20 text-amber-300' : 'bg-violet-500/20 text-violet-300'}`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{item.label}</p>
                          <p className="text-white/30 text-xs">{item.sub}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => exportToCSV(item.data(), item.label.toLowerCase().replace(/ /g, '-'))} className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Download className="w-3.5 h-3.5" /></button>
                        <button onClick={() => sendEmail(item.label, item.data(), `${item.label} - ${selectedDate}`)} disabled={emailSending} className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors disabled:opacity-40"><Mail className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">Recent Leave Requests</p>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {leaveRequests.slice(0, 6).map(l => (
                    <div key={l.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-all">
                      <div>
                        <p className="font-bold text-white text-sm">{l.engineerName || 'Unknown'}</p>
                        <p className="text-white/30 text-xs">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</p>
                      </div>
                      <StatusPill status={l.status} />
                    </div>
                  ))}
                  {leaveRequests.length === 0 && <div className="py-10 text-center text-white/20 text-sm">No requests</div>}
                </div>
              </div>
            </div>
          )}

          {/* ── MUSTER ── */}
          {tab === 'muster' && <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white"><MusterRoll /></div>}

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-white/40 text-sm">{checkIns.length} check-ins for {new Date(selectedDate).toLocaleDateString()}</p>
                {dateBar(
                  () => exportToCSV(checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': new Date(c.checkInTime).toLocaleString(), 'Check Out': c.checkOutTime ? new Date(c.checkOutTime).toLocaleString() : '-', Date: c.date, Location: c.locationName || '-' })), `attendance-${selectedDate}`),
                  () => sendEmail('attendance', checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': c.checkInTime ? new Date(c.checkInTime).toLocaleString() : '-', Date: c.date })), `Attendance Report - ${selectedDate}`)
                )}
              </div>
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">{['Engineer','Check In','Check Out','Location','Status'].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {checkIns.map(ci => (
                      <tr key={ci.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center font-black text-white text-sm">{((ci as any).engineerName || 'U')[0].toUpperCase()}</div>
                            <span className="font-bold text-white text-sm">{(ci as any).engineerName || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-white/60 text-sm">{ci.checkInTime ? new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-5 py-4 text-white/60 text-sm">{ci.checkOutTime ? new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-5 py-4">
                          {ci.latitude && ci.longitude && parseFloat(String(ci.latitude)) !== 0 ? (
                            <a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm font-semibold">Map ↗</a>
                          ) : (ci as any).locationName ? (
                            <span className="text-white/30 text-xs truncate max-w-[140px] block">{(ci as any).locationName}</span>
                          ) : <span className="text-white/20 text-sm">—</span>}
                        </td>
                        <td className="px-5 py-4"><StatusPill status={ci.checkOutTime ? 'completed' : 'active'} /></td>
                      </tr>
                    ))}
                    {checkIns.length === 0 && <tr><td colSpan={5} className="py-16 text-center text-white/20 text-sm">No check-ins for this date</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── LEAVE ── */}
          {tab === 'leave' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-white/40 text-sm">{leaveRequests.length} total leave requests</p>
                {dateBar(
                  () => exportToCSV(leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Reason: l.reason, Status: l.status })), `leave-${new Date().toISOString().split('T')[0]}`),
                  () => sendEmail('leave', leaveRequests.map(l => ({ Engineer: l.engineerName || '', 'Start': l.startDate, 'End': l.endDate, Status: l.status })), `Leave Summary - ${new Date().toLocaleDateString()}`),
                  false
                )}
              </div>
              <div className="space-y-3">
                {leaveRequests.map(l => (
                  <div key={l.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black">{(l.engineerName || 'U')[0].toUpperCase()}</div>
                        <div>
                          <p className="font-bold text-white text-sm">{l.engineerName || 'Unknown'}</p>
                          <p className="text-white/30 text-xs">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <StatusPill status={l.status} />
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <p className="text-white/50 text-sm">{l.reason}</p>
                      {l.backupEngineerName && <p className="text-white/30 text-xs flex items-center gap-1.5"><Users className="w-3 h-3" />Backup: <span className="text-white/60 font-semibold">{l.backupEngineerName}</span></p>}
                      {l.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <select onChange={e => { if (e.target.value) handleLeave(l.id, 'approved'); }} disabled={loading}
                            className="flex-1 bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 outline-none focus:border-emerald-500/50 transition-all">
                            <option value="">Select backup & approve...</option>
                            {engineers.filter((e: any) => e.id !== l.engineerId).map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                          <button onClick={() => handleLeave(l.id, 'rejected')} disabled={loading}
                            className="px-4 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl font-bold text-sm hover:bg-red-500/30 disabled:opacity-40 transition-colors">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {leaveRequests.length === 0 && <div className="py-16 rounded-2xl border border-dashed border-white/[0.08] text-center text-white/20 text-sm">No leave requests</div>}
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-white/40 text-sm">{reports.length} reports for {new Date(selectedDate).toLocaleDateString()}</p>
                {dateBar(
                  () => exportToCSV(reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' })), `reports-${selectedDate}`),
                  () => sendEmail('daily-reports', reports.map(r => ({ Engineer: (r as any).engineerName || '', Date: r.date, 'Work Done': r.workDone })), `Daily Reports - ${selectedDate}`)
                )}
              </div>
              <div className="space-y-3">
                {reports.map(r => (
                  <div key={r.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300 font-black text-sm">{((r as any).engineerName || 'U')[0].toUpperCase()}</div>
                        <span className="font-bold text-white text-sm">{(r as any).engineerName || 'Unknown'}</span>
                        <span className="text-white/30 text-xs">→ {(r as any).clientName || ''}</span>
                      </div>
                      <span className="text-white/25 text-xs">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="px-5 py-4 space-y-2">
                      <p className="text-white/60 text-sm leading-relaxed">{r.workDone}</p>
                      {r.issues && (
                        <div className="flex gap-2.5 bg-red-950/30 rounded-xl p-3 border border-red-900/30">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-red-300/80 text-sm">{r.issues}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {reports.length === 0 && <div className="py-16 rounded-2xl border border-dashed border-white/[0.08] text-center text-white/20 text-sm">No reports for this date</div>}
              </div>
            </div>
          )}

          {/* ── CLIENTWISE ── */}
          {tab === 'clientwise' && <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white"><HRClientWiseView /></div>}

          {/* ── PROFILES ── */}
          {tab === 'profiles' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-sm">{profileTotal} engineers in directory</p>
                {profileTotal > profileLimit && (
                  <div className="flex items-center gap-3">
                    <button disabled={profilePage === 1} onClick={() => setProfilePage(p => p - 1)} className="p-2 rounded-xl border border-white/10 text-white/40 disabled:opacity-20 hover:bg-white/10 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-xs text-white/30 font-semibold">Page {profilePage} of {Math.ceil(profileTotal / profileLimit)}</span>
                    <button disabled={profilePage * profileLimit >= profileTotal} onClick={() => setProfilePage(p => p + 1)} className="p-2 rounded-xl border border-white/10 text-white/40 disabled:opacity-20 hover:bg-white/10 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white">
                <ProfileViewer engineers={engineerProfiles} />
              </div>
            </div>
          )}

          {/* ── ENTERPRISE ── */}
          {tab === 'enterprise' && (
            <div className="space-y-6">
              <div className="flex gap-1.5 flex-wrap">
                {(['daily', 'weekly', 'monthly', 'backup', 'payroll'] as const).map(t => (
                  <button key={t} onClick={() => setEnterpriseTab(t)}
                    className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${enterpriseTab === t ? 'bg-white text-slate-900' : 'bg-white/[0.06] text-white/40 hover:text-white hover:bg-white/10'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {enterpriseTab === 'daily' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-white/40 text-sm font-semibold">Daily Attendance Register</p>
                    {dateBar(
                      () => exportToCSV(attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, 'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-', 'Check Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-', Hours: r.hoursWorked ? r.hoursWorked.toFixed(1) : '-' })), `attendance-register-${selectedDate}`),
                      () => sendEmail('daily-attendance', attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, Hours: r.hoursWorked?.toFixed(1) || '-' })), `Daily Attendance - ${selectedDate}`)
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-white/[0.06]">{['Engineer','Status','Check In','Check Out','Hours'].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                      <tbody>{attendanceRegister.map(r => (
                        <tr key={r.engineerId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4 font-bold text-white text-sm">{r.engineerName}</td>
                          <td className="px-5 py-4"><StatusPill status={r.status} /></td>
                          <td className="px-5 py-4 text-white/60 text-sm">{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td className="px-5 py-4 text-white/60 text-sm">{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td className="px-5 py-4 text-white/60 text-sm font-semibold">{r.hoursWorked ? `${r.hoursWorked.toFixed(1)}h` : '—'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {enterpriseTab === 'weekly' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-white/40 text-sm font-semibold">Weekly Engineer Summary</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <input type="date" value={weeklyStart} onChange={e => setWeeklyStart(e.target.value)} className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 outline-none" />
                      <span className="text-white/20 text-sm">to</span>
                      <input type="date" value={weeklyEnd} onChange={e => setWeeklyEnd(e.target.value)} className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 outline-none" />
                      <button onClick={() => exportToCSV(engineerSummary.map(s => ({ Engineer: s.engineerName, Present: s.presentDays, Absent: s.absentDays, Leave: s.leaveDays, 'Total Hours': s.totalHours })), `weekly-${weeklyStart}-to-${weeklyEnd}`)} className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 text-white/40 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors"><Download className="w-3.5 h-3.5" />Export</button>
                      <button onClick={() => sendEmail('weekly', engineerSummary.map(s => ({ Engineer: s.engineerName, Present: s.presentDays, Absent: s.absentDays })), `Weekly Summary - ${weeklyStart} to ${weeklyEnd}`)} disabled={emailSending} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-40"><Send className="w-3.5 h-3.5" />{emailSending ? '...' : 'Email'}</button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-white/[0.06]">{['Engineer','Present','Absent','Leave','Total Hours','Avg/Day'].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                      <tbody>{engineerSummary.map(s => (
                        <tr key={s.engineerId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4 font-bold text-white text-sm">{s.engineerName}</td>
                          <td className="px-5 py-4 font-bold text-emerald-400 text-sm">{s.presentDays}</td>
                          <td className="px-5 py-4 font-bold text-red-400 text-sm">{s.absentDays}</td>
                          <td className="px-5 py-4 font-bold text-blue-400 text-sm">{s.leaveDays}</td>
                          <td className="px-5 py-4 text-white/60 text-sm">{s.totalHours}h</td>
                          <td className="px-5 py-4 text-white/60 text-sm">{s.averageHoursPerDay}h</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {enterpriseTab === 'monthly' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-white/40 text-sm font-semibold">Monthly Client Report</p>
                    <div className="flex gap-2">
                      <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 outline-none" />
                      <button onClick={() => exportToCSV(clientReports.map(r => ({ Client: r.clientName, Engineers: r.activeEngineers, 'Check-ins': r.totalCheckIns, Reports: r.totalReports })), `monthly-${selectedMonth}`)} className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 text-white/40 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors"><Download className="w-3.5 h-3.5" />Export</button>
                      <button onClick={() => sendEmail('monthly', clientReports.map(r => ({ Client: r.clientName, Engineers: r.activeEngineers })), `Monthly Report - ${selectedMonth}`)} disabled={emailSending} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-40"><Send className="w-3.5 h-3.5" />{emailSending ? '...' : 'Email'}</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clientReports.map(r => (
                      <div key={r.clientId} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-white/20 transition-all">
                        <h4 className="font-black text-white text-sm mb-4">{r.clientName}</h4>
                        <div className="space-y-2">
                          {[
                            { l: 'Sites', v: r.sitesCount, c: '' },
                            { l: 'Assignments', v: r.totalAssignments, c: '' },
                            { l: 'Active Engineers', v: r.activeEngineers, c: 'emerald' },
                            { l: 'Check-ins', v: r.totalCheckIns, c: 'blue' },
                            { l: 'Reports', v: r.totalReports, c: 'violet' },
                          ].map(item => (
                            <div key={item.l} className={`flex justify-between px-3 py-2 rounded-xl ${item.c === 'emerald' ? 'bg-emerald-500/10' : item.c === 'blue' ? 'bg-blue-500/10' : item.c === 'violet' ? 'bg-violet-500/10' : 'bg-white/[0.04]'}`}>
                              <span className={`text-xs font-semibold ${item.c === 'emerald' ? 'text-emerald-400' : item.c === 'blue' ? 'text-blue-400' : item.c === 'violet' ? 'text-violet-400' : 'text-white/40'}`}>{item.l}</span>
                              <span className={`text-sm font-black ${item.c ? (item.c === 'emerald' ? 'text-emerald-300' : item.c === 'blue' ? 'text-blue-300' : 'text-violet-300') : 'text-white'}`}>{item.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {enterpriseTab === 'backup' && backupUsage && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { l: 'Total Backups', v: backupUsage.totalBackups, icon: Database, c: 'blue' },
                      { l: 'Backup Engineers', v: backupUsage.engineersUsedAsBackup, icon: Users, c: 'violet' },
                      { l: 'Approved Leaves', v: backupUsage.approvedLeaves, icon: CheckCircle, c: 'emerald' },
                      { l: 'Coverage Rate', v: `${backupUsage.coverageRate?.toFixed(0) || 0}%`, icon: TrendingUp, c: 'amber' },
                    ].map(item => (
                      <div key={item.l} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-center">
                        <div className={`w-9 h-9 rounded-xl mx-auto mb-3 flex items-center justify-center ${item.c === 'blue' ? 'bg-blue-500/20 text-blue-300' : item.c === 'violet' ? 'bg-violet-500/20 text-violet-300' : item.c === 'emerald' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}><item.icon className="w-4 h-4" /></div>
                        <p className="text-2xl font-black text-white">{item.v}</p>
                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">{item.l}</p>
                      </div>
                    ))}
                  </div>
                  {backupUsage.topBackupEngineers?.length > 0 && (
                    <div>
                      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-3">Top Backup Engineers</p>
                      <div className="space-y-2">
                        {backupUsage.topBackupEngineers.map((e: any, i: number) => (
                          <div key={e.engineerId} className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-xs font-black text-white/50">#{i + 1}</span>
                              <span className="font-bold text-white text-sm">{e.engineerName}</span>
                            </div>
                            <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-xl">{e.backupCount}× backup</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {enterpriseTab === 'payroll' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-white/40 text-sm font-semibold">Payroll Summary</p>
                    <div className="flex gap-2">
                      <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 outline-none" />
                      <button onClick={() => { const csv = hrReportService.exportPayrollToCSV(payrollData, selectedMonth); hrReportService.downloadCSV(csv, `payroll-${selectedMonth}.csv`); }} className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] border border-white/10 text-white/40 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors"><Download className="w-3.5 h-3.5" />Export</button>
                      <button onClick={() => sendEmail('payroll', payrollData, `Payroll - ${selectedMonth}`)} disabled={emailSending} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-500/30 transition-colors disabled:opacity-40"><Send className="w-3.5 h-3.5" />{emailSending ? '...' : 'Email'}</button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-white/[0.06]">{['Engineer','Email','Working Days','Total Hours','Leave Days','Overtime'].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                      <tbody>{payrollData.map(r => (
                        <tr key={r.engineerId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4 font-bold text-white text-sm">{r.engineerName}</td>
                          <td className="px-5 py-4 text-white/40 text-xs">{r.email}</td>
                          <td className="px-5 py-4 text-white/60 text-sm">{r.workingDays}</td>
                          <td className="px-5 py-4 text-white/60 text-sm">{r.totalHours}h</td>
                          <td className="px-5 py-4 text-white/60 text-sm">{r.leaveDays}</td>
                          <td className="px-5 py-4 text-white/60 text-sm">{r.overtimeHours}h</td>
                        </tr>
                      ))}</tbody>
                    </table>
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
