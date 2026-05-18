import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, Calendar, Plus, Send, CheckCircle, AlertCircle,
  LogOut, Navigation, Briefcase, Activity, MapPin, Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { assignmentService } from '../../services/assignmentService';
import type { DailyReport, CheckIn, LeaveRequest, Assignment } from '../../types';

type Tab = 'attendance' | 'reports' | 'leave';

const NAV: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'attendance', label: 'Attendance', icon: Clock,     desc: 'Track your shifts' },
  { id: 'reports',    label: 'Reports',    icon: FileText,  desc: 'Daily work logs' },
  { id: 'leave',      label: 'Leave',      icon: Calendar,  desc: 'Time-off requests' },
];

const F = 'w-full bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all resize-none';
const FL = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5';

export default function EngineerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('attendance');
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(false);
  const [repForm, setRepForm] = useState({ clientId: '', workDone: '', issues: '' });
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });

  useEffect(() => { if (user?.id) { loadAll(); const t = setTimeout(() => setLoading(false), 5000); return () => clearTimeout(t); } }, [user]);

  async function loadAll() {
    try {
      setLoading(true);
      const engId = (user as any)?.engineerId || user?.id;
      if (!engId) { setLoading(false); return; }
      const [r, c, l, a, tc] = await Promise.all([
        reportService.getReports(engId), checkInService.getAllCheckIns(engId),
        leaveService.getMyLeaveRequests(engId), assignmentService.getMyAssignments(engId),
        checkInService.getTodayCheckIn(engId),
      ]);
      setReports([...r]); setCheckIns(c.filter((x: CheckIn) => x.engineerId === engId));
      setLeaves([...l]); setAssignments(a); setTodayCheckIn(tc);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function checkIn() {
    if (!user || sub) return;
    try {
      setSub(true);
      let lat = 0, lng = 0, loc = 'Location unavailable', got = false;
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 })).catch(async (err) => {
            if (err.code === 3 || err.code === 2) return new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }));
            throw err;
          });
          lat = pos.coords.latitude; lng = pos.coords.longitude; got = true;
        } catch (ge: any) { if (ge.code === 1) throw ge; }
      }
      if (!got) { try { const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) }); const d = await r.json(); if (d.latitude) { lat = d.latitude; lng = d.longitude; got = true; } } catch {} }
      if (got) { try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`); const d = await r.json(); if (d.display_name) loc = d.display_name; } catch { loc = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; } }
      const result = await checkInService.createCheckIn((user as any).engineerId || user.id, lat, lng, loc);
      setTodayCheckIn(result); loadAll();
      alert(got ? `Checked in at ${loc}` : 'Checked in (location unavailable)');
    } catch (e: any) { alert(e.code === 1 ? 'Location access denied.' : (e.message || 'Check-in failed')); }
    finally { setSub(false); }
  }

  async function checkOut() {
    if (!todayCheckIn || sub) return;
    try { setSub(true); await checkInService.checkOut(todayCheckIn.id); setTodayCheckIn(null); await loadAll(); }
    catch { alert('Check-out failed'); } finally { setSub(false); }
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault(); if (!user || !repForm.clientId || sub) return;
    try {
      setSub(true);
      const result = await reportService.createReport((user as any).engineerId || user.id, repForm.clientId, repForm.workDone, repForm.issues);
      const newR: DailyReport = { ...result, clientName: assignments.find(a => a.clientId === repForm.clientId)?.clientName || '', date: result.date || new Date().toISOString().split('T')[0] };
      setReports(p => [newR, ...p]); setRepForm({ clientId: '', workDone: '', issues: '' }); await loadAll(); alert('Report submitted');
    } catch { alert('Failed'); } finally { setSub(false); }
  }

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault(); if (!user || sub) return;
    try {
      setSub(true);
      const result = await leaveService.createLeaveRequest((user as any).engineerId || user.id, leaveForm.startDate, leaveForm.endDate, leaveForm.reason);
      setLeaves(p => [{ ...result, engineerName: user.name, status: 'pending' }, ...p]); setLeaveForm({ startDate: '', endDate: '', reason: '' }); await loadAll(); alert('Leave request submitted');
    } catch { alert('Failed'); } finally { setSub(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm font-medium">Loading your workspace...</p>
      </div>
    </div>
  );

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const isActive = todayCheckIn && !todayCheckIn.checkOutTime;
  const isDone = todayCheckIn && !!todayCheckIn.checkOutTime;

  const statBlocks = [
    { label: 'Duty Status',    value: isActive ? 'On Duty' : isDone ? 'Done' : 'Pending', icon: Activity,  bg: isActive ? 'bg-emerald-50' : 'bg-slate-50', iconColor: isActive ? 'text-emerald-600' : 'text-slate-400', valueColor: isActive ? 'text-emerald-600' : 'text-slate-600' },
    { label: 'Sites',          value: assignments.length, icon: Briefcase, bg: 'bg-blue-50',   iconColor: 'text-blue-600',   valueColor: 'text-slate-800' },
    { label: 'My Reports',     value: reports.length,     icon: FileText,  bg: 'bg-violet-50', iconColor: 'text-violet-600', valueColor: 'text-slate-800' },
    { label: 'Leave Requests', value: leaves.length,      icon: Calendar,  bg: 'bg-amber-50',  iconColor: 'text-amber-600',  valueColor: 'text-slate-800' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-60 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-100 flex flex-col z-30 shadow-[1px_0_0_0_#f1f5f9]">
        {/* Profile */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-base shadow-md shadow-blue-200">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{user?.name?.split(' ')[0]}</p>
              <p className="text-slate-400 text-[11px] font-medium">{greeting}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${isActive ? 'bg-emerald-50 border border-emerald-100' : isDone ? 'bg-slate-50 border border-slate-100' : 'bg-slate-50 border border-slate-100'}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            <span className={`text-[11px] font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
              {isActive ? 'Currently On Duty' : isDone ? 'Shift Complete' : 'Off Duty'}
            </span>
          </div>
        </div>

        <div className="px-3 pt-5 pb-4 flex-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group ${
                  tab === n.id
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-[inset_2px_0_0_#3b82f6]'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium'
                }`}>
                <n.icon className={`w-4 h-4 shrink-0 transition-colors ${tab === n.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                <div className="min-w-0">
                  <p className="truncate">{n.label}</p>
                  {tab === n.id && <p className="text-[10px] text-blue-500 font-normal">{n.desc}</p>}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Check-in/out CTA */}
        <div className="px-4 pb-6 pt-4 border-t border-slate-100">
          {!todayCheckIn ? (
            <button onClick={checkIn} disabled={sub}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-200 hover:-translate-y-px active:translate-y-0">
              {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {sub ? 'Locating...' : 'Start Shift'}
            </button>
          ) : !todayCheckIn.checkOutTime ? (
            <button onClick={checkOut} disabled={sub}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 shadow-md shadow-red-100">
              {sub ? <Clock className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {sub ? 'Ending...' : 'End Shift'}
            </button>
          ) : (
            <div className="w-full py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Shift Complete
            </div>
          )}
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        {/* Page header */}
        <div className="sticky top-14 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-800 tracking-tight">{NAV.find(n => n.id === tab)?.label}</h1>
              <p className="text-slate-400 text-xs mt-0.5">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            {isActive && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 text-xs font-semibold">Live on duty</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-8 space-y-7">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statBlocks.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 border border-slate-50">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                  <s.icon className={`w-4.5 h-4.5 ${s.iconColor}`} style={{ width: '18px', height: '18px' }} />
                </div>
                <p className={`text-2xl font-bold tracking-tight ${s.valueColor}`}>{s.value}</p>
                <p className="text-slate-400 text-[11px] font-medium uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest">Shift History</p>
                <span className="text-slate-400 text-xs">{checkIns.length} records</span>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] border border-slate-50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Date','Check In','Check Out','Location','Status'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {checkIns.length > 0 ? checkIns.slice(0, 20).map(ci => (
                      <tr key={ci.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-800 text-sm">{new Date(ci.checkInTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="px-5 py-4 text-slate-600 text-sm">{new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-5 py-4 text-slate-500 text-sm">{ci.checkOutTime ? new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-5 py-4 text-slate-400 text-xs truncate max-w-[180px]">{ci.locationName || 'N/A'}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wide ${ci.checkOutTime ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                            {!ci.checkOutTime && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            {ci.checkOutTime ? 'Done' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                              <Clock className="w-5 h-5 text-slate-400" />
                            </div>
                            <p className="text-slate-400 text-sm font-medium">No shifts yet</p>
                            <p className="text-slate-300 text-xs">Start your first shift using the button on the left</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-4">New Report</p>
                <form onSubmit={submitReport} className="space-y-4 bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] border border-slate-50">
                  <div>
                    <label className={FL}>Client / Project</label>
                    <select required value={repForm.clientId} onChange={e => setRepForm({ ...repForm, clientId: e.target.value })} className={`${F} appearance-none`}>
                      <option value="" disabled>Select assignment...</option>
                      {Array.from(new Map(assignments.map(a => [a.clientId, a])).values()).map((a, i) => (
                        <option key={`${a.clientId}-${i}`} value={a.clientId}>{a.clientName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={FL}>Work Done</label>
                    <textarea required value={repForm.workDone} onChange={e => setRepForm({ ...repForm, workDone: e.target.value })} className={`${F} min-h-[100px]`} placeholder="What did you complete today?" />
                  </div>
                  <div>
                    <label className={FL}>Issues / Blockers</label>
                    <textarea value={repForm.issues} onChange={e => setRepForm({ ...repForm, issues: e.target.value })} className={`${F} min-h-[70px]`} placeholder="Any blockers or issues?" />
                  </div>
                  <button type="submit" disabled={sub}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-200">
                    {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sub ? 'Submitting...' : 'Submit Report'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-3">
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-4">Submitted Reports</p>
                <div className="space-y-3">
                  {reports.length > 0 ? reports.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map(r => (
                    <div key={r.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-blue-100 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
                            <FileText className="w-3.5 h-3.5 text-violet-600" />
                          </div>
                          <span className="font-semibold text-slate-800 text-sm">{r.clientName || 'Report'}</span>
                        </div>
                        <span className="text-slate-400 text-xs">{new Date(r.date || r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
                  )) : (
                    <div className="py-16 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">No reports yet</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── LEAVE ── */}
          {tab === 'leave' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-4">New Request</p>
                <form onSubmit={submitLeave} className="space-y-4 bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] border border-slate-50">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={FL}>Start Date</label>
                      <input required type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className={F} />
                    </div>
                    <div>
                      <label className={FL}>End Date</label>
                      <input required type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className={F} />
                    </div>
                  </div>
                  <div>
                    <label className={FL}>Reason</label>
                    <textarea required value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className={`${F} min-h-[90px]`} placeholder="Reason for leave..." />
                  </div>
                  <button type="submit" disabled={sub}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-amber-100">
                    {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {sub ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </div>

              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-4">Leave History</p>
                <div className="space-y-2.5">
                  {leaves.length > 0 ? leaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(l => (
                    <div key={l.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-amber-100 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-150">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">
                            {new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(l.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className="text-slate-400 text-xs truncate max-w-xs">{l.reason}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${
                        l.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        l.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>{l.status}</span>
                    </div>
                  )) : (
                    <div className="py-12 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                      <p className="text-slate-400 text-sm font-medium">No leave history</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
