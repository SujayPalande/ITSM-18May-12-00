import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, MapPin, Download, Building2, Clock, Calendar, AlertCircle, LayoutDashboard, TrendingUp, Sparkles, ArrowUpRight } from 'lucide-react';
import { Assignment, DailyReport, CheckIn, LeaveRequest, Client, User, Site } from '../../types';
import { exportToCSV } from '../../lib/export';
import { StorageService } from '../../lib/storage';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'reports' | 'enterprise' | 'muster';

const NAV: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard, desc: 'Site summary' },
  { id: 'reports',    label: 'Reports',     icon: FileText,        desc: 'Work logs' },
  { id: 'enterprise', label: 'Attendance',  icon: Clock,           desc: 'Daily check-ins' },
  { id: 'muster',     label: 'Muster Roll', icon: Calendar,        desc: 'Monthly register' },
];

export default function ClientDashboard() {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [engineers, setEngineers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [user, selectedDate]);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const [ac, aa, ar, aci, al, ae, as_] = await Promise.all([
        StorageService.getClients(), StorageService.getAssignments(), StorageService.getDailyReports(),
        StorageService.getCheckIns(), StorageService.getLeaveRequests(), StorageService.getEngineers(), StorageService.getSites(),
      ]);
      setEngineers(Array.isArray(ae) ? ae : (ae as any).data || []);
      setSites(Array.isArray(as_) ? as_ : (as_ as any).data || []);
      const cd = ac.find((c: Client) => (user.clientId && c.id === user.clientId) || c.email === user.email || c.userId === user.id || (c.contactPerson && c.contactPerson.toLowerCase() === user.name.toLowerCase()));
      if (!cd) { setLoading(false); return; }
      setClient(cd);
      const ca = aa.filter((a: Assignment) => a.clientId === cd.id);
      setAssignments(ca);
      const eids = ca.map((a: Assignment) => a.engineerId);
      setReports(ar.filter((r: DailyReport) => r.date === selectedDate && eids.includes(r.engineerId)));
      setCheckIns(aci.filter((c: CheckIn) => c.date === selectedDate && eids.includes(c.engineerId)));
      setLeaves(al.filter((l: LeaveRequest) => l.status === 'approved' && eids.includes(l.engineerId)));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const getEng = (id: string) => engineers.find(e => e.id === id);
  const getSite = (id: string) => sites.find(s => s.id === id);
  const onLeave = (eid: string) => {
    const t = new Date(selectedDate);
    return leaves.find(l => l.engineerId === eid && new Date(l.startDate) <= t && new Date(l.endDate) >= t);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f0f2f7] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-amber-100 border-t-amber-500 rounded-full animate-spin mx-auto shadow-sm" />
        <p className="text-slate-400 text-sm font-semibold">Loading your portal...</p>
      </div>
    </div>
  );

  const onLeaveCount = assignments.filter(a => onLeave(a.engineerId)).length;
  const activeCount = checkIns.filter(c => !c.checkOutTime).length;

  const statBlocks = [
    { label: 'Engineers',       value: assignments.length, icon: Users,    gradient: 'from-amber-500 to-orange-500',  desc: 'Assigned to your site' },
    { label: 'Reports Today',   value: reports.length,     icon: FileText, gradient: 'from-violet-500 to-purple-600', desc: 'Work logs submitted' },
    { label: 'Check-ins Today', value: checkIns.length,    icon: MapPin,   gradient: 'from-blue-500 to-indigo-600',   desc: 'Present on site' },
    { label: 'On Leave',        value: onLeaveCount,       icon: Calendar, gradient: 'from-rose-500 to-red-600',      desc: 'Approved leave today' },
  ];

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="flex min-h-screen bg-[#f0f2f7]">

      {/* ─── SIDEBAR ─── */}
      <aside className="w-64 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[#0d1117] flex flex-col z-30">
        <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />

        {/* Client identity */}
        <div className="px-4 pt-5 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-amber-900/40">
              {client?.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{client?.name || 'Client'}</p>
              <p className="text-white/30 text-[11px] font-medium">{greeting}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-emerald-400 text-[11px] font-semibold">{assignments.length} Engineers Active</span>
          </div>
        </div>

        <div className="px-3 pt-5 pb-4 flex-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-3 px-2">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group ${
                  tab === n.id
                    ? 'bg-amber-500 text-white font-semibold shadow-lg shadow-amber-900/40'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06] font-medium'
                }`}>
                <n.icon className={`w-4 h-4 shrink-0 ${tab === n.id ? 'text-white' : 'text-white/30 group-hover:text-white/70'}`} />
                <span className="truncate flex-1">{n.label}</span>
                {tab === n.id && <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Date filter */}
        <div className="px-3 pb-6 pt-4 border-t border-white/[0.06]">
          {(tab === 'overview' || tab === 'reports' || tab === 'enterprise') && (
            <div>
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-2 px-1">Date Filter</p>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-amber-500/40 focus:bg-white/[0.08] transition-all" />
            </div>
          )}
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-64 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {NAV.find(n => n.id === tab)?.label}
                {tab === 'overview' && <Sparkles className="w-4 h-4 text-amber-400" />}
              </h1>
              <p className="text-slate-400 text-xs mt-0.5 font-medium">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            {activeCount > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700 text-xs font-bold">{activeCount} on site now</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 p-8 space-y-7">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {statBlocks.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/80 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden relative">
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.gradient} rounded-t-2xl`} />
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4 shadow-sm`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-4xl font-black text-slate-900 tracking-tight tabular-nums">{s.value}</p>
                <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1.5">{s.label}</p>
                <p className="text-slate-300 text-[10px] mt-1 font-medium">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-slate-700 text-sm font-bold">Assigned Engineers</p>
                <span className="ml-auto text-slate-400 text-xs font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{assignments.length} total</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {assignments.length > 0 ? assignments.map((a, idx) => {
                  const eng = getEng(a.engineerId);
                  const site = a.siteId ? getSite(a.siteId) : null;
                  const leave = onLeave(a.engineerId);
                  const backup = leave?.backupEngineerId ? getEng(leave.backupEngineerId) : null;
                  const colors = ['from-amber-400 to-orange-500', 'from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-violet-400 to-purple-500'];
                  const color = colors[idx % colors.length];
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all duration-150 group">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0`}>
                          {eng?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{eng?.name || 'Unknown'}</p>
                          <p className="text-slate-400 text-xs font-medium">{eng?.email}</p>
                          {site && (
                            <p className="text-slate-300 text-[11px] flex items-center gap-1 mt-0.5 font-medium">
                              <MapPin className="w-3 h-3 text-amber-400" />{site.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {leave ? (
                          <>
                            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wide">On Leave</span>
                            {backup && <p className="text-slate-400 text-[10px] mt-1.5 font-medium">Backup: {backup.name}</p>}
                          </>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wide">Active</span>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-2 py-24 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center"><Users className="w-7 h-7 text-amber-400" /></div>
                      <p className="text-slate-600 text-sm font-bold">No engineers assigned</p>
                      <p className="text-slate-400 text-xs font-medium">Contact your admin to get engineers assigned</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === 'enterprise' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <p className="text-slate-700 text-sm font-bold">Daily Attendance</p>
                <span className="ml-auto text-slate-400 text-xs font-semibold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{checkIns.length} check-ins</span>
              </div>
              <div className="space-y-3">
                {checkIns.length > 0 ? checkIns.map(ci => {
                  const eng = getEng(ci.engineerId);
                  return (
                    <div key={ci.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all duration-150">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm ${ci.checkOutTime ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-200'}`}>
                          {ci.checkOutTime
                            ? <Clock className="w-5 h-5 text-slate-400" />
                            : <span className="text-white font-bold text-base">{eng?.name?.charAt(0) || '?'}</span>
                          }
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{eng?.name || 'Unknown'}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">IN: {new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {ci.checkOutTime ? (
                              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">OUT: {new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />On Site
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {ci.latitude && ci.longitude && (
                        <a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 text-amber-700 text-xs font-bold bg-amber-50 hover:bg-amber-100 px-4 py-2.5 rounded-xl transition-colors shrink-0 border border-amber-200 shadow-sm group">
                          <MapPin className="w-3.5 h-3.5" />View Map
                          <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </a>
                      )}
                    </div>
                  );
                }) : (
                  <div className="py-24 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center"><Clock className="w-7 h-7 text-blue-400" /></div>
                      <p className="text-slate-600 text-sm font-bold">No check-ins for this date</p>
                      <p className="text-slate-400 text-xs font-medium">Try selecting a different date</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-violet-500" />
                  <p className="text-slate-700 text-sm font-bold">Work Reports</p>
                </div>
                <button onClick={() => exportToCSV(reports.map(r => { const eng = getEng(r.engineerId); return { Engineer: eng?.name || '', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' }; }), `reports-${client?.name || 'client'}-${selectedDate}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                  <Download className="w-3.5 h-3.5" />Export CSV
                </button>
              </div>
              <div className="space-y-3">
                {reports.length > 0 ? reports.map(r => {
                  const eng = getEng(r.engineerId);
                  const site = r.siteId ? getSite(r.siteId) : null;
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-amber-200 hover:shadow-md transition-all duration-150">
                      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 bg-gradient-to-r from-slate-50/80 to-transparent">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">{eng?.name?.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{eng?.name || 'Staff'}</p>
                          {site && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">{site.name}</span>}
                        </div>
                        <span className="text-slate-400 text-xs shrink-0 font-semibold bg-white border border-slate-100 px-2.5 py-1 rounded-full shadow-sm">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="px-6 py-4 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Work Done</p>
                          <p className="text-slate-600 text-sm leading-relaxed">{r.workDone}</p>
                        </div>
                        {r.issues && (
                          <div className="flex gap-2.5 bg-red-50 rounded-xl p-3 border border-red-100">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-red-600 text-sm">{r.issues}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-24 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center"><FileText className="w-7 h-7 text-violet-400" /></div>
                      <p className="text-slate-600 text-sm font-bold">No reports for this date</p>
                      <p className="text-slate-400 text-xs font-medium">Try selecting a different date</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MUSTER ── */}
          {tab === 'muster' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6 min-h-[500px]">
              <MusterRoll clientId={client?.id} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
