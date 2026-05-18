import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, Calendar, Plus, Send, CheckCircle, AlertCircle,
  LogOut, Navigation, Briefcase, Activity, MapPin, ChevronRight,
  TrendingUp, Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { assignmentService } from '../../services/assignmentService';
import type { DailyReport, CheckIn, LeaveRequest, Assignment } from '../../types';

type Tab = 'attendance' | 'reports' | 'leave';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'reports',    label: 'Reports',    icon: FileText },
  { id: 'leave',      label: 'Leave',      icon: Calendar },
];

export default function EngineerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reportForm, setReportForm] = useState({ clientId: '', siteId: '', workDone: '', issues: '' });
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    if (user?.id) {
      loadData();
      const timer = setTimeout(() => setLoading(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const engId = (user as any)?.engineerId || user?.id;
      if (!engId) { setLoading(false); return; }
      const [reportsData, checkInsData, leavesData, assignmentsData, todayCheck] = await Promise.all([
        reportService.getReports(engId),
        checkInService.getAllCheckIns(engId),
        leaveService.getMyLeaveRequests(engId),
        assignmentService.getMyAssignments(engId),
        checkInService.getTodayCheckIn(engId),
      ]);
      setReports([...reportsData]);
      setCheckIns(checkInsData.filter((c: CheckIn) => c.engineerId === engId));
      setLeaves([...leavesData]);
      setAssignments(assignmentsData);
      setTodayCheckIn(todayCheck);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally { setLoading(false); }
  };

  const handleCheckIn = async () => {
    if (!user || submitting) return;
    try {
      setSubmitting(true);
      let lat = 0, lng = 0, locationName = 'Location unavailable', gotLocation = false;
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 });
          }).catch(async (err) => {
            if (err.code === 3 || err.code === 2) {
              return new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
              });
            }
            throw err;
          });
          lat = pos.coords.latitude; lng = pos.coords.longitude; gotLocation = true;
        } catch (geoErr: any) { if (geoErr.code === 1) throw geoErr; }
      }
      if (!gotLocation) {
        try { const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) }); const d = await r.json(); if (d.latitude) { lat = d.latitude; lng = d.longitude; gotLocation = true; } } catch {}
      }
      if (gotLocation) {
        try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`); const d = await r.json(); if (d.display_name) locationName = d.display_name; } catch { locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
      }
      const result = await checkInService.createCheckIn((user as any).engineerId || user.id, lat, lng, locationName);
      setTodayCheckIn(result); loadData();
      alert(gotLocation ? `Checked in at ${locationName}` : 'Checked in (location unavailable)');
    } catch (error: any) {
      alert(error.code === 1 ? 'Location access denied.' : (error.message || 'Check-in failed'));
    } finally { setSubmitting(false); }
  };

  const handleCheckOut = async () => {
    if (!todayCheckIn || submitting) return;
    try {
      setSubmitting(true);
      await checkInService.checkOut(todayCheckIn.id);
      setTodayCheckIn(null);
      await loadData();
    } catch { alert('Check-out failed'); }
    finally { setSubmitting(false); }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportForm.clientId || submitting) return;
    try {
      setSubmitting(true);
      const result = await reportService.createReport((user as any).engineerId || user.id, reportForm.clientId, reportForm.workDone, reportForm.issues, reportForm.siteId || undefined);
      const newReport: DailyReport = { ...result, clientName: assignments.find(a => a.clientId === reportForm.clientId)?.clientName || 'Project Report', date: result.date || new Date().toISOString().split('T')[0] };
      setReports(prev => [newReport, ...prev]);
      setReportForm({ clientId: '', siteId: '', workDone: '', issues: '' });
      await loadData(); alert('Report submitted successfully');
    } catch { alert('Failed to submit report'); }
    finally { setSubmitting(false); }
  };

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    try {
      setSubmitting(true);
      const result = await leaveService.createLeaveRequest((user as any).engineerId || user.id, leaveForm.startDate, leaveForm.endDate, leaveForm.reason);
      setLeaves(prev => [{ ...result, engineerName: user.name, status: 'pending' }, ...prev]);
      setLeaveForm({ startDate: '', endDate: '', reason: '' });
      await loadData(); alert('Leave request submitted');
    } catch { alert('Failed to submit leave request'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const isActive = todayCheckIn && !todayCheckIn.checkOutTime;
  const isDone   = todayCheckIn && !!todayCheckIn.checkOutTime;

  const statCards = [
    { label: 'Today',       value: isActive ? 'Active' : isDone ? 'Done' : 'Pending', icon: Activity,  accent: 'blue' },
    { label: 'Assignments', value: assignments.length,                                  icon: Briefcase, accent: 'violet' },
    { label: 'Reports',     value: reports.length,                                      icon: FileText,  accent: 'emerald' },
    { label: 'Leaves',      value: leaves.length,                                       icon: Calendar,  accent: 'amber' },
  ];

  const accentMap: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-600 border-blue-100',
    violet:  'bg-violet-50 text-violet-600 border-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-20">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  {greeting}, <span className="text-blue-600">{user?.name?.split(' ')[0]}</span>
                </h1>
                <p className="text-gray-400 text-sm mt-0.5">
                  {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${
              isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : isDone  ? 'bg-gray-100 border-gray-200 text-gray-600'
              :           'bg-gray-100 border-gray-200 text-gray-500'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              {isActive ? 'On Duty' : isDone ? 'Shift Complete' : 'Not Checked In'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-6 space-y-6">

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${accentMap[s.accent]}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── TABS ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-2 pt-2 flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ── ATTENDANCE ── */}
            {activeTab === 'attendance' && (
              <div className="grid gap-5 md:grid-cols-5">
                <div className="md:col-span-2 flex flex-col gap-5">
                  {/* Check-in card */}
                  <div className={`rounded-2xl border p-6 flex flex-col gap-4 ${
                    isActive ? 'bg-emerald-50 border-emerald-200' : isDone ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isActive ? 'bg-emerald-500' : isDone ? 'bg-gray-400' : 'bg-blue-600'
                      }`}>
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">Location Check-in</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {isActive ? 'Currently clocked in' : isDone ? 'Shift completed' : 'Start your shift'}
                        </p>
                      </div>
                    </div>
                    {!todayCheckIn ? (
                      <button onClick={handleCheckIn} disabled={submitting}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm shadow-blue-200">
                        {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                        {submitting ? 'Syncing location...' : 'Start Shift'}
                      </button>
                    ) : !todayCheckIn.checkOutTime ? (
                      <button onClick={handleCheckOut} disabled={submitting}
                        className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
                        {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                        {submitting ? 'Ending shift...' : 'End Shift'}
                      </button>
                    ) : (
                      <div className="w-full py-3 bg-emerald-100 text-emerald-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-emerald-200">
                        <CheckCircle className="w-4 h-4" />
                        Session Complete
                      </div>
                    )}
                    {todayCheckIn && (
                      <div className="text-xs text-gray-600 bg-white/60 rounded-lg px-3 py-2 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Check-in</span>
                          <span className="font-semibold">{new Date(todayCheckIn.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {todayCheckIn.checkOutTime && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Check-out</span>
                            <span className="font-semibold">{new Date(todayCheckIn.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3 bg-gray-50 rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-900">Shift History</h3>
                    <span className="text-xs font-semibold text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">{checkIns.length} entries</span>
                  </div>
                  <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
                    {checkIns.length > 0 ? checkIns.slice(0, 20).map((ci) => (
                      <div key={ci.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-all">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${ci.checkOutTime ? 'bg-gray-300' : 'bg-emerald-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">
                            {new Date(ci.checkInTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            <span className="text-gray-400 font-normal ml-2 text-xs">
                              {new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {ci.checkOutTime && ` → ${new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 truncate mt-0.5">{ci.locationName || 'Location not available'}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${ci.checkOutTime ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-600'}`}>
                          {ci.checkOutTime ? 'Done' : 'Active'}
                        </span>
                      </div>
                    )) : (
                      <div className="py-10 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-3">
                          <Clock className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-400">No shifts recorded yet</p>
                        <p className="text-xs text-gray-300 mt-1">Your shift history will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── REPORTS ── */}
            {activeTab === 'reports' && (
              <div className="grid gap-5 md:grid-cols-5">
                <div className="md:col-span-2 bg-gray-50 rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">New Report</h3>
                      <p className="text-xs text-gray-400">Document today's site work</p>
                    </div>
                  </div>
                  <form onSubmit={handleReportSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Client / Project</label>
                      <select required value={reportForm.clientId} onChange={e => setReportForm({ ...reportForm, clientId: e.target.value })}
                        className="w-full bg-white border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all appearance-none">
                        <option value="" disabled>Select assignment...</option>
                        {Array.from(new Map(assignments.map(a => [a.clientId, a])).values()).map((a, idx) => (
                          <option key={`opt-${a.clientId}-${idx}`} value={a.clientId}>{a.clientName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Work Done</label>
                      <textarea required value={reportForm.workDone} onChange={e => setReportForm({ ...reportForm, workDone: e.target.value })}
                        className="w-full bg-white border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none transition-all resize-none min-h-[110px]"
                        placeholder="What did you build, fix, or inspect today?" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Issues / Blockers</label>
                      <textarea value={reportForm.issues} onChange={e => setReportForm({ ...reportForm, issues: e.target.value })}
                        className="w-full bg-red-50 border border-red-100 focus:border-red-300 focus:ring-2 focus:ring-red-50 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none transition-all resize-none min-h-[70px]"
                        placeholder="Any blockers or material shortages?" />
                    </div>
                    <button type="submit" disabled={submitting}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm shadow-blue-100">
                      {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </form>
                </div>

                <div className="md:col-span-3 space-y-3">
                  {reports.length > 0 ? reports.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map(report => (
                    <div key={report.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{report.clientName || 'Site Report'}</h4>
                            <p className="text-xs text-gray-400">{new Date(report.date || report.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          </div>
                        </div>
                        <button onClick={async () => { const e = prompt("Send copy to email:"); if (e) { try { const r = await fetch(`/api/reports/${report.id}/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }) }); const d = await r.json(); alert(d.message || 'Sent!'); } catch { alert('Failed'); } } }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed border border-gray-100">{report.workDone}</p>
                      {report.issues && (
                        <div className="mt-2 bg-red-50 rounded-xl px-4 py-2.5 flex gap-2.5 border border-red-100">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-700 font-medium">{report.issues}</p>
                        </div>
                      )}
                    </div>
                  )) : (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-5 h-5 text-gray-300" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-700">No Reports Yet</h3>
                      <p className="text-gray-400 text-xs mt-1">Submitted reports will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── LEAVE ── */}
            {activeTab === 'leave' && (
              <div className="max-w-2xl space-y-5">
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Request Leave</h3>
                      <p className="text-xs text-gray-400">Submit for HR approval</p>
                    </div>
                  </div>
                  <form onSubmit={handleLeaveRequest} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start Date</label>
                        <input required type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                          className="w-full bg-white border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">End Date</label>
                        <input required type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                          className="w-full bg-white border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reason</label>
                      <textarea required value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                        className="w-full bg-white border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none transition-all resize-none min-h-[90px]"
                        placeholder="Reason for leave request..." />
                    </div>
                    <button type="submit" disabled={submitting}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
                      {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </form>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Leave History</p>
                  <div className="space-y-2">
                    {leaves.length > 0 ? leaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(leave => (
                      <div key={leave.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4 hover:border-gray-200 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              {' — '}
                              {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{leave.reason}</p>
                          </div>
                        </div>
                        <span className={`shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                          leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : leave.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {leave.status}
                        </span>
                      </div>
                    )) : (
                      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                        <p className="text-sm text-gray-400 font-medium">No leave history found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
