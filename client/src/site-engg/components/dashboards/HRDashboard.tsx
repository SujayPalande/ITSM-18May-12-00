import { useState, useEffect } from 'react';
import {
  Users, CheckCircle, Clock, Download, FileText, TrendingUp, Database, Mail, Send,
  BarChart3, Calendar, AlertCircle, ChevronLeft, ChevronRight, RefreshCw,
  LayoutDashboard,
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

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',        icon: LayoutDashboard },
  { id: 'attendance',  label: 'D. Registration', icon: CheckCircle },
  { id: 'muster',      label: 'Muster Roll',      icon: Calendar },
  { id: 'leave',       label: 'Leaves',           icon: Clock },
  { id: 'reports',     label: 'Reports',          icon: FileText },
  { id: 'enterprise',  label: 'Enterprise',       icon: TrendingUp },
  { id: 'profiles',    label: 'Staff',            icon: Users },
];

const TH = 'px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider';
const TD = 'px-4 py-3';

function Badge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    present:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    leave:     'bg-blue-100 text-blue-700 border-blue-200',
    absent:    'bg-red-100 text-red-700 border-red-200',
    approved:  'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected:  'bg-red-100 text-red-700 border-red-200',
    pending:   'bg-amber-100 text-amber-700 border-amber-200',
    completed: 'bg-gray-100 text-gray-600 border-gray-200',
    active:    'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${cfg[status] || cfg.absent}`}>
      {status}
    </span>
  );
}

export default function HRDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [engineerProfiles, setEngineerProfiles] = useState<UserProfile[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
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
    if (activeTab === 'profiles') loadEngineerProfiles();
    if (activeTab === 'enterprise' || activeTab === 'overview') loadEnterpriseReports();
  }, [activeTab, selectedDate, enterpriseTab, weeklyStart, weeklyEnd, selectedMonth]);

  useEffect(() => { loadEngineerProfiles(); }, [profilePage]);

  async function loadEngineerProfiles() {
    try {
      const response = await profileService.getAllEngineers(profilePage, profileLimit);
      if (Array.isArray(response)) { setEngineerProfiles(response as any); setProfileTotal(response.length); }
      else { setEngineerProfiles(response.data as any); setProfileTotal(response.total); }
    } catch (error) { console.error('Error loading engineer profiles:', error); }
  }

  async function loadData() {
    try {
      const engineersList = await StorageService.getEngineers();
      setEngineers(Array.isArray(engineersList) ? (engineersList as any) : ((engineersList as any).data || []));
      const [checkInsList, leavesList, reportsList] = await Promise.all([
        checkInService.getAllCheckIns(),
        leaveService.getAllLeaveRequests(),
        reportService.getReports(),
      ]);
      setLeaveRequests(leavesList);
      setCheckIns(checkInsList.filter((c: any) => c.date === selectedDate));
      setReports(reportsList.filter((r: any) => r.date === selectedDate));
    } catch (error) { console.error('Error loading data:', error); }
  }

  async function loadEnterpriseReports() {
    try {
      setLoading(true);
      if (enterpriseTab === 'daily' || activeTab === 'overview') setAttendanceRegister(await hrReportService.getDailyAttendanceRegister(selectedDate));
      if (enterpriseTab === 'weekly') setEngineerSummary(await hrReportService.getWeeklyEngineerSummary(weeklyStart, weeklyEnd));
      if (enterpriseTab === 'monthly') setClientReports(await hrReportService.getMonthlyClientReport(selectedMonth));
      if (enterpriseTab === 'backup') setBackupUsage(await hrReportService.getBackupUsage());
      if (enterpriseTab === 'payroll') setPayrollData(await hrReportService.getPayrollData(selectedMonth));
    } catch (error) { console.error('Error loading enterprise reports:', error); }
    finally { setLoading(false); }
  }

  async function handleLeaveAction(leaveId: string, status: 'approved' | 'rejected', backupEngineerId?: string) {
    if (!user) return;
    setLoading(true);
    try {
      if (status === 'approved') await leaveService.approveLeave(leaveId, String(user.id));
      else await leaveService.rejectLeave(leaveId, String(user.id));
      await loadData();
      alert(`Leave request ${status} successfully!`);
    } catch (error: any) { alert(error.message || 'Failed to update leave request'); }
    finally { setLoading(false); }
  }

  async function sendReportEmail(reportType: string, reportData: any[], subject: string, recipientEmail?: string) {
    if (!reportData || reportData.length === 0) { alert('No data available to send.'); return; }
    setEmailSending(true); setEmailError(null); setEmailSuccess(null);
    try {
      const response = await fetch('/api/send-report-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, reportData, subject, recipientEmail: recipientEmail || 'sujay.palande@cybaemtech.com' }),
      });
      const result = await response.json();
      if (response.ok) { setEmailSuccess('Report email sent successfully!'); alert('Report email sent successfully!'); }
      else throw new Error(result.details || result.error || 'Failed to send email');
    } catch (error: any) { setEmailError(error.message); alert(`Error sending email: ${error.message}`); }
    finally { setEmailSending(false); }
  }

  function exportPayrollCSV() {
    const csv = hrReportService.exportPayrollToCSV(payrollData, selectedMonth);
    hrReportService.downloadCSV(csv, `payroll-${selectedMonth}.csv`);
  }

  const pendingLeaves   = leaveRequests.filter(l => l.status === 'pending').length;
  const presentToday    = attendanceRegister.filter(r => r.status === 'present').length;
  const onLeaveToday    = attendanceRegister.filter(r => r.status === 'leave').length;
  const absentToday     = attendanceRegister.filter(r => r.status === 'absent').length;

  const statCards = [
    { label: 'Present Today',   value: presentToday,    icon: CheckCircle, accent: 'emerald', onClick: () => setActiveTab('attendance') },
    { label: 'Pending Leaves',  value: pendingLeaves,   icon: Clock,       accent: 'amber',   onClick: () => setActiveTab('leave') },
    { label: 'Total Engineers', value: engineers.length, icon: Users,       accent: 'blue',    onClick: () => setActiveTab('profiles') },
    { label: 'Reports Today',   value: reports.length,  icon: FileText,    accent: 'violet',  onClick: () => setActiveTab('reports') },
  ];
  const accentMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
    blue:    'bg-blue-50 text-blue-600 border-blue-100',
    violet:  'bg-violet-50 text-violet-600 border-violet-100',
  };

  const DateBar = ({ onExport, onEmail, exportData, exportName }: { onExport: () => void; onEmail: () => void; exportData: any[]; exportName: string }) => (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition-all" />
      <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
        <Download className="w-3.5 h-3.5" />Export
      </button>
      <button onClick={onEmail} disabled={emailSending}
        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
        <Send className="w-3.5 h-3.5" />{emailSending ? 'Sending...' : 'Email'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toasts */}
      {emailSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-50 text-emerald-800 border border-emerald-200 px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2.5 text-sm font-semibold">
          <CheckCircle className="w-4 h-4" />{emailSuccess}
        </div>
      )}
      {emailError && (
        <div className="fixed top-4 right-4 z-50 bg-red-50 text-red-800 border border-red-200 px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2.5 text-sm font-semibold">
          <AlertCircle className="w-4 h-4" />{emailError}
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">HR Dashboard</h1>
                <p className="text-gray-400 text-sm mt-0.5">Attendance, leaves & enterprise reports</p>
              </div>
            </div>
            <button onClick={() => loadData()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6 space-y-6">

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <button key={s.label} onClick={s.onClick}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left group">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${accentMap[s.accent]}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5 uppercase tracking-wide">{s.label}</p>
              {s.accent === 'amber' && <p className="text-[11px] text-gray-400 mt-1">{onLeaveToday} on leave today</p>}
              {s.accent === 'blue'  && <p className="text-[11px] text-red-400 mt-1">{absentToday} absent today</p>}
            </button>
          ))}
        </div>

        {/* TABS PANEL */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-2 pt-2 flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="grid gap-5 lg:grid-cols-2">
                {/* Quick Reports */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-gray-400" />Quick Reports</h3>
                    <button onClick={() => setActiveTab('enterprise')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">View all →</button>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Daily Attendance Report', sub: selectedDate, icon: CheckCircle, color: 'emerald',
                        data: () => attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, 'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-', 'Check Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-', Hours: r.hoursWorked ? r.hoursWorked.toFixed(1) : '-' })) },
                      { label: 'Leave Summary Report', sub: `${leaveRequests.length} total requests`, icon: Calendar, color: 'amber',
                        data: () => leaveRequests.map(l => ({ Engineer: l.engineerName || 'Unknown', 'Start Date': l.startDate, 'End Date': l.endDate, Reason: l.reason, Status: l.status, Backup: l.backupEngineerName || '-' })) },
                      { label: 'Daily Work Reports', sub: `${reports.length} reports today`, icon: FileText, color: 'violet',
                        data: () => reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone, Issues: r.issues || 'None' })) },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                            item.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            item.color === 'amber'   ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-violet-50 text-violet-600 border-violet-100'
                          }`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => exportToCSV(item.data(), item.label.toLowerCase().replace(/ /g, '-'))}
                            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors"><Download className="w-3.5 h-3.5" /></button>
                          <button onClick={() => sendReportEmail(item.label, item.data(), `${item.label} - ${selectedDate}`)} disabled={emailSending}
                            className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"><Mail className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Leave Requests */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <h3 className="font-bold text-gray-900 text-sm">Recent Leave Requests</h3>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {leaveRequests.slice(0, 5).map(leave => (
                      <div key={leave.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{leave.engineerName || 'Unknown'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge status={leave.status} />
                      </div>
                    ))}
                    {leaveRequests.length === 0 && (
                      <div className="py-8 text-center text-gray-400 text-sm">No leave requests found</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MUSTER */}
            {activeTab === 'muster' && <MusterRoll />}

            {/* ATTENDANCE */}
            {activeTab === 'attendance' && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4 text-gray-400" />Attendance Register</h3>
                  <DateBar
                    onExport={() => exportToCSV(checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': new Date(c.checkInTime).toLocaleString(), 'Check Out': c.checkOutTime ? new Date(c.checkOutTime).toLocaleString() : '-', Date: c.date, Location: c.locationName || '-' })), `attendance-${selectedDate}`)}
                    onEmail={() => sendReportEmail('attendance', checkIns.map(c => ({ Engineer: (c as any).engineerName || '', 'Check In': c.checkInTime ? new Date(c.checkInTime).toLocaleString() : '-', 'Check Out': c.checkOutTime ? new Date(c.checkOutTime).toLocaleString() : '-', Date: c.date, Location: c.locationName || '-' })), `Attendance Report - ${selectedDate}`)}
                    exportData={[]}
                    exportName=""
                  />
                </div>
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>{['Engineer', 'Check In', 'Check Out', 'Location', 'Status'].map(h => <th key={h} className={TH}>{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {checkIns.map(checkIn => (
                        <tr key={checkIn.id} className="hover:bg-gray-50 transition-colors">
                          <td className={TD}>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-sm">
                                {((checkIn as any).engineerName || 'U')[0].toUpperCase()}
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{(checkIn as any).engineerName || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className={TD + ' text-sm text-gray-600'}>{checkIn.checkInTime ? new Date(checkIn.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td className={TD + ' text-sm text-gray-600'}>{checkIn.checkOutTime ? new Date(checkIn.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td className={TD}>
                            {checkIn.latitude && checkIn.longitude && parseFloat(String(checkIn.latitude)) !== 0 && parseFloat(String(checkIn.longitude)) !== 0 ? (
                              <a href={`https://www.google.com/maps?q=${checkIn.latitude},${checkIn.longitude}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm font-medium">View Map</a>
                            ) : (checkIn as any).location_name || checkIn.locationName ? (
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((checkIn as any).location_name || checkIn.locationName)}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline text-sm font-medium">{(checkIn as any).location_name || checkIn.locationName}</a>
                            ) : <span className="text-gray-400 text-sm italic">No location</span>}
                          </td>
                          <td className={TD}><Badge status={checkIn.checkOutTime ? 'completed' : 'active'} /></td>
                        </tr>
                      ))}
                      {checkIns.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">No check-ins for this date</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* LEAVE */}
            {activeTab === 'leave' && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />Leave Requests</h3>
                  <div className="flex gap-2">
                    <button onClick={() => exportToCSV(leaveRequests.map(l => ({ Engineer: l.engineerName || 'Unknown', 'Start Date': l.startDate, 'End Date': l.endDate, Reason: l.reason, Status: l.status, Backup: l.backupEngineerName || '-' })), `leave-requests-${new Date().toISOString().split('T')[0]}`)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                      <Download className="w-3.5 h-3.5" />Export
                    </button>
                    <button onClick={() => sendReportEmail('leave-requests', leaveRequests.map(l => ({ Engineer: l.engineerName || 'Unknown', 'Start Date': l.startDate, 'End Date': l.endDate, Reason: l.reason, Status: l.status })), `Leave Requests Report - ${new Date().toLocaleDateString()}`)} disabled={emailSending}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50">
                      <Send className="w-3.5 h-3.5" />{emailSending ? 'Sending...' : 'Email'}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {leaveRequests.map(leave => (
                    <div key={leave.id} className="rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all bg-white">
                      <div className="flex justify-between items-start mb-4 gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold">
                            {(leave.engineerName || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">{leave.engineerName || 'Unknown'}</h3>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(leave.startDate).toLocaleDateString()} – {new Date(leave.endDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge status={leave.status} />
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 mb-3 border border-gray-100">
                        <p className="text-sm text-gray-700">{leave.reason}</p>
                        {leave.backupEngineerName && (
                          <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1"><Users className="w-3 h-3" />Backup: <span className="font-semibold text-gray-700">{leave.backupEngineerName}</span></p>
                        )}
                      </div>
                      {leave.status === 'pending' && (
                        <div className="flex gap-2">
                          <select onChange={e => { if (e.target.value) handleLeaveAction(leave.id, 'approved', e.target.value); }} disabled={loading}
                            className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50 transition-all">
                            <option value="">Select backup engineer & approve</option>
                            {engineers.filter((eng: any) => eng.id !== leave.engineerId).map((eng: any) => <option key={eng.id} value={eng.id}>{eng.name}</option>)}
                          </select>
                          <button onClick={() => handleLeaveAction(leave.id, 'rejected')} disabled={loading}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors text-sm font-semibold">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {leaveRequests.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm font-medium">No leave requests found</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REPORTS */}
            {activeTab === 'reports' && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                  <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" />Daily Reports</h3>
                  <DateBar
                    onExport={() => exportToCSV(reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' })), `reports-${selectedDate}`)}
                    onEmail={() => sendReportEmail('daily-reports', reports.map(r => ({ Engineer: (r as any).engineerName || '', Client: (r as any).clientName || '', Date: r.date, 'Work Done': r.workDone, Issues: r.issues || 'None' })), `Daily Reports - ${selectedDate}`)}
                    exportData={[]} exportName=""
                  />
                </div>
                <div className="space-y-3">
                  {reports.map(report => (
                    <div key={report.id} className="rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                        <div className="w-8 h-8 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 font-bold text-sm shrink-0">
                          {((report as any).engineerName || 'U')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{(report as any).engineerName || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">{(report as any).clientName || 'Unknown'}</p>
                        </div>
                        <span className="text-[11px] text-gray-400 bg-white border border-gray-200 px-2 py-1 rounded-lg">
                          {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="px-5 py-4 space-y-2">
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Work Done</p>
                          <p className="text-sm text-gray-700">{report.workDone}</p>
                        </div>
                        {report.issues && (
                          <div className="bg-red-50 rounded-xl p-3 border border-red-100 flex gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Issues</p>
                              <p className="text-sm text-red-700">{report.issues}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm font-medium">No reports for this date</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CLIENTWISE */}
            {activeTab === 'clientwise' && <HRClientWiseView />}

            {/* PROFILES */}
            {activeTab === 'profiles' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 text-sm">Employee Directory ({profileTotal})</h3>
                  {profileTotal > profileLimit && (
                    <div className="flex items-center gap-3">
                      <button disabled={profilePage === 1} onClick={() => setProfilePage(p => p - 1)} className="p-2 border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-xs font-semibold text-gray-500">Page {profilePage} of {Math.ceil(profileTotal / profileLimit)}</span>
                      <button disabled={profilePage * profileLimit >= profileTotal} onClick={() => setProfilePage(p => p + 1)} className="p-2 border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <ProfileViewer engineers={engineerProfiles} />
              </div>
            )}

            {/* ENTERPRISE */}
            {activeTab === 'enterprise' && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <h3 className="font-bold text-gray-900 text-sm">Enterprise Reports</h3>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-1.5 mb-6 flex-wrap">
                  {(['daily', 'weekly', 'monthly', 'backup', 'payroll'] as const).map(tab => (
                    <button key={tab} onClick={() => setEnterpriseTab(tab)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                        enterpriseTab === tab ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Daily */}
                {enterpriseTab === 'daily' && (
                  <div>
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                      <h4 className="font-semibold text-gray-800 text-sm">Daily Attendance Register</h4>
                      <DateBar
                        onExport={() => exportToCSV(attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, 'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-', 'Check Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-', Hours: r.hoursWorked ? r.hoursWorked.toFixed(1) : '-', Location: r.site || '-' })), `attendance-register-${selectedDate}`)}
                        onEmail={() => sendReportEmail('daily-attendance', attendanceRegister.map(r => ({ Engineer: r.engineerName, Status: r.status, 'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '-', 'Check Out': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '-', Hours: r.hoursWorked ? r.hoursWorked.toFixed(1) : '-' })), `Daily Attendance Register - ${selectedDate}`)}
                        exportData={[]} exportName=""
                      />
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100"><tr>{['Engineer','Status','Check In','Check Out','Hours'].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {attendanceRegister.map(record => (
                            <tr key={record.engineerId} className="hover:bg-gray-50 transition-colors">
                              <td className={TD + ' font-semibold text-sm text-gray-900'}>{record.engineerName}</td>
                              <td className={TD}><Badge status={record.status} /></td>
                              <td className={TD + ' text-sm text-gray-600'}>{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className={TD + ' text-sm text-gray-600'}>{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className={TD + ' text-sm font-medium text-gray-600'}>{record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Weekly */}
                {enterpriseTab === 'weekly' && (
                  <div>
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                      <h4 className="font-semibold text-gray-800 text-sm">Weekly Engineer Summary</h4>
                      <div className="flex gap-2 flex-wrap items-center">
                        <input type="date" value={weeklyStart} onChange={e => setWeeklyStart(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-400 transition-all" />
                        <span className="text-gray-400 text-sm">to</span>
                        <input type="date" value={weeklyEnd} onChange={e => setWeeklyEnd(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-400 transition-all" />
                        <button onClick={() => exportToCSV(engineerSummary.map(s => ({ Engineer: s.engineerName, 'Present Days': s.presentDays, 'Absent Days': s.absentDays, 'Leave Days': s.leaveDays, 'Total Hours': s.totalHours, 'Avg Hours/Day': s.averageHoursPerDay })), `weekly-summary-${weeklyStart}-to-${weeklyEnd}`)}
                          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"><Download className="w-3.5 h-3.5" />Export</button>
                        <button onClick={() => sendReportEmail('weekly-summary', engineerSummary.map(s => ({ Engineer: s.engineerName, 'Present Days': s.presentDays, 'Absent Days': s.absentDays, 'Leave Days': s.leaveDays, 'Total Hours': s.totalHours, 'Avg Hours/Day': s.averageHoursPerDay })), `Weekly Engineer Summary - ${weeklyStart} to ${weeklyEnd}`)} disabled={emailSending}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"><Send className="w-3.5 h-3.5" />{emailSending ? 'Sending...' : 'Email'}</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100"><tr>{['Engineer','Present','Absent','Leave','Total Hours','Avg Hours/Day'].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {engineerSummary.map(s => (
                            <tr key={s.engineerId} className="hover:bg-gray-50 transition-colors">
                              <td className={TD + ' font-semibold text-sm text-gray-900'}>{s.engineerName}</td>
                              <td className={TD + ' text-sm font-semibold text-emerald-600'}>{s.presentDays}</td>
                              <td className={TD + ' text-sm font-semibold text-red-500'}>{s.absentDays}</td>
                              <td className={TD + ' text-sm font-semibold text-blue-600'}>{s.leaveDays}</td>
                              <td className={TD + ' text-sm text-gray-600'}>{s.totalHours}h</td>
                              <td className={TD + ' text-sm text-gray-600'}>{s.averageHoursPerDay}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Monthly */}
                {enterpriseTab === 'monthly' && (
                  <div>
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                      <h4 className="font-semibold text-gray-800 text-sm">Monthly Client-Wise Report</h4>
                      <div className="flex gap-2">
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-400 transition-all" />
                        <button onClick={() => exportToCSV(clientReports.map(r => ({ Client: r.clientName, 'Active Engineers': r.activeEngineers, 'Total Check-Ins': r.totalCheckIns, 'Total Reports': r.totalReports })), `monthly-client-report-${selectedMonth}`)}
                          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"><Download className="w-3.5 h-3.5" />Export</button>
                        <button onClick={() => sendReportEmail('monthly-client', clientReports.map(r => ({ Client: r.clientName, 'Active Engineers': r.activeEngineers, 'Total Check-Ins': r.totalCheckIns, 'Total Reports': r.totalReports })), `Monthly Client Report - ${selectedMonth}`)} disabled={emailSending}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"><Send className="w-3.5 h-3.5" />{emailSending ? 'Sending...' : 'Email'}</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {clientReports.map(report => (
                        <div key={report.clientId} className="rounded-2xl border border-gray-100 p-5 bg-white hover:border-gray-200 hover:shadow-sm transition-all">
                          <h4 className="font-bold text-gray-900 text-sm mb-4">{report.clientName}</h4>
                          <div className="space-y-2">
                            {[
                              { label: 'Sites', value: report.sitesCount, color: '' },
                              { label: 'Assignments', value: report.totalAssignments, color: '' },
                              { label: 'Active Engineers', value: report.activeEngineers, color: 'emerald' },
                              { label: 'Check-ins', value: report.totalCheckIns, color: 'blue' },
                              { label: 'Reports', value: report.totalReports, color: 'violet' },
                            ].map(item => (
                              <div key={item.label} className={`flex justify-between items-center p-2.5 rounded-xl border ${
                                item.color === 'emerald' ? 'bg-emerald-50 border-emerald-100' :
                                item.color === 'blue'    ? 'bg-blue-50 border-blue-100' :
                                item.color === 'violet'  ? 'bg-violet-50 border-violet-100' :
                                'bg-gray-50 border-gray-100'
                              }`}>
                                <span className={`text-xs font-semibold ${
                                  item.color === 'emerald' ? 'text-emerald-700' :
                                  item.color === 'blue'    ? 'text-blue-700' :
                                  item.color === 'violet'  ? 'text-violet-700' :
                                  'text-gray-600'
                                }`}>{item.label}</span>
                                <span className={`font-bold text-sm ${
                                  item.color === 'emerald' ? 'text-emerald-700' :
                                  item.color === 'blue'    ? 'text-blue-700' :
                                  item.color === 'violet'  ? 'text-violet-700' :
                                  'text-gray-900'
                                }`}>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Backup */}
                {enterpriseTab === 'backup' && backupUsage && (
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm mb-4">Backup Usage Report</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Total Backups', value: backupUsage.totalBackups, icon: Database, color: 'blue' },
                        { label: 'Engineers as Backup', value: backupUsage.engineersUsedAsBackup, icon: Users, color: 'violet' },
                        { label: 'Approved Leaves', value: backupUsage.approvedLeaves, icon: CheckCircle, color: 'emerald' },
                        { label: 'Coverage Rate', value: `${backupUsage.coverageRate?.toFixed(0) || 0}%`, icon: TrendingUp, color: 'amber' },
                      ].map(item => (
                        <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-all text-center">
                          <div className={`w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center border ${
                            item.color === 'blue'   ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            item.color === 'violet' ? 'bg-violet-50 text-violet-600 border-violet-100' :
                            item.color === 'emerald'? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                          <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wide">{item.label}</p>
                        </div>
                      ))}
                    </div>
                    {backupUsage.topBackupEngineers?.length > 0 && (
                      <div className="mt-6">
                        <h5 className="font-semibold text-gray-800 text-sm mb-3">Top Backup Engineers</h5>
                        <div className="space-y-2">
                          {backupUsage.topBackupEngineers.map((eng: any, idx: number) => (
                            <div key={eng.engineerId} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">#{idx + 1}</span>
                                <span className="font-semibold text-gray-900 text-sm">{eng.engineerName}</span>
                              </div>
                              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">{eng.backupCount}x backup</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Payroll */}
                {enterpriseTab === 'payroll' && (
                  <div>
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                      <h4 className="font-semibold text-gray-800 text-sm">Payroll Summary</h4>
                      <div className="flex gap-2">
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-400 transition-all" />
                        <button onClick={exportPayrollCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"><Download className="w-3.5 h-3.5" />Export</button>
                        <button onClick={() => sendReportEmail('payroll', payrollData, `Payroll Summary - ${selectedMonth}`)} disabled={emailSending}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"><Send className="w-3.5 h-3.5" />{emailSending ? 'Sending...' : 'Email'}</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-gray-100">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100"><tr>{['Engineer','Present Days','Absent Days','Total Hours','Leaves'].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {payrollData.map(record => (
                            <tr key={record.engineerId} className="hover:bg-gray-50 transition-colors">
                              <td className={TD + ' font-semibold text-sm text-gray-900'}>{record.engineerName}</td>
                              <td className={TD + ' text-sm font-semibold text-emerald-600'}>{record.presentDays}</td>
                              <td className={TD + ' text-sm font-semibold text-red-500'}>{record.absentDays}</td>
                              <td className={TD + ' text-sm text-gray-600'}>{record.totalHours}h</td>
                              <td className={TD + ' text-sm text-gray-600'}>{record.leaveDays || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
