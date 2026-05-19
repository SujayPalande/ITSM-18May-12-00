import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, FileText, MapPin, Download, Clock, Calendar,
  AlertCircle, LayoutDashboard, ArrowUpRight, CheckCircle, TrendingUp,
} from 'lucide-react';
import { Assignment, DailyReport, CheckIn, LeaveRequest, Client, User, Site } from '../../types';
import { exportToCSV } from '../../lib/export';
import { StorageService } from '../../lib/storage';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'reports' | 'enterprise' | 'muster';

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard },
  { id: 'reports',    label: 'Reports',     icon: FileText        },
  { id: 'enterprise', label: 'Attendance',  icon: Clock           },
  { id: 'muster',     label: 'Muster Roll', icon: Calendar        },
];

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.25, 0.1, 0.25, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.16 } },
};
const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function useCounter(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => { const p = Math.min((now - start) / duration, 1); setVal(Math.floor(p * target)); if (p < 1) raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target]);
  return val;
}
function AnimatedNumber({ value }: { value: number }) { return <>{useCounter(value)}</>; }

export default function ClientDashboard() {
  const { user } = useAuth();
  const [client, setClient]         = useState<Client | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports]       = useState<DailyReport[]>([]);
  const [checkIns, setCheckIns]     = useState<CheckIn[]>([]);
  const [leaves, setLeaves]         = useState<LeaveRequest[]>([]);
  const [tab, setTab]               = useState<Tab>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [engineers, setEngineers]   = useState<User[]>([]);
  const [sites, setSites]           = useState<Site[]>([]);
  const [loading, setLoading]       = useState(true);
  const [chartData, setChartData]   = useState<{ trend: any[]; statusBreakdown: any[] }>({ trend: [], statusBreakdown: [] });

  useEffect(() => { loadData(); }, [user, selectedDate]);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const [ac, aa, ar, aci, al, ae, as_] = await Promise.all([
        StorageService.getClients(), StorageService.getAssignments(), StorageService.getDailyReports(),
        StorageService.getCheckIns(), StorageService.getLeaveRequests(), StorageService.getEngineers(), StorageService.getSites(),
      ]);
      const engList = Array.isArray(ae) ? ae : (ae as any).data || [];
      setEngineers(engList);
      setSites(Array.isArray(as_) ? as_ : (as_ as any).data || []);
      const cd = ac.find((c: Client) => (user.clientId && c.id === user.clientId) || c.email === user.email || c.userId === user.id || (c.contactPerson && c.contactPerson.toLowerCase() === user.name.toLowerCase()));
      if (!cd) { setLoading(false); return; }
      setClient(cd);
      const ca = aa.filter((a: Assignment) => a.clientId === cd.id);
      setAssignments(ca);
      const eids = ca.map((a: Assignment) => a.engineerId);
      const myReports  = ar.filter((r: DailyReport) => r.date === selectedDate && eids.includes(r.engineerId));
      const myCIs      = aci.filter((c: CheckIn) => c.date === selectedDate && eids.includes(c.engineerId));
      const myLeaves   = al.filter((l: LeaveRequest) => l.status === 'approved' && eids.includes(l.engineerId));
      setReports(myReports); setCheckIns(myCIs); setLeaves(myLeaves);

      // Charts: 7-day check-in trend
      const trend = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const ds = d.toISOString().split('T')[0];
        return { day: d.toLocaleDateString('en-US', { weekday: 'short' }), checkins: aci.filter((c: CheckIn) => c.date === ds && eids.includes(c.engineerId)).length, reports: ar.filter((r: DailyReport) => r.date === ds && eids.includes(r.engineerId)).length };
      });

      const todayCI = myCIs.length;
      const onLeaveToday = myLeaves.filter((l: LeaveRequest) => { const t = new Date(selectedDate); return new Date(l.startDate) <= t && new Date(l.endDate) >= t; }).length;
      const off = Math.max(0, ca.length - todayCI - onLeaveToday);
      setChartData({
        trend,
        statusBreakdown: [
          { name: 'On Site',  value: todayCI,      fill: '#22c55e' },
          { name: 'On Leave', value: onLeaveToday,  fill: '#f59e0b' },
          { name: 'Off',      value: off,           fill: '#e2e8f0' },
        ].filter(x => x.value > 0),
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const getEng  = (id: string) => engineers.find(e => e.id === id);
  const getSite  = (id: string) => sites.find(s => s.id === id);
  const onLeave  = (eid: string) => {
    const t = new Date(selectedDate);
    return leaves.find(l => l.engineerId === eid && new Date(l.startDate) <= t && new Date(l.endDate) >= t);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-slate-200 border-t-amber-500 rounded-full mx-auto" />
        <p className="text-slate-500 text-sm font-medium">Loading your portal…</p>
      </div>
    </div>
  );

  const onLeaveCount = assignments.filter(a => onLeave(a.engineerId)).length;
  const activeCount  = checkIns.filter(c => !c.checkOutTime).length;
  const today        = new Date();
  const greeting     = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  const statBlocks = [
    { label: 'Engineers',       value: assignments.length, icon: Users,       color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-100'  },
    { label: 'Reports Today',   value: reports.length,     icon: FileText,    color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
    { label: 'Check-ins Today', value: checkIns.length,    icon: MapPin,      color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100'   },
    { label: 'On Leave',        value: onLeaveCount,       icon: Calendar,    color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-100'   },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ─── SIDEBAR ─── */}
      <aside className="w-60 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 flex flex-col z-30">
        <div className="px-4 pt-5 pb-4 border-b border-slate-100">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-base shrink-0">
              {client?.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{client?.name || 'Client'}</p>
              <p className="text-slate-400 text-xs">{greeting}</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg text-xs font-semibold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            {assignments.length} Engineers Active
          </motion.div>
        </div>
        <nav className="flex-1 px-3 pt-4 pb-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Navigation</p>
          {NAV.map((n, i) => (
            <motion.button key={n.id} onClick={() => setTab(n.id)}
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left relative ${
                tab === n.id ? 'bg-amber-500 text-white font-semibold shadow-sm shadow-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}>
              {tab === n.id && <motion.span layoutId="clientNavIndicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/60 rounded-r-full" transition={{ type: 'spring', stiffness: 400, damping: 35 }} />}
              <n.icon className="w-4 h-4 shrink-0" /><span className="truncate">{n.label}</span>
            </motion.button>
          ))}
        </nav>
        <div className="px-3 pb-5 pt-3 border-t border-slate-100">
          {(tab === 'overview' || tab === 'reports' || tab === 'enterprise') && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date</p>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400 transition-all" />
            </div>
          )}
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">{NAV.find(n => n.id === tab)?.label}</h1>
            <p className="text-slate-400 text-xs mt-0.5">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <AnimatePresence>
            {activeCount > 0 && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 text-xs font-semibold">{activeCount} on site now</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            <motion.div key={tab} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">

              {/* Stat cards */}
              <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statBlocks.map(s => (
                  <motion.div key={s.label} variants={fadeUp} whileHover={{ y: -3, boxShadow: '0 8px 24px -4px rgba(0,0,0,0.08)' }}
                    className={`bg-white rounded-xl border p-5 ${s.border} flex items-center gap-4 cursor-default transition-shadow`}>
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                    <div><p className="text-2xl font-bold text-slate-900"><AnimatedNumber value={s.value} /></p><p className="text-slate-500 text-xs font-medium mt-0.5">{s.label}</p></div>
                  </motion.div>
                ))}
              </motion.div>

              {/* ── OVERVIEW ── */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  {/* Charts */}
                  <div className="grid gap-5 lg:grid-cols-3">
                    <motion.div variants={fadeUp} className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><p className="text-sm font-bold text-slate-800">7-Day Activity</p><p className="text-xs text-slate-400 mt-0.5">Check-ins & reports on your site</p></div>
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full ring-1 ring-amber-200">This Week</span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData.trend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <defs>
                            <linearGradient id="clientGrad1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                            <linearGradient id="clientGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.12} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                          <Area type="monotone" dataKey="checkins" stroke="#f59e0b" strokeWidth={2.5} fill="url(#clientGrad1)" dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Check-ins" />
                          <Area type="monotone" dataKey="reports" stroke="#8b5cf6" strokeWidth={2} fill="url(#clientGrad2)" dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 0 }} activeDot={{ r: 4 }} name="Reports" />
                        </AreaChart>
                      </ResponsiveContainer>
                      <div className="flex gap-4 mt-3">
                        {[{ c: '#f59e0b', l: 'Check-ins' }, { c: '#8b5cf6', l: 'Reports' }].map(i => (
                          <div key={i.l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: i.c }} /><span className="text-xs font-medium text-slate-500">{i.l}</span></div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 p-5">
                      <p className="text-sm font-bold text-slate-800 mb-1">Today's Status</p>
                      <p className="text-xs text-slate-400 mb-4">Engineer presence breakdown</p>
                      {chartData.statusBreakdown.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                              <Pie data={chartData.statusBreakdown} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3} dataKey="value">
                                {chartData.statusBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                              </Pie>
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-col gap-1.5 mt-2">
                            {chartData.statusBreakdown.map(d => (
                              <div key={d.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: d.fill }} /><span className="text-xs text-slate-500">{d.name}</span></div>
                                <span className="text-xs font-bold text-slate-700">{d.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <p className="text-slate-400 text-xs text-center py-12">No data for today</p>}
                    </motion.div>
                  </div>

                  {/* Engineer cards */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-slate-700 text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-slate-400" />Assigned Engineers</p>
                      <span className="text-slate-400 text-xs bg-slate-100 px-3 py-1 rounded-full">{assignments.length} total</span>
                    </div>
                    <motion.div variants={stagger} initial="initial" animate="animate" className="grid gap-3 md:grid-cols-2">
                      {assignments.length > 0 ? assignments.map((a, idx) => {
                        const eng   = getEng(a.engineerId);
                        const site  = a.siteId ? getSite(a.siteId) : null;
                        const leave = onLeave(a.engineerId);
                        const backup = leave?.backupEngineerId ? getEng(leave.backupEngineerId) : null;
                        const colors = ['bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-violet-500'];
                        const color = colors[idx % colors.length];
                        return (
                          <motion.div key={a.id} variants={fadeUp} whileHover={{ y: -2, boxShadow: '0 8px 20px -4px rgba(0,0,0,0.08)' }}
                            className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-200 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{eng?.name?.charAt(0) || '?'}</div>
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{eng?.name || 'Unknown'}</p>
                                <p className="text-slate-400 text-xs">{eng?.email}</p>
                                {site && <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5"><MapPin className="w-2.5 h-2.5 text-amber-400" />{site.name}</p>}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {leave ? (
                                <>
                                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 text-xs font-semibold">On Leave</span>
                                  {backup && <p className="text-slate-400 text-xs mt-1.5">Backup: {backup.name}</p>}
                                </>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs font-semibold">Active</span>
                              )}
                            </div>
                          </motion.div>
                        );
                      }) : (
                        <div className="col-span-2 py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center"><Users className="w-5 h-5 text-amber-400" /></div>
                            <p className="text-slate-500 text-sm font-medium">No engineers assigned yet</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </div>
              )}

              {/* ── ATTENDANCE ── */}
              {tab === 'enterprise' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-700 text-sm font-semibold">Daily Attendance</p>
                    <span className="text-slate-400 text-xs bg-slate-100 px-3 py-1 rounded-full">{checkIns.length} check-ins</span>
                  </div>
                  <div className="space-y-3">
                    {checkIns.length > 0 ? checkIns.map((ci, idx) => {
                      const eng = getEng(ci.engineerId);
                      return (
                        <motion.div key={ci.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          whileHover={{ y: -2 }}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-200 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${ci.checkOutTime ? 'bg-slate-100 border-slate-200' : 'bg-emerald-600 border-emerald-200'}`}>
                              {ci.checkOutTime ? <Clock className="w-4 h-4 text-slate-400" /> : <span className="text-white font-bold text-sm">{eng?.name?.charAt(0) || '?'}</span>}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{eng?.name || 'Unknown'}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">IN: {new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {ci.checkOutTime ? (
                                  <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">OUT: {new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                ) : (
                                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />On Site
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {ci.latitude && ci.longitude && (
                            <motion.a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer"
                              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                              className="flex items-center gap-2 text-amber-700 text-xs font-semibold bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg transition-colors shrink-0 border border-amber-200 group">
                              <MapPin className="w-3.5 h-3.5" />View Map<ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </motion.a>
                          )}
                        </motion.div>
                      );
                    }) : (
                      <div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center"><Clock className="w-5 h-5 text-blue-400" /></div>
                          <p className="text-slate-500 text-sm font-medium">No check-ins for this date</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── REPORTS ── */}
              {tab === 'reports' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-700 text-sm font-semibold">Work Reports</p>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => exportToCSV(reports.map(r => { const eng = getEng(r.engineerId); return { Engineer: eng?.name || '', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' }; }), `reports-${client?.name || 'client'}-${selectedDate}`)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all">
                      <Download className="w-3.5 h-3.5" />Export CSV
                    </motion.button>
                  </div>
                  <div className="space-y-3">
                    {reports.length > 0 ? reports.map((r, idx) => {
                      const eng  = getEng(r.engineerId);
                      const site = r.siteId ? getSite(r.siteId) : null;
                      return (
                        <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                          whileHover={{ y: -2 }}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-amber-200 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0">{eng?.name?.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-800 text-sm">{eng?.name || 'Staff'}</p>
                              {site && <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">{site.name}</span>}
                            </div>
                            <span className="text-slate-400 text-xs shrink-0">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="px-5 py-4 space-y-2.5">
                            <div>
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Work Done</p>
                              <p className="text-slate-600 text-sm leading-relaxed">{r.workDone}</p>
                            </div>
                            {r.issues && (
                              <div className="flex gap-2 bg-red-50 rounded-lg p-3 border border-red-100">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-red-600 text-sm">{r.issues}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    }) : (
                      <div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center"><FileText className="w-5 h-5 text-violet-400" /></div>
                          <p className="text-slate-500 text-sm font-medium">No reports for this date</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'muster' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 min-h-[500px]">
                  <MusterRoll clientId={client?.id} />
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
