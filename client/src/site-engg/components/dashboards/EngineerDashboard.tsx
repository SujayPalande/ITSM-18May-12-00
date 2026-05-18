import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, Calendar, Plus, Send, CheckCircle, AlertCircle,
  LogOut, Navigation, Briefcase, Activity, MapPin, LayoutDashboard, Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { assignmentService } from '../../services/assignmentService';
import type { DailyReport, CheckIn, LeaveRequest, Assignment } from '../../types';

type Tab = 'attendance' | 'reports' | 'leave';

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'reports',    label: 'Reports',    icon: FileText },
  { id: 'leave',      label: 'Leave',      icon: Calendar },
];

const F = 'w-full bg-white/10 border border-white/20 focus:border-white/60 focus:ring-2 focus:ring-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none transition-all resize-none';
const FL = 'block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5';

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
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-2 border-blue-800 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" /><p className="text-white/30 text-sm font-semibold">Loading...</p></div>
    </div>
  );

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const isActive = todayCheckIn && !todayCheckIn.checkOutTime;
  const isDone = todayCheckIn && !!todayCheckIn.checkOutTime;

  const statBlocks = [
    { label: 'Duty Status',    value: isActive ? 'ON DUTY' : isDone ? 'DONE' : 'PENDING', icon: Activity,  color: isActive ? 'from-emerald-500 to-emerald-700' : 'from-slate-600 to-slate-800' },
    { label: 'Sites',          value: assignments.length, icon: Briefcase, color: 'from-blue-500 to-blue-700' },
    { label: 'My Reports',     value: reports.length,     icon: FileText,  color: 'from-violet-500 to-violet-700' },
    { label: 'Leave Requests', value: leaves.length,      icon: Calendar,  color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0f1e]">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-56 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[#0f172a] border-r border-white/[0.06] flex flex-col z-30">
        {/* Profile */}
        <div className="px-4 pt-6 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-base shadow-lg shadow-blue-900/50">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-sm truncate">{user?.name?.split(' ')[0]}</p>
              <p className="text-white/30 text-[11px]">{greeting}</p>
            </div>
          </div>
          {/* Status dot */}
          <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl ${isActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.03] border border-white/[0.06]'}`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
            <span className={`text-[11px] font-bold ${isActive ? 'text-emerald-300' : 'text-white/30'}`}>{isActive ? 'On Duty' : isDone ? 'Shift Complete' : 'Off Duty'}</span>
          </div>
        </div>

        <div className="px-4 pt-5 pb-4">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.25em] mb-3">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === n.id ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                <n.icon className={`w-4 h-4 shrink-0 ${tab === n.id ? 'text-blue-400' : 'text-white/30'}`} />
                {n.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Check-in/out CTA */}
        <div className="mt-auto px-4 pb-6 pt-4 border-t border-white/[0.06]">
          {!todayCheckIn ? (
            <button onClick={checkIn} disabled={sub} className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-black text-sm transition-colors disabled:opacity-50 shadow-lg shadow-blue-900/50">
              {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
              {sub ? 'Locating...' : 'Start Shift'}
            </button>
          ) : !todayCheckIn.checkOutTime ? (
            <button onClick={checkOut} disabled={sub} className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/90 hover:bg-red-400 text-white rounded-xl font-black text-sm transition-colors disabled:opacity-50">
              {sub ? <Clock className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              {sub ? 'Ending...' : 'End Shift'}
            </button>
          ) : (
            <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl font-black text-sm flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Shift Complete
            </div>
          )}
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-56 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4">
          <h1 className="text-lg font-black text-white tracking-tight">{NAV.find(n => n.id === tab)?.label}</h1>
          <p className="text-white/30 text-xs mt-0.5">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="flex-1 p-8 space-y-8">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {statBlocks.map(s => (
              <div key={s.label} className="relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08] p-6 hover:border-white/20 transition-all group">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-3xl font-black text-white tracking-tighter">{s.value}</p>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── ATTENDANCE ── */}
          {tab === 'attendance' && (
            <div>
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">Shift History</p>
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">{['Date','Check In','Check Out','Location','Status'].map(h => <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">{h}</th>)}</tr></thead>
                  <tbody>
                    {checkIns.length > 0 ? checkIns.slice(0, 20).map(ci => (
                      <tr key={ci.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 font-bold text-white text-sm">{new Date(ci.checkInTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="px-5 py-4 text-white/60 text-sm">{new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-5 py-4 text-white/60 text-sm">{ci.checkOutTime ? new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="px-5 py-4 text-white/30 text-xs truncate max-w-[180px]">{ci.locationName || 'N/A'}</td>
                        <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${ci.checkOutTime ? 'bg-white/10 text-white/40' : 'bg-emerald-500/20 text-emerald-300'}`}>{ci.checkOutTime ? 'Done' : 'Active'}</span></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="py-16 text-center text-white/20 text-sm">No shifts yet — start your first shift!</td></tr>
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
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">New Report</p>
                <form onSubmit={submitReport} className="space-y-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                  <div><label className={FL}>Client / Project</label><select required value={repForm.clientId} onChange={e => setRepForm({ ...repForm, clientId: e.target.value })} className={`${F} appearance-none`}><option value="" disabled>Select assignment...</option>{Array.from(new Map(assignments.map(a => [a.clientId, a])).values()).map((a, i) => <option key={`${a.clientId}-${i}`} value={a.clientId}>{a.clientName}</option>)}</select></div>
                  <div><label className={FL}>Work Done</label><textarea required value={repForm.workDone} onChange={e => setRepForm({ ...repForm, workDone: e.target.value })} className={`${F} min-h-[100px]`} placeholder="What did you complete today?" /></div>
                  <div><label className={FL}>Issues / Blockers</label><textarea value={repForm.issues} onChange={e => setRepForm({ ...repForm, issues: e.target.value })} className={`${F} min-h-[70px] bg-red-950/20 border-red-900/30`} placeholder="Any blockers?" /></div>
                  <button type="submit" disabled={sub} className="w-full py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-black text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{sub ? 'Submitting...' : 'Submit Report'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-3 space-y-3">
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">Submitted Reports</p>
                {reports.length > 0 ? reports.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map(r => (
                  <div key={r.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden hover:border-white/20 transition-all">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-violet-300" /></div>
                        <span className="font-bold text-white text-sm">{r.clientName || 'Report'}</span>
                      </div>
                      <span className="text-white/25 text-xs">{new Date(r.date || r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <p className="text-white/60 text-sm leading-relaxed">{r.workDone}</p>
                      {r.issues && (
                        <div className="flex gap-2.5 bg-red-950/30 rounded-xl p-3 border border-red-900/30">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <p className="text-red-300/80 text-sm">{r.issues}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="py-16 rounded-2xl border border-dashed border-white/[0.08] text-center text-white/20 text-sm">No reports yet</div>
                )}
              </div>
            </div>
          )}

          {/* ── LEAVE ── */}
          {tab === 'leave' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">New Request</p>
                <form onSubmit={submitLeave} className="space-y-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={FL}>Start Date</label><input required type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className={F} /></div>
                    <div><label className={FL}>End Date</label><input required type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className={F} /></div>
                  </div>
                  <div><label className={FL}>Reason</label><textarea required value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} className={`${F} min-h-[90px]`} placeholder="Reason for leave..." /></div>
                  <button type="submit" disabled={sub} className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-black text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{sub ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              </div>

              <div>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">Leave History</p>
                <div className="space-y-2">
                  {leaves.length > 0 ? leaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(l => (
                    <div key={l.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"><Calendar className="w-4 h-4 text-amber-300" /></div>
                        <div>
                          <p className="font-bold text-white text-sm">{new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(l.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                          <p className="text-white/30 text-xs truncate max-w-xs">{l.reason}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${l.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : l.status === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>{l.status}</span>
                    </div>
                  )) : (
                    <div className="py-12 rounded-2xl border border-dashed border-white/[0.08] text-center text-white/20 text-sm">No leave history</div>
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
