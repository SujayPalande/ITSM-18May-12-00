import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, Calendar, Plus, Send, CheckCircle, AlertCircle,
  LogOut, Navigation, Briefcase, Activity, MapPin,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { assignmentService } from '../../services/assignmentService';
import type { DailyReport, CheckIn, LeaveRequest, Assignment } from '../../types';

export default function EngineerDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'attendance' | 'reports' | 'leave'>('attendance');
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'reports',    label: 'Reports',    icon: FileText },
    { id: 'leave',      label: 'Leave',      icon: Calendar },
  ];

  const isActive = todayCheckIn && !todayCheckIn.checkOutTime;
  const isDone   = todayCheckIn && !!todayCheckIn.checkOutTime;

  return (
    <div className="min-h-screen bg-slate-100 pb-16">

      {/* ═══ HERO BANNER ═══ */}
      <div className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 text-white">
        <div className="max-w-5xl mx-auto px-5 lg:px-8 pt-8 pb-0">

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-blue-300 text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5">Field Engineering Console</p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {greeting}, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-blue-300 text-sm mt-1">
                {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold border ${
              isActive ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200'
              : isDone  ? 'bg-white/10 border-white/20 text-white/70'
              :           'bg-white/10 border-white/20 text-white/60'
            }`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
              {isActive ? 'On Duty' : isDone ? 'Shift Complete' : 'Not Checked In'}
            </div>
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Today",       value: isActive ? 'Active' : isDone ? 'Done' : 'Pending', icon: Activity },
              { label: 'Assignments', value: assignments.length,                                 icon: Briefcase },
              { label: 'Reports',     value: reports.length,                                     icon: FileText },
              { label: 'Leaves',      value: leaves.length,                                      icon: Calendar },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3 h-3 text-blue-300" />
                  <p className="text-blue-300 text-[9px] font-bold uppercase tracking-widest">{s.label}</p>
                </div>
                <p className="text-white text-lg font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tab nav — attaches to bottom of banner */}
          <div className="flex gap-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-100 text-blue-700'
                    : 'text-blue-200/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-5xl mx-auto px-5 lg:px-8 py-6">

        {/* ── ATTENDANCE ── */}
        {activeTab === 'attendance' && (
          <div className="grid gap-5 md:grid-cols-5">
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Location Check-in</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                {isActive
                  ? 'Currently clocked in. Stay safe out there.'
                  : isDone
                  ? 'Shift completed. Great work today!'
                  : 'Sync your location to start today\'s shift.'}
              </p>
              <div className="mt-auto space-y-2.5">
                {!todayCheckIn ? (
                  <button onClick={handleCheckIn} disabled={submitting}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
                    {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    {submitting ? 'Syncing...' : 'Start Shift'}
                  </button>
                ) : !todayCheckIn.checkOutTime ? (
                  <button onClick={handleCheckOut} disabled={submitting}
                    className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
                    {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    {submitting ? 'Ending...' : 'End Shift'}
                  </button>
                ) : (
                  <div className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 border border-emerald-200">
                    <CheckCircle className="w-4 h-4" />
                    Session Complete
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-900">Shift History</h3>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{checkIns.length} entries</span>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[360px] pr-1">
                {checkIns.length > 0 ? checkIns.slice(0, 20).map((ci) => (
                  <div key={ci.id} className="flex items-center gap-3.5 p-3.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ci.checkOutTime ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(ci.checkInTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <span className="text-slate-400 font-normal ml-2">
                          {new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {ci.checkOutTime && ` → ${new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{ci.locationName || 'Location not available'}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${ci.checkOutTime ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'}`}>
                      {ci.checkOutTime ? 'Done' : 'Active'}
                    </span>
                  </div>
                )) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <Clock className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No shifts recorded yet</p>
                    <p className="text-xs text-slate-300 mt-1">Your shift history will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── REPORTS ── */}
        {activeTab === 'reports' && (
          <div className="grid gap-5 md:grid-cols-5">
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">New Report</h3>
                  <p className="text-xs text-slate-400">Document today's site work</p>
                </div>
              </div>
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Client / Project</label>
                  <select required value={reportForm.clientId} onChange={e => setReportForm({ ...reportForm, clientId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-4 py-2.5 text-sm text-slate-800 outline-none transition-all appearance-none">
                    <option value="" disabled>Select assignment...</option>
                    {Array.from(new Map(assignments.map(a => [a.clientId, a])).values()).map((a, idx) => (
                      <option key={`opt-${a.clientId}-${idx}`} value={a.clientId}>{a.clientName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Work Done</label>
                  <textarea required value={reportForm.workDone} onChange={e => setReportForm({ ...reportForm, workDone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg px-4 py-3 text-sm text-slate-800 outline-none transition-all resize-none min-h-[110px]"
                    placeholder="What did you build, fix, or inspect today?" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Issues / Blockers</label>
                  <textarea value={reportForm.issues} onChange={e => setReportForm({ ...reportForm, issues: e.target.value })}
                    className="w-full bg-red-50 border border-red-100 focus:border-red-300 focus:ring-2 focus:ring-red-50 rounded-lg px-4 py-3 text-sm text-slate-800 outline-none transition-all resize-none min-h-[70px]"
                    placeholder="Any blockers or material shortages?" />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
                  {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </form>
            </div>

            <div className="md:col-span-3 space-y-3">
              {reports.length > 0 ? reports.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map(report => (
                <div key={report.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{report.clientName || 'Site Report'}</h4>
                        <p className="text-xs text-slate-400">{new Date(report.date || report.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      </div>
                    </div>
                    <button onClick={async () => { const e = prompt("Send copy to email:"); if (e) { try { const r = await fetch(`/api/reports/${report.id}/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }) }); const d = await r.json(); alert(d.message || 'Sent!'); } catch { alert('Failed'); } } }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 leading-relaxed">{report.workDone}</p>
                  {report.issues && (
                    <div className="mt-2 bg-red-50 rounded-lg px-4 py-2.5 flex gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-700 font-medium">{report.issues}</p>
                    </div>
                  )}
                </div>
              )) : (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-700">No Reports Yet</h3>
                  <p className="text-slate-400 text-sm mt-1">Submitted reports will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── LEAVE ── */}
        {activeTab === 'leave' && (
          <div className="max-w-2xl">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Request Leave</h3>
                  <p className="text-xs text-slate-400">Submit for HR approval</p>
                </div>
              </div>
              <form onSubmit={handleLeaveRequest} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                    <input required type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 rounded-lg px-4 py-2.5 text-sm text-slate-800 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                    <input required type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 rounded-lg px-4 py-2.5 text-sm text-slate-800 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason</label>
                  <textarea required value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 rounded-lg px-4 py-3 text-sm text-slate-800 outline-none transition-all resize-none min-h-[90px]"
                    placeholder="Reason for leave request..." />
                </div>
                <button type="submit" disabled={submitting}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
                  {submitting ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            </div>

            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Leave History</p>
            <div className="space-y-2">
              {leaves.length > 0 ? leaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(leave => (
                <div key={leave.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' — '}
                        {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{leave.reason}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                    leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700'
                    : leave.status === 'rejected' ? 'bg-red-100 text-red-700'
                    : 'bg-slate-100 text-slate-600'
                  }`}>
                    {leave.status}
                  </span>
                </div>
              )) : (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400 font-medium">No leave history found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
