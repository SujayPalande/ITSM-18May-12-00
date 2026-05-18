import { useState, useEffect } from 'react';
import { Users, CheckCircle, Clock, Download, FileText, TrendingUp, Database, Mail, Send, BarChart3, Calendar, AlertCircle, ChevronLeft, ChevronRight, Filter, RefreshCw } from 'lucide-react';
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

const API_BASE = '';

export default function HRDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'muster' | 'leave' | 'reports' | 'clientwise' | 'enterprise' | 'profiles'>('overview');
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

  useEffect(() => {
    loadData();
    if (activeTab === 'profiles') {
      loadEngineerProfiles();
    }
    if (activeTab === 'enterprise' || activeTab === 'overview') {
      loadEnterpriseReports();
    }
  }, [activeTab, selectedDate, enterpriseTab, weeklyStart, weeklyEnd, selectedMonth]);

  const [profilePage, setProfilePage] = useState(1);
  const [profileTotal, setProfileTotal] = useState(0);
  const profileLimit = 20;

  async function loadEngineerProfiles() {
    try {
      const response = await profileService.getAllEngineers(profilePage, profileLimit);
      if (Array.isArray(response)) {
        setEngineerProfiles(response as any);
        setProfileTotal(response.length);
      } else {
        setEngineerProfiles(response.data as any);
        setProfileTotal(response.total);
      }
    } catch (error) {
      console.error('Error loading engineer profiles:', error);
    }
  }

  useEffect(() => {
    loadEngineerProfiles();
  }, [profilePage]);

  async function loadData() {
    try {
      const engineersList = await StorageService.getEngineers();
      setEngineers(Array.isArray(engineersList) ? (engineersList as any) : ((engineersList as any).data || []));

      const [checkInsList, leavesList, reportsList] = await Promise.all([
        checkInService.getAllCheckIns(),
        leaveService.getAllLeaveRequests(),
        reportService.getReports()
      ]);

      setLeaveRequests(leavesList);
      setCheckIns(checkInsList.filter(c => c.date === selectedDate));
      setReports(reportsList.filter((r: any) => r.date === selectedDate));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function loadEnterpriseReports() {
    try {
      setLoading(true);

      if (enterpriseTab === 'daily' || activeTab === 'overview') {
        const register = await hrReportService.getDailyAttendanceRegister(selectedDate);
        setAttendanceRegister(register);
      }
      if (enterpriseTab === 'weekly') {
        const summary = await hrReportService.getWeeklyEngineerSummary(weeklyStart, weeklyEnd);
        setEngineerSummary(summary);
      }
      if (enterpriseTab === 'monthly') {
        const clientReport = await hrReportService.getMonthlyClientReport(selectedMonth);
        setClientReports(clientReport);
      }
      if (enterpriseTab === 'backup') {
        const usage = await hrReportService.getBackupUsage();
        setBackupUsage(usage);
      }
      if (enterpriseTab === 'payroll') {
        const payroll = await hrReportService.getPayrollData(selectedMonth);
        setPayrollData(payroll);
      }
    } catch (error) {
      console.error('Error loading enterprise reports:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveAction(leaveId: string, status: 'approved' | 'rejected', backupEngineerId?: string) {
    if (!user) return;
    setLoading(true);

    try {
      if (status === 'approved') {
        await leaveService.approveLeave(leaveId, String(user.id));
      } else {
        await leaveService.rejectLeave(leaveId, String(user.id));
      }

      await loadData();
      alert(`Leave request ${status} successfully!`);
    } catch (error: any) {
      alert(error.message || 'Failed to update leave request');
    } finally {
      setLoading(false);
    }
  }

  async function sendReportEmail(reportType: string, reportData: any[], subject: string, recipientEmail?: string) {
    if (!reportData || reportData.length === 0) {
      alert('No data available to send.');
      return;
    }

    setEmailSending(true);
    setEmailError(null);
    setEmailSuccess(null);

    try {

      const response = await fetch('/api/send-report-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType,
          reportData,
          subject,
          recipientEmail: recipientEmail || 'sujay.palande@cybaemtech.com'
        }),
      });

      const result = await response.json();


      if (response.ok) {
        setEmailSuccess('Report email sent successfully!');
        alert('Report email sent successfully!');
      } else {
        throw new Error(result.details || result.error || 'Failed to send email');
      }
    } catch (error: any) {
      setEmailError(error.message);
      alert(`Error sending email: ${error.message}`);
    } finally {
      setEmailSending(false);
    }
  }

  function exportPayrollCSV() {
    const csv = hrReportService.exportPayrollToCSV(payrollData, selectedMonth);
    hrReportService.downloadCSV(csv, `payroll-${selectedMonth}.csv`);
  }

  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
  const presentToday = attendanceRegister.filter(r => r.status === 'present').length;
  const onLeaveToday = attendanceRegister.filter(r => r.status === 'leave').length;
  const absentToday = attendanceRegister.filter(r => r.status === 'absent').length;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'attendance', label: 'D. Registration', icon: CheckCircle },
    { id: 'muster', label: 'Muster Roll', icon: Calendar },
    { id: 'leave', label: 'Leaves', icon: Clock },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'enterprise', label: 'Enterprise', icon: TrendingUp },
    { id: 'profiles', label: 'Staff', icon: Users },
  ];

  // Unified view for desktop and mobile
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {emailSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/[0.12] text-emerald-400 border border-emerald-500/15 px-6 py-3 rounded-xl shadow-xl shadow-slate-200 border-none flex items-center gap-3">
          <CheckCircle className="w-5 h-5" />
          {emailSuccess}
        </div>
      )}
      {emailError && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/[0.12] text-red-400 border border-red-500/15 px-6 py-3 rounded-xl shadow-xl shadow-slate-200 border-none flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {emailError}
        </div>
      )}

      <div className="relative bg-[#F8FAFC] border-b border-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-transparent to-transparent"></div>
        <div className="max-w-[1400px] mx-auto px-6 py-10 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-400 text-[10px] font-semibold uppercase tracking-[0.2em] mb-2">Human Resources</p>
              <h1 className="text-3xl font-bold text-slate-800 tracking-tight">HR Dashboard</h1>
              <p className="text-slate-500 text-sm font-medium mt-2">Attendance, leaves & enterprise reports</p>
            </div>
            <button onClick={() => loadData()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-white/[0.08] rounded-md transition-all border border-slate-200 text-slate-800 text-[13px] font-semibold">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="mt-10 flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-[13px] whitespace-nowrap transition-all duration-200 ${activeTab === tab.id ? 'bg-indigo-500/[0.12] text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.06)]' : 'text-slate-500 hover:text-slate-600 hover:bg-slate-100'}`}>
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              <div className="group bg-white rounded-xl p-5 shadow-sm hover:border-slate-200 transition-all border border-slate-100 cursor-pointer" onClick={() => setActiveTab('attendance')}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                    <CheckCircle className="w-4 h-4 text-slate-500" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-800 transition-colors" />
                </div>
                <p className="text-2xl font-semibold text-slate-800 tracking-tight">{presentToday}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-widest">Present Today</p>
                <div className="mt-3 text-[11px] font-medium text-emerald-400/70">
                  {engineers.length > 0 ? `${Math.round((presentToday / engineers.length) * 100)}%` : '0%'} attendance
                </div>
              </div>

              <div className="group bg-white rounded-xl p-5 shadow-sm hover:border-slate-200 transition-all border border-slate-100 cursor-pointer" onClick={() => setActiveTab('leave')}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-800 transition-colors" />
                </div>
                <p className="text-2xl font-semibold text-slate-800 tracking-tight">{pendingLeaves}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-widest">Pending Leaves</p>
                <div className="mt-3 text-[11px] font-medium text-amber-400/70">
                  {onLeaveToday} on leave today
                </div>
              </div>

              <div className="group bg-white rounded-xl p-5 shadow-sm hover:border-slate-200 transition-all border border-slate-100 cursor-pointer" onClick={() => setActiveTab('profiles')}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Users className="w-4 h-4 text-slate-500" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-800 transition-colors" />
                </div>
                <p className="text-2xl font-semibold text-slate-800 tracking-tight">{engineers.length}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-widest">Total Engineers</p>
                <div className="mt-3 text-[11px] font-medium text-red-400/70">
                  {absentToday} absent today
                </div>
              </div>

              <div className="group bg-white rounded-xl p-5 shadow-sm hover:border-slate-200 transition-all border border-slate-100 cursor-pointer" onClick={() => setActiveTab('reports')}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                    <FileText className="w-4 h-4 text-slate-500" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-800 transition-colors" />
                </div>
                <p className="text-2xl font-semibold text-slate-800 tracking-tight">{reports.length}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-1 uppercase tracking-widest">Reports Today</p>
                <div className="mt-3 text-[11px] font-medium text-violet-400/70">
                  View daily reports
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-500" />
                    Quick Reports
                  </h3>
                  <button
                    onClick={() => setActiveTab('enterprise')}
                    className="text-[13px] text-blue-400/70 hover:text-blue-400 font-medium flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-100 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-emerald-400/70" />
                      </div>
                      <div>
                        <p className="font-semibold text-[13px] text-slate-800">Daily Attendance Report</p>
                        <p className="text-[12px] text-slate-500">{selectedDate}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const exportData = attendanceRegister.map(record => ({
                            Engineer: record.engineerName,
                            Status: record.status,
                            'Check In': record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-',
                            'Check Out': record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-',
                            Hours: record.hoursWorked ? record.hoursWorked.toFixed(1) : '-',
                            Location: record.site || '-',
                          }));
                          exportToCSV(exportData, `attendance-${selectedDate}`);
                        }}
                        className="p-2 border border-slate-100 text-slate-600 rounded-md hover:bg-white/[0.015] transition-colors duration-200"
                        title="Download CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const exportData = attendanceRegister.map(record => ({
                            Engineer: record.engineerName,
                            Status: record.status,
                            'Check In': record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-',
                            'Check Out': record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-',
                            Hours: record.hoursWorked ? record.hoursWorked.toFixed(1) : '-',
                            Location: record.site || '-',
                          }));
                          sendReportEmail('attendance', exportData, `Daily Attendance Report - ${selectedDate}`, 'sujay.palande@cybaemtech.com');
                        }}
                        disabled={emailSending}
                        className="p-2 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-md hover:bg-indigo-500/[0.18] transition-colors disabled:opacity-50"
                        title="Send via Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-amber-400/70" />
                      </div>
                      <div>
                        <p className="font-semibold text-[13px] text-slate-800">Leave Summary Report</p>
                        <p className="text-[12px] text-slate-500">{leaveRequests.length} total requests</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const exportData = leaveRequests.map(leave => ({
                            Engineer: leave.engineerName || 'Unknown',
                            'Start Date': leave.startDate,
                            'End Date': leave.endDate,
                            Reason: leave.reason,
                            Status: leave.status,
                            Backup: leave.backupEngineerName || '-'
                          }));
                          exportToCSV(exportData, `leave-requests-${new Date().toISOString().split('T')[0]}`);
                        }}
                        className="p-2 border border-slate-100 text-slate-600 rounded-md hover:bg-white/[0.015] transition-colors duration-200"
                        title="Download CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const exportData = leaveRequests.map(leave => ({
                            Engineer: leave.engineerName || 'Unknown',
                            'Start Date': leave.startDate,
                            'End Date': leave.endDate,
                            Reason: leave.reason,
                            Status: leave.status,
                            Backup: leave.backupEngineerName || '-'
                          }));
                          sendReportEmail('leave', exportData, `Leave Summary Report - ${new Date().toLocaleDateString()}`, 'sujay.palande@cybaemtech.com');
                        }}
                        disabled={emailSending}
                        className="p-2 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-md hover:bg-indigo-500/[0.18] transition-colors disabled:opacity-50"
                        title="Send via Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-violet-400/70" />
                      </div>
                      <div>
                        <p className="font-semibold text-[13px] text-slate-800">Daily Work Reports</p>
                        <p className="text-[12px] text-slate-500">{reports.length} reports today</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const exportData = reports.map(r => ({
                            Engineer: r.engineerName || '',
                            Client: r.clientName || '',
                            Date: r.date,
                            'Work Done': r.workDone,
                            Issues: r.issues || 'None',
                          }));
                          exportToCSV(exportData, `work-reports-${selectedDate}`);
                        }}
                        className="p-2 border border-slate-100 text-slate-600 rounded-md hover:bg-white/[0.015] transition-colors duration-200"
                        title="Download CSV"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const exportData = reports.map(r => ({
                            Engineer: r.engineerName || '',
                            Client: r.clientName || '',
                            Date: r.date,
                            'Work Done': r.workDone,
                            Issues: r.issues || 'None',
                          }));
                          sendReportEmail('work-reports', exportData, `Daily Work Reports - ${selectedDate}`, 'sujay.palande@cybaemtech.com');
                        }}
                        disabled={emailSending}
                        className="p-2 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-md hover:bg-indigo-500/[0.18] transition-colors disabled:opacity-50"
                        title="Send via Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col">
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-600" />
                    Recent Leave Requests
                  </h3>
                </div>
                <div className="divide-y divide-white/[0.03] max-h-80 overflow-y-auto">
                  {leaveRequests.slice(0, 5).map(leave => (
                    <div key={leave.id} className="px-6 py-4 hover:bg-white/[0.015] transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-[13px] text-slate-800">{leave.engineerName || 'Unknown'}</p>
                          <p className="text-[12px] text-slate-500">
                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          leave.status === 'approved' ? 'bg-emerald-500/[0.08] text-emerald-400/70 border border-emerald-500/10' :
                          leave.status === 'rejected' ? 'bg-red-500/[0.08] text-red-400/70 border border-red-500/10' :
                          'bg-amber-500/[0.08] text-amber-400/70 border border-amber-500/10'
                        }`}>
                          {leave.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {leaveRequests.length === 0 && (
                    <div className="px-6 py-8 text-center text-[13px] text-slate-500">
                      No leave requests found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'muster' && (
          <MusterRoll />
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-slate-600" />
                Attendance for {new Date(selectedDate).toLocaleDateString()}
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-100 rounded-md text-[13px] font-medium focus:border-white/[0.12] outline-none bg-slate-100 text-slate-600"
                />
                <button
                  onClick={() => {
                    const exportData = checkIns.map(c => ({
                      Engineer: c.engineerName || '',
                      'Check In': new Date(c.checkInTime).toLocaleString(),
                      'Check Out': c.checkOutTime ? new Date(c.checkOutTime).toLocaleString() : '-',
                      Date: c.date,
                      Location: c.locationName || '-',
                    }));
                    exportToCSV(exportData, `attendance-${selectedDate}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-md transition-colors text-[13px] font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  onClick={() => {
                    const exportData = checkIns.map(c => ({
                      Engineer: c.engineerName || '',
                      'Check In': c.checkInTime ? new Date(c.checkInTime).toLocaleString() : '-',
                      'Check Out': c.checkOutTime ? new Date(c.checkOutTime).toLocaleString() : '-',
                      Date: c.date,
                      Location: c.locationName || '-',
                    }));
                    sendReportEmail('attendance', exportData, `Attendance Report - ${selectedDate}`);
                  }}
                  disabled={emailSending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-md hover:bg-indigo-500/[0.18] transition-colors disabled:opacity-50 text-[13px] font-medium"
                >
                  <Send className="w-3.5 h-3.5" />
                  {emailSending ? 'Sending...' : 'Email'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Engineer</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Check In</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Check Out</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {checkIns.map(checkIn => (
                    <tr key={checkIn.id} className="hover:bg-white/[0.015] transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-800 font-semibold text-[13px]">
                            {(checkIn.engineerName || 'U')[0].toUpperCase()}
                          </div>
                          <span className="font-semibold text-[13px] text-slate-800">{checkIn.engineerName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">
                        {checkIn.checkInTime ? new Date(checkIn.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4 text-[13px] text-slate-600">
                        {checkIn.checkOutTime ? new Date(checkIn.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {checkIn.latitude && checkIn.longitude && 
                         parseFloat(String(checkIn.latitude)) !== 0 && 
                         parseFloat(String(checkIn.longitude)) !== 0 ? (
                          <a
                            href={`https://www.google.com/maps?q=${checkIn.latitude},${checkIn.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400/70 hover:text-blue-400 text-[13px] font-medium"
                          >
                            View Map
                          </a>
                        ) : ((checkIn as any).location_name || checkIn.locationName) ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((checkIn as any).location_name || checkIn.locationName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400/70 hover:text-emerald-400 text-[13px] font-medium"
                            title={`Search for ${(checkIn as any).location_name || checkIn.locationName}`}
                          >
                            Map: {(checkIn as any).location_name || checkIn.locationName}
                          </a>
                        ) : (
                          <span className="text-slate-500 italic text-[12px]">No location provided</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          checkIn.checkOutTime ? 'bg-emerald-500/[0.08] text-emerald-400/70 border border-emerald-500/10' : 'bg-blue-500/[0.08] text-blue-400/70 border border-blue-500/10'
                        }`}>
                          {checkIn.checkOutTime ? 'Completed' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {checkIns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[13px] text-slate-500">
                        <CheckCircle className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                        No check-ins for this date
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'leave' && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-600" />
                Leave Requests
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const exportData = leaveRequests.map(leave => ({
                      Engineer: leave.engineerName || 'Unknown',
                      'Start Date': leave.startDate,
                      'End Date': leave.endDate,
                      Reason: leave.reason,
                      Status: leave.status,
                      Backup: leave.backupEngineerName || '-'
                    }));
                    exportToCSV(exportData, `leave-requests-${new Date().toISOString().split('T')[0]}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-md transition-colors text-[13px] font-medium"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  onClick={() => {
                    const exportData = leaveRequests.map(leave => ({
                      Engineer: leave.engineerName || 'Unknown',
                      'Start Date': leave.startDate,
                      'End Date': leave.endDate,
                      Reason: leave.reason,
                      Status: leave.status,
                      Backup: leave.backupEngineerName || '-'
                    }));
                    sendReportEmail('leave-requests', exportData, `Leave Requests Report - ${new Date().toLocaleDateString()}`);
                  }}
                  disabled={emailSending}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-md hover:bg-indigo-500/[0.18] transition-colors disabled:opacity-50 text-[13px] font-medium"
                >
                  <Send className="w-3.5 h-3.5" />
                  {emailSending ? 'Sending...' : 'Email'}
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {leaveRequests.map(leave => (
                <div key={leave.id} className="border border-slate-100 rounded-xl p-5 hover:border-slate-200 bg-white transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center font-semibold text-slate-800 text-[13px]">
                        {(leave.engineerName || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-[13px]">{leave.engineerName || 'Unknown'}</h3>
                        <p className="text-slate-500 text-[12px] flex items-center gap-1.5 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${
                      leave.status === 'approved' ? 'bg-emerald-500/[0.08] text-emerald-400/70 border border-emerald-500/10' :
                      leave.status === 'rejected' ? 'bg-red-500/[0.08] text-red-400/70 border border-red-500/10' :
                      'bg-amber-500/[0.08] text-amber-400/70 border border-amber-500/10'
                    }`}>
                      {leave.status}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100">
                    <p className="text-slate-600 text-[13px]">{leave.reason}</p>
                    {leave.backupEngineerName && (
                      <p className="text-[12px] text-slate-500 mt-2 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Backup: <span className="font-semibold text-slate-800">{leave.backupEngineerName}</span>
                      </p>
                    )}
                  </div>
                  {leave.status === 'pending' && (
                    <div className="flex gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleLeaveAction(leave.id, 'approved', e.target.value);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 border border-slate-100 rounded-md text-[13px] focus:border-white/[0.12] outline-none bg-slate-100 text-slate-600"
                        disabled={loading}
                      >
                        <option value="">Select backup engineer & approve</option>
                        {engineers.filter(eng => eng.id !== leave.engineerId).map(eng => (
                          <option key={eng.id} value={eng.id}>{eng.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleLeaveAction(leave.id, 'rejected')}
                        disabled={loading}
                        className="px-4 py-1.5 bg-red-500/[0.12] text-red-400 border border-red-500/15 rounded-md hover:bg-red-500/[0.18] disabled:opacity-50 transition-colors text-[13px] font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {leaveRequests.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Calendar className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                  <p className="text-[13px]">No leave requests found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                Daily Reports for {new Date(selectedDate).toLocaleDateString()}
              </h2>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-100 rounded-md text-[13px] focus:border-white/[0.12] outline-none bg-slate-100 text-slate-600 font-medium"
                />
                <button
                  onClick={() => {
                    const exportData = reports.map(r => ({
                      Engineer: r.engineerName || '',
                      Client: r.clientName || '',
                      Date: r.date,
                      WorkDone: r.workDone,
                      Issues: r.issues || 'None',
                    }));
                    exportToCSV(exportData, `reports-${selectedDate}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-100 hover:bg-slate-50 rounded-md transition-colors text-[13px] font-medium text-slate-600"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  onClick={() => {
                    const exportData = reports.map(r => ({
                      Engineer: r.engineerName || '',
                      Client: r.clientName || '',
                      Date: r.date,
                      'Work Done': r.workDone,
                      Issues: r.issues || 'None',
                    }));
                    sendReportEmail('daily-reports', exportData, `Daily Reports - ${selectedDate}`);
                  }}
                  disabled={emailSending}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-lg hover:bg-indigo-500/[0.18] transition-colors shadow-sm disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {emailSending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {reports.map(report => (
                <div key={report.id} className="border border-slate-100 rounded-lg p-5 hover:border-slate-200 hover:bg-white/[0.015] transition-all duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center font-semibold text-slate-800 text-[13px]">
                        {(report.engineerName || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 text-[13px]">{report.engineerName || 'Unknown'}</h3>
                        <p className="text-slate-500 text-[12px] mt-0.5">{report.clientName || 'Unknown'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded tracking-wider uppercase">
                      {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider mb-1">Work Done</p>
                      <p className="text-slate-600 text-[13px]">{report.workDone}</p>
                    </div>
                    {report.issues && (
                      <div className="bg-red-500/[0.04] rounded-lg p-4 border border-red-500/10">
                        <p className="text-[11px] font-semibold text-red-400/60 uppercase tracking-wider mb-1">Issues</p>
                        <p className="text-red-400/50 text-[13px]">{report.issues}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <FileText className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                  <p className="text-[13px]">No reports for this date</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clientwise' && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <HRClientWiseView />
          </div>
        )}

        {activeTab === 'profiles' && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest">Employee Directory ({profileTotal})</h3>
              {profileTotal > profileLimit && (
                <div className="flex items-center gap-3">
                   <button 
                    disabled={profilePage === 1}
                    onClick={() => setProfilePage(p => p - 1)}
                    className="p-1.5 border border-slate-100 rounded-md disabled:opacity-30 hover:bg-white/[0.015] transition-colors duration-200"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Page {profilePage} of {Math.ceil(profileTotal / profileLimit)}
                  </span>
                  <button 
                    disabled={profilePage * profileLimit >= profileTotal}
                    onClick={() => setProfilePage(p => p + 1)}
                    className="p-1.5 border border-slate-100 rounded-md disabled:opacity-30 hover:bg-white/[0.015] transition-colors duration-200"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              )}
            </div>
            <ProfileViewer engineers={engineerProfiles} />
          </div>
        )}

        {activeTab === 'enterprise' && (
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-600" />
                Enterprise Reports
              </h2>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-6 flex-wrap">
                {(['daily', 'weekly', 'monthly', 'backup', 'payroll'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setEnterpriseTab(tab)}
                    className={`px-4 py-2 rounded-md text-[13px] font-semibold transition-all duration-200 capitalize ${
                      enterpriseTab === tab
                        ? 'bg-indigo-500/[0.15] text-indigo-400'
                        : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {enterpriseTab === 'daily' && (
                <div>
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="font-semibold text-slate-800 text-[13px]">Daily Attendance Register</h3>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-1.5 border border-slate-100 rounded-md text-[13px] font-medium focus:border-white/[0.12] outline-none bg-slate-100 text-slate-600"
                      />
                      <button
                        onClick={() => {
                          const exportData = attendanceRegister.map(record => ({
                            Engineer: record.engineerName,
                            Status: record.status,
                            'Check In': record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-',
                            'Check Out': record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-',
                            Hours: record.hoursWorked ? record.hoursWorked.toFixed(1) : '-',
                            Location: record.site || '-',
                          }));
                          exportToCSV(exportData, `attendance-register-${selectedDate}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-md transition-colors text-[13px] font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export
                      </button>
                      <button
                        onClick={() => {
                          const exportData = attendanceRegister.map(record => ({
                            Engineer: record.engineerName,
                            Status: record.status,
                            'Check In': record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-',
                            'Check Out': record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-',
                            Hours: record.hoursWorked ? record.hoursWorked.toFixed(1) : '-',
                            Location: record.site || '-',
                          }));
                          sendReportEmail('daily-attendance', exportData, `Daily Attendance Register - ${selectedDate}`);
                        }}
                        disabled={emailSending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-md hover:bg-indigo-500/[0.18] transition-colors disabled:opacity-50 text-[13px] font-medium"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Email
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full">
                      <thead className="border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Engineer</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Check In</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Check Out</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Hours</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {attendanceRegister.map(record => (
                          <tr key={record.engineerId} className="hover:bg-white/[0.015] transition-colors duration-200">
                            <td className="px-6 py-4 font-semibold text-[13px] text-slate-800">{record.engineerName}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                record.status === 'present' ? 'bg-emerald-500/[0.08] text-emerald-400/70 border border-emerald-500/10' :
                                record.status === 'leave' ? 'bg-blue-500/[0.08] text-blue-400/70 border border-blue-500/10' :
                                'bg-red-500/[0.08] text-red-400/70 border border-red-500/10'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[13px] text-slate-600">
                              {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-6 py-4 text-[13px] text-slate-600">
                              {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-6 py-4 text-[13px] font-medium text-slate-600">
                              {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {enterpriseTab === 'weekly' && (
                <div>
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="font-semibold text-slate-800 text-[13px]">Weekly Engineer Summary</h3>
                    <div className="flex gap-2 items-center flex-wrap">
                      <input
                        type="date"
                        value={weeklyStart}
                        onChange={(e) => setWeeklyStart(e.target.value)}
                        className="px-3 py-1.5 border border-slate-100 rounded-md text-[13px] font-medium focus:border-white/[0.12] outline-none bg-slate-100 text-slate-600"
                      />
                      <span className="text-slate-500 text-[13px]">to</span>
                      <input
                        type="date"
                        value={weeklyEnd}
                        onChange={(e) => setWeeklyEnd(e.target.value)}
                        className="px-3 py-1.5 border border-slate-100 rounded-md text-[13px] font-medium focus:border-white/[0.12] outline-none bg-slate-100 text-slate-600"
                      />
                      <button
                        onClick={() => {
                          const exportData = engineerSummary.map(summary => ({
                            Engineer: summary.engineerName,
                            'Present Days': summary.presentDays,
                            'Absent Days': summary.absentDays,
                            'Leave Days': summary.leaveDays,
                            'Total Hours': summary.totalHours,
                            'Avg Hours/Day': summary.averageHoursPerDay,
                          }));
                          exportToCSV(exportData, `weekly-summary-${weeklyStart}-to-${weeklyEnd}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-md transition-colors text-[13px] font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export
                      </button>
                      <button
                        onClick={() => {
                          const exportData = engineerSummary.map(summary => ({
                            Engineer: summary.engineerName,
                            'Present Days': summary.presentDays,
                            'Absent Days': summary.absentDays,
                            'Leave Days': summary.leaveDays,
                            'Total Hours': summary.totalHours,
                            'Avg Hours/Day': summary.averageHoursPerDay,
                          }));
                          sendReportEmail('weekly-summary', exportData, `Weekly Engineer Summary - ${weeklyStart} to ${weeklyEnd}`);
                        }}
                        disabled={emailSending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-md hover:bg-indigo-500/[0.18] transition-colors disabled:opacity-50 text-[13px] font-medium"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Email
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full">
                      <thead className="border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Engineer</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Present</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Absent</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Leave</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Hours</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Hours/Day</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {engineerSummary.map(summary => (
                          <tr key={summary.engineerId} className="hover:bg-white/[0.015] transition-colors duration-200">
                            <td className="px-6 py-4 font-semibold text-[13px] text-slate-800">{summary.engineerName}</td>
                            <td className="px-6 py-4 text-emerald-400/70 font-semibold text-[13px]">{summary.presentDays}</td>
                            <td className="px-6 py-4 text-red-400/70 font-semibold text-[13px]">{summary.absentDays}</td>
                            <td className="px-6 py-4 text-blue-400/70 font-semibold text-[13px]">{summary.leaveDays}</td>
                            <td className="px-6 py-4 text-slate-600 text-[13px] font-medium">{summary.totalHours}h</td>
                            <td className="px-6 py-4 text-slate-600 text-[13px] font-medium">{summary.averageHoursPerDay}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {enterpriseTab === 'monthly' && (
                <div>
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="font-semibold text-slate-800 text-[13px]">Monthly Client-Wise Report</h3>
                    <div className="flex gap-2">
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 border border-slate-100 rounded-md text-[13px] font-medium focus:border-white/[0.12] outline-none bg-slate-100 text-slate-600"
                      />
                      <button
                        onClick={() => {
                          const exportData = clientReports.map(report => ({
                            Client: report.clientName,
                            'Active Engineers': report.activeEngineers,
                            'Total Check-Ins': report.totalCheckIns,
                            'Total Reports': report.totalReports,
                          }));
                          exportToCSV(exportData, `monthly-client-report-${selectedMonth}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-md transition-colors text-[13px] font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export
                      </button>
                      <button
                        onClick={() => {
                          const exportData = clientReports.map(report => ({
                            Client: report.clientName,
                            'Active Engineers': report.activeEngineers,
                            'Total Check-Ins': report.totalCheckIns,
                            'Total Reports': report.totalReports,
                          }));
                          sendReportEmail('monthly-client', exportData, `Monthly Client Report - ${selectedMonth}`);
                        }}
                        disabled={emailSending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-md hover:bg-indigo-500/[0.18] transition-colors disabled:opacity-50 text-[13px] font-medium"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Email
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clientReports.map(report => (
                      <div key={report.clientId} className="border border-slate-100 rounded-xl p-5 hover:border-slate-200 bg-white transition-all shadow-sm">
                        <h4 className="font-semibold text-slate-800 mb-4 text-[13px]">{report.clientName}</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-md p-2">
                            <span className="text-slate-500 text-[12px] font-medium">Sites</span>
                            <span className="font-semibold text-slate-800 text-[13px]">{report.sitesCount}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-md p-2">
                            <span className="text-slate-500 text-[12px] font-medium">Assignments</span>
                            <span className="font-semibold text-slate-800 text-[13px]">{report.totalAssignments}</span>
                          </div>
                          <div className="flex justify-between items-center bg-emerald-500/[0.06] border border-emerald-500/10 rounded-md p-2">
                            <span className="text-emerald-400/60 text-[12px] font-semibold">Active Engineers</span>
                            <span className="font-bold text-emerald-400 text-[13px]">{report.activeEngineers}</span>
                          </div>
                          <div className="flex justify-between items-center bg-[#EFF6FF] border border-blue-500/10 rounded-md p-2">
                            <span className="text-blue-400/60 text-[12px] font-semibold">Check-ins</span>
                            <span className="font-bold text-blue-400 text-[13px]">{report.totalCheckIns}</span>
                          </div>
                          <div className="flex justify-between items-center bg-violet-500/[0.04] border border-violet-500/10 rounded-md p-2">
                            <span className="text-violet-400/60 text-[12px] font-semibold">Reports</span>
                            <span className="font-bold text-violet-400 text-[13px]">{report.totalReports}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {enterpriseTab === 'backup' && backupUsage && (
                <div>
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="font-semibold text-slate-800 text-[13px]">Backup Usage Report</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col items-center justify-center text-center hover:border-slate-200 transition-all">
                      <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-3">
                        <Database className="w-5 h-5 text-blue-400/70" />
                      </div>
                      <p className="text-slate-500 text-[12px] font-semibold uppercase tracking-wider mb-1">Total Backups</p>
                      <p className="text-2xl font-bold text-slate-800">{backupUsage.totalBackups}</p>
                    </div>
                    <div className="border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col items-center justify-center text-center hover:border-slate-200 transition-all">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/[0.06] flex items-center justify-center mb-3">
                        <TrendingUp className="w-5 h-5 text-emerald-400/70" />
                      </div>
                      <p className="text-slate-500 text-[12px] font-semibold uppercase tracking-wider mb-1">Storage Used</p>
                      <p className="text-2xl font-bold text-slate-800">{backupUsage.storageUsedMB} <span className="text-sm font-medium text-slate-500">MB</span></p>
                    </div>
                    <div className="border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col items-center justify-center text-center hover:border-slate-200 transition-all">
                      <div className="w-10 h-10 rounded-full bg-violet-500/[0.04] flex items-center justify-center mb-3">
                        <FileText className="w-5 h-5 text-violet-400/70" />
                      </div>
                      <p className="text-slate-500 text-[12px] font-semibold uppercase tracking-wider mb-1">Avg Size</p>
                      <p className="text-2xl font-bold text-slate-800">{backupUsage.avgBackupSizeMB} <span className="text-sm font-medium text-slate-500">MB</span></p>
                    </div>
                    <div className="border border-slate-100 rounded-xl p-5 bg-white shadow-sm flex flex-col items-center justify-center text-center hover:border-slate-200 transition-all">
                      <div className="w-10 h-10 rounded-full bg-[#FFFBEB] flex items-center justify-center mb-3">
                        <Clock className="w-5 h-5 text-amber-400/70" />
                      </div>
                      <p className="text-slate-500 text-[12px] font-semibold uppercase tracking-wider mb-1">Last Backup</p>
                      <p className="text-xl font-bold text-slate-800">
                        {backupUsage.lastBackupDate === 'Never' ? 'Never' : new Date(backupUsage.lastBackupDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {enterpriseTab === 'payroll' && (
                <div>
                  <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h3 className="font-semibold text-slate-800 text-[13px]">Payroll Export</h3>
                    <div className="flex gap-2">
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-1.5 border border-slate-100 rounded-md text-[13px] font-medium focus:border-white/[0.12] outline-none bg-slate-100 text-slate-600"
                      />
                      <button
                        onClick={exportPayrollCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-md transition-colors text-[13px] font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export
                      </button>
                      <button
                        onClick={() => {
                          const exportData = payrollData.map(record => ({
                            Engineer: record.engineerName,
                            Email: record.email,
                            Phone: record.phone,
                            'Working Days': record.workingDays,
                            'Total Hours': record.totalHours,
                            'Leave Days': record.leaveDays,
                            'Overtime': record.overtimeHours
                          }));
                          sendReportEmail('payroll', exportData, `Payroll Report - ${selectedMonth}`);
                        }}
                        disabled={emailSending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-md hover:bg-indigo-500/[0.18] transition-colors disabled:opacity-50 text-[13px] font-medium"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Email
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full">
                      <thead className="border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Engineer</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Working Days</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Hours</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Leave Days</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Overtime</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {payrollData.map(record => (
                          <tr key={record.engineerId} className="hover:bg-white/[0.015] transition-colors duration-200">
                            <td className="px-6 py-4 font-semibold text-[13px] text-slate-800">{record.engineerName}</td>
                            <td className="px-6 py-4 text-slate-600 text-[13px]">{record.email}</td>
                            <td className="px-6 py-4 text-slate-600 text-[13px]">{record.phone}</td>
                            <td className="px-6 py-4 text-slate-600 text-[13px]">{record.workingDays}</td>
                            <td className="px-6 py-4 text-slate-600 text-[13px] font-medium">{record.totalHours}h</td>
                            <td className="px-6 py-4 text-slate-600 text-[13px]">{record.leaveDays}</td>
                            <td className="px-6 py-4 text-slate-600 text-[13px] font-medium">{record.overtimeHours}h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
