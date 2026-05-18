import { useState, useEffect } from 'react';
import {
  FileText, Clock, AlertCircle, Loader2, RefreshCw,
  Calendar, Send, Briefcase, Sparkles, Plus, MapPin,
  LogOut, ChevronRight, Download, Home, Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { assignmentService } from '../../services/assignmentService';
import type { CheckIn, DailyReport, LeaveRequest, Assignment } from '../../types';
import CheckInCard from './CheckInCard';

export default function MobileEngineerDashboard() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [todayReport, setTodayReport] = useState<DailyReport | null>(null);
  const [allReports, setAllReports] = useState<DailyReport[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'reports' | 'leave'>('today');

  const [reportForm, setReportForm] = useState({ clientId: '', workDone: '', issues: '' });
  const [reportLoading, setReportLoading] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });
  const [leaveLoading, setLeaveLoading] = useState(false);

  const engineerId = (user as any)?.engineerId || user?.id;

  useEffect(() => {
    loadData();
    const timer = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(timer);
  }, [user]);

  async function loadData(isRefresh = false) {
    if (!user || !engineerId) return;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [checkIn, leaves, assign, reportsData] = await Promise.all([
        checkInService.getTodayCheckIn(engineerId),
        leaveService.getMyLeaveRequests(engineerId),
        assignmentService.getMyAssignments(engineerId),
        reportService.getReports(engineerId),
      ]);
      const today = new Date().toISOString().split('T')[0];
      setTodayCheckIn(checkIn);
      setTodayReport((reportsData || []).find((r: DailyReport) => r.date === today) || null);
      setAllReports(reportsData || []);
      setLeaveRequests(leaves || []);
      setAssignments(assign || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }

  const handleReportSubmit = async () => {
    if (!user || !reportForm.workDone.trim()) return;
    const a = assignments.find(x => x.clientId === reportForm.clientId) || assignments[0];
    const clientId = reportForm.clientId || (a ? a.clientId : '');
    if (!clientId) return alert("Please select a client before submitting.");
    
    setReportLoading(true);
    try {
      const result = await reportService.createReport(engineerId, clientId, reportForm.workDone, reportForm.issues || undefined, a?.siteId || undefined);
      setTodayReport(result);
      setAllReports(prev => [result, ...prev]);
      setReportForm({ clientId: '', workDone: '', issues: '' });
      loadData();
    } catch (e: any) { alert(e.message || 'Failed to submit'); }
    finally { setReportLoading(false); }
  };

  const handleLeaveSubmit = async () => {
    if (!user || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason) return;
    setLeaveLoading(true);
    try {
      const result = await leaveService.createLeaveRequest(engineerId, leaveForm.startDate, leaveForm.endDate, leaveForm.reason);
      setLeaveRequests([result, ...leaveRequests]);
      setLeaveForm({ startDate: '', endDate: '', reason: '' });
      loadData();
    } catch (e: any) { alert(e.message || 'Failed to submit'); }
    finally { setLeaveLoading(false); }
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-[3px] border-blue-500/20"></div>
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-400 animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-blue-400 animate-pulse" />
          </div>
          <p className="text-blue-300/80 font-medium text-xs tracking-widest uppercase">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] pb-24">
      {/* ─── Dark Premium Header ─── */}
      <div className="relative overflow-hidden bg-[#0f172a]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-violet-600/10"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/[0.06]0/[0.07] rounded-full blur-[100px] -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/[0.05] rounded-full blur-[60px] -ml-24 -mb-24"></div>
        
        <div className="relative px-5 pt-12 pb-6">
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-blue-400/60 text-[10px] font-bold uppercase tracking-[0.25em] mb-2">{greeting}</p>
              <h1 className="text-[26px] font-extrabold text-slate-800 tracking-tight leading-none">{user?.name?.split(' ')[0]}</h1>
              <p className="text-slate-500 text-xs font-medium mt-2 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" />
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <button onClick={() => loadData(true)} disabled={refreshing}
              className="mt-1 p-3 bg-white/[0.06] rounded-xl border border-slate-200 active:scale-90 transition-all backdrop-blur-sm">
              <RefreshCw className={`w-[18px] h-[18px] text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stat Pills */}
          <div className="flex gap-2.5">
            <div className="flex-1 bg-white/[0.06] backdrop-blur-sm rounded-2xl p-4 border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${todayCheckIn ? (todayCheckIn.checkOutTime ? 'bg-slate-500' : 'bg-emerald-400 animate-pulse') : 'bg-amber-400'}`}></div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
              </div>
              <p className="text-sm font-extrabold text-slate-800">{todayCheckIn ? (todayCheckIn.checkOutTime ? 'Done' : 'Active') : 'Pending'}</p>
            </div>
            <div className="flex-1 bg-white/[0.06] backdrop-blur-sm rounded-2xl p-4 border border-slate-200">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Projects</span>
              <p className="text-sm font-extrabold text-slate-800 mt-1">{assignments.length}</p>
            </div>
            <div className="flex-1 bg-white/[0.06] backdrop-blur-sm rounded-2xl p-4 border border-slate-200">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Reports</span>
              <p className="text-sm font-extrabold text-slate-800 mt-1">{allReports.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tab Navigation ─── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="flex">
          {[
            { id: 'today', label: 'Today', icon: Clock },
            { id: 'reports', label: 'Reports', icon: FileText },
            { id: 'leave', label: 'Leave', icon: Calendar }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-wide transition-all relative ${
                activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500'
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-1/4 right-1/4 h-[2.5px] bg-blue-600 rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="px-4 pt-4 space-y-4">

        {/* ═══ TODAY TAB ═══ */}
        {activeTab === 'today' && (
          <>
            <CheckInCard
              checkIn={todayCheckIn}
              onCheckInComplete={(c) => { setTodayCheckIn(c); loadData(); }}
              onCheckOutComplete={() => { setTodayCheckIn(null); loadData(); }}
            />

            {/* Daily Report Section */}
            {todayReport ? (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="bg-emerald-600 px-5 py-3 flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-800" />
                  <span className="text-slate-800 font-bold text-xs">Report Submitted</span>
                  <span className="ml-auto text-emerald-200 text-[10px] font-semibold">✓ Complete</span>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-600 leading-relaxed">{todayReport.workDone}</p>
                  {todayReport.issues && (
                    <div className="flex items-start gap-2 mt-3 p-3 bg-amber-500/[0.06] rounded-xl border border-amber-100">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">{todayReport.issues}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="bg-[#0f172a] px-5 py-3 flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-800 font-bold text-xs">Daily Report</span>
                  <span className="ml-auto text-slate-500 text-[10px] font-semibold">Required</span>
                </div>
                <div className="p-5 space-y-3">
                  {assignments.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Select Client</label>
                      <select required value={reportForm.clientId} onChange={e => setReportForm({ ...reportForm, clientId: e.target.value })}
                        className="w-full px-3.5 py-3 bg-[#f8f9fb] border border-slate-100 rounded-xl text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all appearance-none">
                        <option value="">Choose a client...</option>
                        {assignments.map((a, idx) => <option key={`${a.clientId}-${idx}`} value={a.clientId}>{a.clientName}</option>)}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Work Completed *</label>
                    <textarea value={reportForm.workDone} onChange={e => setReportForm({ ...reportForm, workDone: e.target.value })}
                      placeholder="Describe tasks completed today..." rows={3}
                      className="w-full px-3.5 py-3 bg-[#f8f9fb] border border-slate-100 rounded-xl text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all resize-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Issues <span className="text-slate-800/15">(Optional)</span></label>
                    <textarea value={reportForm.issues} onChange={e => setReportForm({ ...reportForm, issues: e.target.value })}
                      placeholder="Any blockers or concerns?" rows={2}
                      className="w-full px-3.5 py-3 bg-[#f8f9fb] border border-slate-100 rounded-xl text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all resize-none" />
                  </div>
                  <button onClick={handleReportSubmit} disabled={reportLoading || !reportForm.workDone.trim() || (assignments.length > 0 && !reportForm.clientId)}
                    className="w-full py-3.5 bg-blue-600 hover:bg-indigo-500/[0.18] text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 shadow-md shadow-blue-600/20">
                    {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {reportLoading ? 'Submitting...' : 'Submit Report'}
                  </button>
                </div>
              </div>
            )}

            {/* Pending Leave Notice */}
            {leaveRequests.find(l => l.status === 'pending') && (
              <div className="bg-amber-500/[0.06] border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900 text-sm">Pending Leave</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    {new Date(leaveRequests.find(l => l.status === 'pending')!.startDate).toLocaleDateString()} — {new Date(leaveRequests.find(l => l.status === 'pending')!.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ REPORTS TAB ═══ */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="bg-[#0f172a] px-5 py-3 flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-slate-800 font-bold text-xs">Submit New Report</span>
              </div>
              <div className="p-5 space-y-3">
                {assignments.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Select Client</label>
                    <select required value={reportForm.clientId} onChange={e => setReportForm({ ...reportForm, clientId: e.target.value })}
                      className="w-full px-3.5 py-3 bg-[#f8f9fb] border border-slate-100 rounded-xl text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all appearance-none">
                      <option value="">Choose a client...</option>
                      {assignments.map((a, idx) => <option key={`${a.clientId}-${idx}`} value={a.clientId}>{a.clientName}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Work Completed *</label>
                  <textarea value={reportForm.workDone} onChange={e => setReportForm({ ...reportForm, workDone: e.target.value })}
                    placeholder="Describe tasks completed..." rows={3}
                    className="w-full px-3.5 py-3 bg-[#f8f9fb] border border-slate-100 rounded-xl text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all resize-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Issues <span className="text-slate-800/15">(Optional)</span></label>
                  <textarea value={reportForm.issues} onChange={e => setReportForm({ ...reportForm, issues: e.target.value })}
                    placeholder="Any blockers or concerns?" rows={2}
                    className="w-full px-3.5 py-3 bg-[#f8f9fb] border border-slate-100 rounded-xl text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:bg-white outline-none transition-all resize-none" />
                </div>
                <button onClick={handleReportSubmit} disabled={reportLoading || !reportForm.workDone.trim() || (assignments.length > 0 && !reportForm.clientId)}
                  className="w-full py-3.5 bg-blue-600 hover:bg-indigo-500/[0.18] text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 shadow-md shadow-blue-600/20">
                  {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {reportLoading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">All Reports</h3>
                <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/[0.06] px-2.5 py-1 rounded-lg border border-blue-100">{allReports.length} total</span>
              </div>
            {allReports.length > 0 ?
              allReports.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map(report => (
                <div key={report.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {new Date(report.date || report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {report.clientName && <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/[0.06] px-2 py-0.5 rounded">{report.clientName}</span>}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{report.workDone}</p>
                  {report.issues && (
                    <div className="flex items-start gap-2 mt-2.5 p-2.5 bg-amber-500/[0.06] rounded-xl border border-amber-100">
                      <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700">{report.issues}</p>
                    </div>
                  )}
                </div>
              ))
            : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7 text-slate-800/15" />
                </div>
                <p className="text-sm font-bold text-slate-500">No Reports Yet</p>
                <p className="text-xs text-slate-500 mt-1">Your submitted reports will appear here</p>
              </div>
            )}
            </div>
          </div>
        )}

        {/* ═══ LEAVE TAB ═══ */}
        {activeTab === 'leave' && (
          <div className="space-y-4">
            {/* Leave Form */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="bg-[#0f172a] px-5 py-3 flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span className="text-slate-800 font-bold text-xs">Request Leave</span>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">From</label>
                    <input type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#f8f9fb] border border-slate-100 rounded-xl text-sm font-medium focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:bg-white outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">To</label>
                    <input type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      className="w-full px-3 py-2.5 bg-[#f8f9fb] border border-slate-100 rounded-xl text-sm font-medium focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:bg-white outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Reason</label>
                  <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    rows={2} placeholder="Briefly explain..."
                    className="w-full px-3.5 py-3 bg-[#f8f9fb] border border-slate-100 rounded-xl text-sm font-medium focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:bg-white outline-none transition-all resize-none" />
                </div>
                <button onClick={handleLeaveSubmit} disabled={leaveLoading || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason}
                  className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 text-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 shadow-md shadow-violet-600/20">
                  {leaveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {leaveLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>

            {/* Leave History */}
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-0.5">History</h3>
            {leaveRequests.length > 0 ? leaveRequests.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(leave => (
              <div key={leave.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-bold text-slate-600">
                    {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    leave.status === 'approved' ? 'bg-emerald-100 text-emerald-400/80' :
                    leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{leave.status}</span>
                </div>
                <p className="text-xs text-slate-500 italic">"{leave.reason}"</p>
              </div>
            )) : (
              <div className="text-center py-12">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-sm text-slate-500 font-medium">No leave requests</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
