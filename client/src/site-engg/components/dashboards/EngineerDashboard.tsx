import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, Calendar, Plus, Send, CheckCircle, AlertCircle,
  LogOut, Navigation, Briefcase, Activity, MapPin, Zap, TrendingUp, Sparkles,
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

const F = 'w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all resize-none shadow-sm';
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
    <div className="min-h-screen bg-[#f0f2f7] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto shadow-sm" />
        <p className="text-slate-400 text-sm font-semibold">Loading your workspace...</p>
      </div>
    </div>
  );

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const isActive = todayCheckIn && !todayCheckIn.checkOutTime;
  const isDone = todayCheckIn && !!todayCheckIn.checkOutTime;

  const statBlocks = [
    { label: 'Duty Status',    value: isActive ? 'On Duty' : isDone ? 'Done' : 'Off Duty', icon: Activity,  gradient: isActive ? 'from-emerald-500 to-teal-600' : 'from-slate-400 to-slate-500', valueColor: isActive ? 'text-emerald-600' : 'text-slate-500' },
    { label: 'Sites Assigned', value: assignments.length,                                    icon: Briefcase, gradient: 'from-blue-500 to-indigo-600',   valueColor: 'text-slate-800' },
    { label: 'My Reports',     value: reports.length,                                        icon: FileText,  gradient: 'from-violet-500 to-purple-600', valueColor: 'text-slate-800' },
    { label: 'Leave Requests', value: leaves.length,                                         icon: Calendar,  gradient: 'from-amber-500 to-orange-500',  valueColor: 'text-slate-800' },
  ];

  const leaveStatusStyle = (status: string) => {
    const m: Record<string, string> = {
      approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      pending:  'bg-amber-100 text-amber-700 border-amber-200',
    };
    return m[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <div className="flex min-h-screen bg-[#f0f2f7]">

      {/* ─── SIDEBAR ─── */}
      <aside className="w-64 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[#0d1117] flex flex-col z-30">
        <div className="h-0.5 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />

        {/* Profile section */}
        <div className="px-4 pt-5 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-blue-900/40">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{user?.name?.split(' ')[0]}</p>
              <p className="text-white/30 text-[11px] font-medium">{greeting}</p>
            </div>
          </div>
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${
            isActive
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-white/[0.04] border-white/[0.06]'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
            <span className={`text-[11px] font-semibold ${isActive ? 'text-emerald-400' : 'text-white/30'}`}>
              {isActive ? 'Currently On Duty' : isDone ? 'Shift Complete' : 'Off Duty'}
            </span>
          </div>
        </div>

        <div className="px-3 pt-5 pb-4 flex-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-3 px-2">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group ${
                  tab === n.id
                    ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/40'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06] font-medium'
                }`}>
                <n.icon className={`w-4 h-4 shrink-0 ${tab === n.id ? 'text-white' : 'text-white/30 group-hover:text-white/70'}`} />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{n.label}</p>
                  {tab === n.id && <p className="text-[10px] text-blue-200/50 font-normal mt-0.5">{n.desc}</p>}
                </div>
                {tab === n.id && <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-64 flex-1 min-h-screen flex flex-col">

        {/* Page header */}
        <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {NAV.find(n => n.id === tab)?.label}
                {tab === 'attendance' && <Sparkles className="w-4 h-4 text-blue-400" />}
              </h1>
              <p className="text-slate-400 text-xs mt-0.5 font-medium">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            {isActive && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 text-xs font-bold">Live on duty</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-8 space-y-6">

          {/* ── SHIFT CONTROL CARD ── */}
          <div className={`relative rounded-2xl border overflow-hidden shadow-sm ${
            isActive
              ? 'border-emerald-200'
              : isDone
              ? 'border-slate-200'
              : 'border-blue-200'
          }`}>
            {/* Background pattern */}
            <div className={`absolute inset-0 ${
              isActive ? 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30'
              : isDone ? 'bg-slate-50'
              : 'bg-gradient-to-r from-blue-50 via-white to-blue-50/30'
            }`} />
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{
              background: isActive
                ? 'linear-gradient(90deg, #10b981, #14b8a6)'
                : isDone ? '#e2e8f0'
                : 'linear-gradient(90deg, #3b82f6, #6366f1)'
            }} />

            <div className="relative flex items-center justify-between gap-6 p-6">
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  isActive ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200'
                  : isDone ? 'bg-slate-200'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200'
                }`}>
                  {isActive
                    ? <Activity className="w-7 h-7 text-white" />
                    : isDone
                    ? <CheckCircle className="w-7 h-7 text-slate-400" />
                    : <Navigation className="w-7 h-7 text-white" />
                  }
                </div>
                <div>
                  <p className={`font-black text-xl tracking-tight ${isActive ? 'text-emerald-700' : isDone ? 'text-slate-500' : 'text-slate-800'}`}>
                    {isActive ? 'Currently On Duty' : isDone ? 'Shift Complete for Today' : 'Ready to Start Your Shift?'}
                  </p>
                  <p className="text-slate-400 text-sm mt-1 font-medium">
                    {isActive
                      ? `Checked in at ${new Date(todayCheckIn!.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${todayCheckIn?.locationName ? ` · ${todayCheckIn.locationName.split(',')[0]}` : ''}`
                      : isDone
                      ? `Checked out at ${new Date(todayCheckIn!.checkOutTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                    }
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                {!todayCheckIn ? (
                  <button onClick={checkIn} disabled={sub}
                    className="flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all duration-150 disabled:opacity-50 shadow-lg shadow-blue-200 hover:-translate-y-0.5">
                    {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                    {sub ? 'Locating...' : 'Start Shift'}
                  </button>
                ) : !todayCheckIn.checkOutTime ? (
                  <button onClick={checkOut} disabled={sub}
                    className="flex items-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white rounded-xl font-bold text-sm transition-all duration-150 disabled:opacity-50 shadow-lg shadow-red-200 hover:-translate-y-0.5">
                    {sub ? <Clock className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    {sub ? 'Ending...' : 'End Shift'}
                  </button>
                ) : (
                  <div className="flex items-center gap-2.5 px-6 py-3 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-sm shadow-sm">
                    <CheckCircle className="w-4 h-4" /> Done for Today
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {statBlocks.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.gradient} rounded-t-2xl`} />
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4 shadow-sm`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <p className={`text-2xl font-black tracking-tight ${s.valueColor}`}>{s.value}</p>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  <p className="text-slate-700 text-sm font-bold">Shift History</p>
                </div>
                <span className="text-slate-400 text-xs font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{checkIns.length} records</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-slate-50/50 border-b border-slate-100">
                      {['Date','Check In','Check Out','Location','Status'].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {checkIns.length > 0 ? checkIns.slice(0, 20).map(ci => (
                      <tr key={ci.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800 text-sm">{new Date(ci.checkInTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="px-6 py-4 text-slate-700 text-sm font-semibold">{new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm font-medium">{ci.checkOutTime ? new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-slate-200">—</span>}</td>
                        <td className="px-6 py-4 text-slate-400 text-xs truncate max-w-[180px] font-medium">
                          {ci.locationName ? (
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-400 shrink-0" />{ci.locationName.split(',')[0]}</span>
                          ) : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${ci.checkOutTime ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {!ci.checkOutTime && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            {ci.checkOutTime ? 'Done' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                              <Clock className="w-7 h-7 text-blue-400" />
                            </div>
                            <p className="text-slate-600 text-sm font-bold">No shifts yet</p>
                            <p className="text-slate-400 text-xs font-medium">Start your first shift using the button above</p>
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
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-3.5 h-3.5 text-violet-500" />
                  <p className="text-slate-700 text-sm font-bold">New Report</p>
                </div>
                <form onSubmit={submitReport} className="space-y-4 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="h-0.5 -mx-6 -mt-6 mb-6 rounded-t-2xl bg-gradient-to-r from-blue-500 to-indigo-600" />
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
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-200 hover:-translate-y-0.5">
                    {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sub ? 'Submitting...' : 'Submit Report'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-slate-700 text-sm font-bold">Submitted Reports</p>
                  </div>
                  <span className="text-slate-400 text-xs font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{reports.length} total</span>
                </div>
                <div className="space-y-3">
                  {reports.length > 0 ? reports.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map(r => (
                    <div key={r.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 bg-gradient-to-r from-slate-50/80 to-transparent">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-bold text-slate-800 text-sm">{r.clientName || 'Report'}</span>
                        </div>
                        <span className="text-slate-400 text-xs font-semibold bg-white border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">{new Date(r.date || r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
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
                    <div className="py-24 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <FileText className="w-7 h-7 text-blue-400" />
                        </div>
                        <p className="text-slate-600 text-sm font-bold">No reports yet</p>
                        <p className="text-slate-400 text-xs font-medium">Submit your first daily report</p>
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
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <p className="text-slate-700 text-sm font-bold">New Request</p>
                </div>
                <form onSubmit={submitLeave} className="space-y-4 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <div className="h-0.5 -mx-6 -mt-6 mb-6 rounded-t-2xl bg-gradient-to-r from-amber-400 to-orange-500" />
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
                    <textarea required value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className={`${F} min-h-[80px]`} placeholder="Reason for leave..." />
                  </div>
                  <button type="submit" disabled={sub}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition-all duration-150 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-200 hover:-translate-y-0.5">
                    {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {sub ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-700 text-sm font-bold">My Requests</p>
                  <span className="text-slate-400 text-xs font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{leaves.length} total</span>
                </div>
                <div className="space-y-3">
                  {leaves.length > 0 ? leaves.map(l => (
                    <div key={l.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(l.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                          <p className="text-slate-400 text-xs font-medium mt-0.5">{l.reason}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${leaveStatusStyle(l.status)}`}>{l.status}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="py-24 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                          <Calendar className="w-7 h-7 text-amber-400" />
                        </div>
                        <p className="text-slate-600 text-sm font-bold">No leave requests</p>
                        <p className="text-slate-400 text-xs font-medium">Submit a request to take time off</p>
                      </div>
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
