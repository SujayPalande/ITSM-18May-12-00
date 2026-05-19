import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Cell,
} from 'recharts';
import {
  FileText, Clock, Calendar, Send, CheckCircle, AlertCircle,
  LogOut, Navigation, Briefcase, Activity, MapPin, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { assignmentService } from '../../services/assignmentService';
import type { DailyReport, CheckIn, LeaveRequest, Assignment } from '../../types';

type Tab = 'attendance' | 'reports' | 'leave';

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'attendance', label: 'Attendance', icon: Clock    },
  { id: 'reports',    label: 'Reports',    icon: FileText },
  { id: 'leave',      label: 'Leave',      icon: Calendar },
];

const F  = 'w-full bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all resize-none';
const FL = 'block text-xs font-semibold text-slate-500 mb-1.5';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.25, 0.1, 0.25, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.16 } },
};
const stagger  = { animate: { transition: { staggerChildren: 0.07 } } };
const fadeUp   = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function useCounter(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target]);
  return val;
}
function AnimatedNumber({ value }: { value: number }) { return <>{useCounter(value)}</>; }

export default function EngineerDashboard() {
  const { user } = useAuth();
  const [tab, setTab]               = useState<Tab>('attendance');
  const [reports, setReports]       = useState<DailyReport[]>([]);
  const [checkIns, setCheckIns]     = useState<CheckIn[]>([]);
  const [leaves, setLeaves]         = useState<LeaveRequest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading]       = useState(true);
  const [sub, setSub]               = useState(false);
  const [repForm, setRepForm]       = useState({ clientId: '', workDone: '', issues: '' });
  const [leaveForm, setLeaveForm]   = useState({ startDate: '', endDate: '', reason: '' });
  const [chartData, setChartData]   = useState<{ weekly: any[]; monthAttendance: any[] }>({ weekly: [], monthAttendance: [] });

  useEffect(() => {
    if (user?.id) {
      loadAll();
      const t = setTimeout(() => setLoading(false), 5000);
      return () => clearTimeout(t);
    }
  }, [user]);

  async function loadAll() {
    try {
      setLoading(true);
      const engId = (user as any)?.engineerId || user?.id;
      if (!engId) { setLoading(false); return; }
      const [r, c, l, a, tc] = await Promise.all([
        reportService.getReports(engId),
        checkInService.getAllCheckIns(engId),
        leaveService.getMyLeaveRequests(engId),
        assignmentService.getMyAssignments(engId),
        checkInService.getTodayCheckIn(engId),
      ]);
      const myCIs = c.filter((x: CheckIn) => x.engineerId === engId);
      setReports([...r]); setCheckIns(myCIs); setLeaves([...l]); setAssignments(a); setTodayCheckIn(tc);

      // Build charts
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const ds = d.toISOString().split('T')[0];
        const dayCI = myCIs.filter((x: CheckIn) => x.date === ds);
        const hrs = dayCI.reduce((acc: number, ci: CheckIn) => {
          if (ci.checkInTime && ci.checkOutTime) {
            const h = (new Date(ci.checkOutTime).getTime() - new Date(ci.checkInTime).getTime()) / 3600000;
            return acc + Math.min(h, 12);
          }
          return acc;
        }, 0);
        return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), hours: parseFloat(hrs.toFixed(1)), reports: r.filter((x: DailyReport) => x.date === ds).length };
      });

      const now  = new Date();
      const monthCIs  = myCIs.filter((ci: CheckIn) => {
        const d = new Date(ci.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length;
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const workDays = Math.min(daysInMonth, now.getDate());
      const absentDays = Math.max(0, workDays - monthCIs);
      const leaveDays = l.filter((lv: LeaveRequest) => lv.status === 'approved').reduce((acc: number, lv: LeaveRequest) => {
        const s = new Date(lv.startDate), e = new Date(lv.endDate);
        return acc + Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
      }, 0);

      setChartData({
        weekly: days,
        monthAttendance: [
          { name: 'Present', value: monthCIs,  fill: '#22c55e' },
          { name: 'Absent',  value: absentDays, fill: '#f87171' },
          { name: 'Leave',   value: leaveDays,  fill: '#f59e0b' },
        ],
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function checkIn() {
    if (!user || sub) return;
    try {
      setSub(true);
      let lat = 0, lng = 0, loc = 'Location unavailable', got = false;
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 })
          ).catch(async (err) => {
            if (err.code === 3 || err.code === 2) return new Promise<GeolocationPosition>((res, rej) =>
              navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 })
            );
            throw err;
          });
          lat = pos.coords.latitude; lng = pos.coords.longitude; got = true;
        } catch (ge: any) { if (ge.code === 1) throw ge; }
      }
      if (!got) {
        try {
          const rr = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
          const d  = await rr.json();
          if (d.latitude) { lat = d.latitude; lng = d.longitude; got = true; }
        } catch {}
      }
      if (got) {
        try {
          const rr = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const d  = await rr.json();
          if (d.display_name) loc = d.display_name;
        } catch { loc = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
      }
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
    e.preventDefault();
    if (!user || !repForm.clientId || sub) return;
    try {
      setSub(true);
      const result = await reportService.createReport((user as any).engineerId || user.id, repForm.clientId, repForm.workDone, repForm.issues);
      const newR: DailyReport = { ...result, clientName: assignments.find(a => a.clientId === repForm.clientId)?.clientName || '', date: result.date || new Date().toISOString().split('T')[0] };
      setReports(p => [newR, ...p]); setRepForm({ clientId: '', workDone: '', issues: '' }); await loadAll(); alert('Report submitted');
    } catch { alert('Failed'); } finally { setSub(false); }
  }

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || sub) return;
    try {
      setSub(true);
      const result = await leaveService.createLeaveRequest((user as any).engineerId || user.id, leaveForm.startDate, leaveForm.endDate, leaveForm.reason);
      setLeaves(p => [{ ...result, engineerName: user.name, status: 'pending' }, ...p]);
      setLeaveForm({ startDate: '', endDate: '', reason: '' }); await loadAll(); alert('Request submitted');
    } catch { alert('Failed'); } finally { setSub(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full mx-auto" />
        <p className="text-slate-500 text-sm font-medium">Loading workspace…</p>
      </div>
    </div>
  );

  const today    = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const isActive = todayCheckIn && !todayCheckIn.checkOutTime;
  const isDone   = todayCheckIn && !!todayCheckIn.checkOutTime;

  const leaveStatusStyle = (s: string) => ({
    approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    rejected:  'bg-red-50 text-red-700 ring-1 ring-red-200',
    pending:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  }[s] || 'bg-slate-100 text-slate-600');

  const statBlocks = [
    { label: 'Duty Status',    value: isActive ? 'Active' : isDone ? 'Done' : 'Off', icon: Activity,  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100',   isText: true },
    { label: 'Sites Assigned', value: assignments.length,                              icon: Briefcase, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', isText: false },
    { label: 'My Reports',     value: reports.length,                                  icon: FileText,  color: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-100',isText: false },
    { label: 'Leave Requests', value: leaves.length,                                   icon: Calendar,  color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100',  isText: false },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ─── SIDEBAR ─── */}
      <aside className="w-60 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 flex flex-col z-30">
        <div className="px-4 pt-5 pb-4 border-b border-slate-100">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {user?.name?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{user?.name?.split(' ')[0]}</p>
              <p className="text-slate-400 text-xs">{greeting}</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            {isActive ? 'Currently On Duty' : isDone ? 'Shift Complete' : 'Off Duty'}
          </motion.div>
        </div>

        <nav className="flex-1 px-3 pt-4 pb-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Navigation</p>
          {NAV.map((n, i) => (
            <motion.button key={n.id} onClick={() => setTab(n.id)}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06, duration: 0.25 }}
              whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left relative ${
                tab === n.id ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}>
              {tab === n.id && (
                <motion.span layoutId="engNavIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/60 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }} />
              )}
              <n.icon className="w-4 h-4 shrink-0" />
              <span>{n.label}</span>
            </motion.button>
          ))}
        </nav>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-bold text-slate-900">{NAV.find(n => n.id === tab)?.label}</h1>
              <p className="text-slate-400 text-xs mt-0.5">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            {isActive && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 text-xs font-semibold">Live on duty</span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            <motion.div key={tab} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">

              {/* ── SHIFT CARD ── (always shown) */}
              <motion.div
                animate={isActive ? { boxShadow: ['0 0 0 0 rgba(34,197,94,0)', '0 0 0 6px rgba(34,197,94,0.08)', '0 0 0 0 rgba(34,197,94,0)'] } : {}}
                transition={{ duration: 2.5, repeat: Infinity }}
                className={`rounded-xl border bg-white p-6 flex items-center justify-between gap-6 ${isActive ? 'border-emerald-200' : isDone ? 'border-slate-200' : 'border-slate-200'}`}>
                <div className="flex items-center gap-4">
                  <motion.div animate={isActive ? { scale: [1, 1.06, 1] } : {}} transition={{ duration: 2, repeat: Infinity }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-emerald-100' : isDone ? 'bg-slate-100' : 'bg-blue-100'}`}>
                    {isActive ? <Activity className="w-5 h-5 text-emerald-600" /> : isDone ? <CheckCircle className="w-5 h-5 text-slate-400" /> : <Navigation className="w-5 h-5 text-blue-600" />}
                  </motion.div>
                  <div>
                    <p className={`font-bold text-base ${isActive ? 'text-emerald-700' : isDone ? 'text-slate-500' : 'text-slate-800'}`}>
                      {isActive ? 'Currently On Duty' : isDone ? 'Shift Complete for Today' : 'Ready to Start Your Shift?'}
                    </p>
                    <p className="text-slate-400 text-sm mt-0.5">
                      {isActive ? `In since ${new Date(todayCheckIn!.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${todayCheckIn?.locationName ? ` · ${todayCheckIn.locationName.split(',')[0]}` : ''}` :
                       isDone   ? `Done at ${new Date(todayCheckIn!.checkOutTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
                       today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="shrink-0">
                  {!todayCheckIn ? (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={checkIn} disabled={sub}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50">
                      {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      {sub ? 'Locating…' : 'Start Shift'}
                    </motion.button>
                  ) : !todayCheckIn.checkOutTime ? (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={checkOut} disabled={sub}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50">
                      {sub ? <Clock className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                      {sub ? 'Ending…' : 'End Shift'}
                    </motion.button>
                  ) : (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg font-semibold text-sm">
                      <CheckCircle className="w-4 h-4" /> Done for Today
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Stat cards */}
              <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statBlocks.map(s => (
                  <motion.div key={s.label} variants={fadeUp} whileHover={{ y: -3, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.08)' }}
                    className={`bg-white rounded-xl border p-5 ${s.border} flex items-center gap-4 cursor-default transition-shadow`}>
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">
                        {s.isText ? (s.value as string) : <AnimatedNumber value={s.value as number} />}
                      </p>
                      <p className="text-slate-500 text-xs font-medium mt-0.5">{s.label}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* ── ATTENDANCE TAB ── */}
              {tab === 'attendance' && (
                <div className="space-y-6">
                  {/* Charts */}
                  <div className="grid gap-5 lg:grid-cols-3">
                    <motion.div variants={fadeUp} className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-bold text-slate-800">Weekly Hours</p>
                          <p className="text-xs text-slate-400 mt-0.5">Hours worked per day this week</p>
                        </div>
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full ring-1 ring-blue-200">7 Days</span>
                      </div>
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={chartData.weekly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <defs>
                            <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                          <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2.5} fill="url(#engGrad)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Hours" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </motion.div>

                    <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 p-5">
                      <p className="text-sm font-bold text-slate-800 mb-1">This Month</p>
                      <p className="text-xs text-slate-400 mb-3">Attendance breakdown</p>
                      <ResponsiveContainer width="100%" height={140}>
                        <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={chartData.monthAttendance} startAngle={90} endAngle={-270}>
                          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#f8fafc' }}>
                            {chartData.monthAttendance.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </RadialBar>
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {chartData.monthAttendance.map(d => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                              <span className="text-xs text-slate-500 font-medium">{d.name}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-700">{d.value}d</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Shift history table */}
                  <motion.div variants={fadeUp}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-slate-700 text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-slate-400" />Shift History</p>
                      <span className="text-slate-400 text-xs bg-slate-100 px-3 py-1 rounded-full">{checkIns.length} records</span>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full">
                        <thead><tr className="bg-slate-50 border-b border-slate-200">{['Date','Check In','Check Out','Location','Status'].map(h => <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {checkIns.length > 0 ? checkIns.slice(0, 20).map((ci, idx) => (
                            <motion.tr key={ci.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                              className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3.5 font-semibold text-slate-800 text-sm">{new Date(ci.checkInTime).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</td>
                              <td className="px-5 py-3.5 text-slate-700 text-sm font-medium">{new Date(ci.checkInTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                              <td className="px-5 py-3.5 text-slate-500 text-sm">{ci.checkOutTime ? new Date(ci.checkOutTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : <span className="text-slate-300">—</span>}</td>
                              <td className="px-5 py-3.5 text-slate-400 text-xs truncate max-w-[180px]">{ci.locationName ? <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-blue-400 shrink-0" />{ci.locationName.split(',')[0]}</span> : '—'}</td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ci.checkOutTime ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>
                                  {!ci.checkOutTime && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                                  {ci.checkOutTime ? 'Done' : 'Active'}
                                </span>
                              </td>
                            </motion.tr>
                          )) : (
                            <tr><td colSpan={5} className="py-16 text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"><Clock className="w-5 h-5 text-blue-400" /></div>
                                <p className="text-slate-500 text-sm font-medium">No shifts yet</p>
                                <p className="text-slate-400 text-xs">Start your first shift above</p>
                              </div>
                            </td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* ── REPORTS TAB ── */}
              {tab === 'reports' && (
                <div className="space-y-6">
                  {/* Reports per day bar chart */}
                  <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 p-5">
                    <p className="text-sm font-bold text-slate-800 mb-1">Reports This Week</p>
                    <p className="text-xs text-slate-400 mb-4">Daily submission activity</p>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={chartData.weekly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        <Bar dataKey="reports" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Reports" />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>

                  <div className="grid gap-6 lg:grid-cols-5">
                    <div className="lg:col-span-2">
                      <p className="text-slate-700 text-sm font-semibold mb-3">New Report</p>
                      <form onSubmit={submitReport} className="space-y-4 bg-white rounded-xl border border-slate-200 p-5">
                        <div className="h-0.5 -mx-5 -mt-5 mb-5 rounded-t-xl bg-blue-600" />
                        <div>
                          <label className={FL}>Client / Project</label>
                          <select required value={repForm.clientId} onChange={e => setRepForm({...repForm,clientId:e.target.value})} className={`${F} appearance-none`}>
                            <option value="" disabled>Select assignment…</option>
                            {Array.from(new Map(assignments.map(a => [a.clientId, a])).values()).map((a, i) => (
                              <option key={`${a.clientId}-${i}`} value={a.clientId}>{a.clientName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={FL}>Work Done</label>
                          <textarea required value={repForm.workDone} onChange={e => setRepForm({...repForm,workDone:e.target.value})} className={`${F} min-h-[96px]`} placeholder="What did you complete today?" />
                        </div>
                        <div>
                          <label className={FL}>Issues / Blockers</label>
                          <textarea value={repForm.issues} onChange={e => setRepForm({...repForm,issues:e.target.value})} className={`${F} min-h-[68px]`} placeholder="Any blockers?" />
                        </div>
                        <motion.button type="submit" disabled={sub} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                          {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          {sub ? 'Submitting…' : 'Submit Report'}
                        </motion.button>
                      </form>
                    </div>

                    <div className="lg:col-span-3">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-slate-700 text-sm font-semibold">Submitted Reports</p>
                        <span className="text-slate-400 text-xs bg-slate-100 px-3 py-1 rounded-full">{reports.length} total</span>
                      </div>
                      <div className="space-y-3">
                        {reports.length > 0 ? reports.sort((a,b)=>new Date(b.date||b.createdAt).getTime()-new Date(a.date||a.createdAt).getTime()).map((r, idx) => (
                          <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                            whileHover={{ y: -2 }}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-blue-200 hover:shadow-sm transition-all">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                              <span className="font-semibold text-slate-800 text-sm">{r.clientName || 'Report'}</span>
                              <span className="text-slate-400 text-xs">{new Date(r.date||r.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
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
                          </motion.div>
                        )) : (
                          <div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-400" /></div>
                              <p className="text-slate-500 text-sm font-medium">No reports yet</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── LEAVE TAB ── */}
              {tab === 'leave' && (
                <div className="grid gap-6 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <p className="text-slate-700 text-sm font-semibold mb-3">New Request</p>
                    <form onSubmit={submitLeave} className="space-y-4 bg-white rounded-xl border border-slate-200 p-5">
                      <div className="h-0.5 -mx-5 -mt-5 mb-5 rounded-t-xl bg-amber-500" />
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={FL}>Start Date</label><input required type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({...leaveForm,startDate:e.target.value})} className={F} /></div>
                        <div><label className={FL}>End Date</label><input required type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({...leaveForm,endDate:e.target.value})} className={F} /></div>
                      </div>
                      <div>
                        <label className={FL}>Reason</label>
                        <textarea required value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm,reason:e.target.value})} className={`${F} min-h-[96px]`} placeholder="Reason for leave…" />
                      </div>
                      <motion.button type="submit" disabled={sub} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {sub ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sub ? 'Submitting…' : 'Submit Request'}
                      </motion.button>
                    </form>
                  </div>

                  <div className="lg:col-span-3">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-slate-700 text-sm font-semibold">My Requests</p>
                      <span className="text-slate-400 text-xs bg-slate-100 px-3 py-1 rounded-full">{leaves.length} total</span>
                    </div>
                    <div className="space-y-3">
                      {leaves.length > 0 ? leaves.map((l, idx) => (
                        <motion.div key={l.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                          whileHover={{ y: -2 }}
                          className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:border-blue-200 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                              <Calendar className="w-4 h-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{new Date(l.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – {new Date(l.endDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</p>
                              <p className="text-slate-400 text-xs mt-0.5 truncate max-w-[220px]">{l.reason}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${leaveStatusStyle(l.status)}`}>{l.status}</span>
                        </motion.div>
                      )) : (
                        <div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center"><Calendar className="w-5 h-5 text-amber-400" /></div>
                            <p className="text-slate-500 text-sm font-medium">No leave requests yet</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
