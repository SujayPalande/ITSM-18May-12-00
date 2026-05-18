import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, MapPin, Download, Building2, Clock, Calendar, AlertCircle, LayoutDashboard } from 'lucide-react';
import { Assignment, DailyReport, CheckIn, LeaveRequest, Client, User, Site } from '../../types';
import { exportToCSV } from '../../lib/export';
import { StorageService } from '../../lib/storage';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'reports' | 'enterprise' | 'muster';

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard },
  { id: 'reports',    label: 'Reports',     icon: FileText },
  { id: 'enterprise', label: 'Attendance',  icon: Clock },
  { id: 'muster',     label: 'Muster Roll', icon: Calendar },
];

const TH = 'px-5 py-3.5 text-left text-[10px] font-black text-white/30 uppercase tracking-widest';

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
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
      <div className="text-center"><div className="w-10 h-10 border-2 border-amber-800 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" /><p className="text-white/30 text-sm font-semibold">Loading your portal...</p></div>
    </div>
  );

  const onLeaveCount = assignments.filter(a => onLeave(a.engineerId)).length;

  const statBlocks = [
    { label: 'Engineers',       value: assignments.length, icon: Users,    color: 'from-amber-500 to-orange-600' },
    { label: 'Reports Today',   value: reports.length,     icon: FileText, color: 'from-violet-500 to-violet-700' },
    { label: 'Check-ins Today', value: checkIns.length,    icon: MapPin,   color: 'from-blue-500 to-blue-700' },
    { label: 'On Leave',        value: onLeaveCount,       icon: Calendar, color: 'from-red-500 to-red-700' },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0f1e]">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-56 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[#0f172a] border-r border-white/[0.06] flex flex-col z-30">
        <div className="px-4 pt-6 pb-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-base shadow-lg shadow-amber-900/50">
              {client?.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-sm truncate">{client?.name || 'Client'}</p>
              <p className="text-white/30 text-[11px]">Client Portal</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-emerald-300 text-[11px] font-bold">{assignments.length} Engineers Active</span>
          </div>
        </div>

        <div className="px-4 pt-5 pb-4">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.25em] mb-3">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === n.id ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                <n.icon className={`w-4 h-4 shrink-0 ${tab === n.id ? 'text-amber-400' : 'text-white/30'}`} />
                {n.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto px-4 pb-6 pt-4 border-t border-white/[0.06]">
          {(tab === 'overview' || tab === 'reports' || tab === 'enterprise') && (
            <div>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Date Filter</p>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 outline-none focus:border-amber-500/50 transition-all" />
            </div>
          )}
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-56 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4">
          <h1 className="text-lg font-black text-white tracking-tight">{NAV.find(n => n.id === tab)?.label}</h1>
          <p className="text-white/30 text-xs mt-0.5">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        <div className="flex-1 p-8 space-y-8">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {statBlocks.map(s => (
              <div key={s.label} className="relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08] p-6 hover:border-white/20 transition-all">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <s.icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-3xl font-black text-white tracking-tighter">{s.value}</p>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div>
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">Assigned Engineers</p>
              <div className="grid gap-3 md:grid-cols-2">
                {assignments.length > 0 ? assignments.map(a => {
                  const eng = getEng(a.engineerId);
                  const site = a.siteId ? getSite(a.siteId) : null;
                  const leave = onLeave(a.engineerId);
                  const backup = leave?.backupEngineerId ? getEng(leave.backupEngineerId) : null;
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-base shrink-0">
                          {eng?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{eng?.name || 'Unknown'}</p>
                          <p className="text-white/30 text-xs">{eng?.email}</p>
                          {site && <p className="text-white/20 text-[11px] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{site.name}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {leave ? (
                          <>
                            <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">On Leave</span>
                            {backup && <p className="text-white/25 text-[10px] mt-1">Backup: {backup.name}</p>}
                          </>
                        ) : (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider">Active</span>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-2 py-16 rounded-2xl border border-dashed border-white/[0.08] text-center text-white/20 text-sm">No engineers assigned</div>
                )}
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === 'enterprise' && (
            <div className="space-y-4">
              <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Daily Attendance</p>
              <div className="space-y-3">
                {checkIns.length > 0 ? checkIns.map(ci => {
                  const eng = getEng(ci.engineerId);
                  return (
                    <div key={ci.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 ${ci.checkOutTime ? 'bg-white/5 border-white/10' : 'bg-emerald-500/20 border-emerald-500/30'}`}>
                          <Clock className={`w-4 h-4 ${ci.checkOutTime ? 'text-white/30' : 'text-emerald-300'}`} />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{eng?.name || 'Unknown'}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[11px] font-bold text-white/50 bg-white/[0.06] px-2 py-0.5 rounded-lg">IN: {new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {ci.checkOutTime ? (
                              <span className="text-[11px] font-bold text-white/50 bg-white/[0.06] px-2 py-0.5 rounded-lg">OUT: {new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg uppercase tracking-wider">On Site</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {ci.latitude && ci.longitude && (
                        <a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-amber-300 text-xs font-black bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-xl transition-colors shrink-0 border border-amber-500/20 uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5" />Map ↗
                        </a>
                      )}
                    </div>
                  );
                }) : (
                  <div className="py-16 rounded-2xl border border-dashed border-white/[0.08] text-center text-white/20 text-sm">No check-ins for this date</div>
                )}
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Work Reports</p>
                <button onClick={() => exportToCSV(reports.map(r => { const eng = getEng(r.engineerId); return { Engineer: eng?.name || '', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' }; }), `reports-${client?.name || 'client'}-${selectedDate}`)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 text-amber-300 rounded-xl text-xs font-black hover:bg-amber-500/30 transition-colors border border-amber-500/30 uppercase tracking-wider">
                  <Download className="w-3.5 h-3.5" />Export CSV
                </button>
              </div>
              <div className="space-y-3">
                {reports.length > 0 ? reports.map(r => {
                  const eng = getEng(r.engineerId);
                  const site = r.siteId ? getSite(r.siteId) : null;
                  return (
                    <div key={r.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden hover:border-white/20 transition-all">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06]">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-sm shrink-0">{eng?.name?.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm">{eng?.name || 'Staff'}</p>
                          {site && <span className="text-[10px] font-bold text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded-lg">{site.name}</span>}
                        </div>
                        <span className="text-white/20 text-xs">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="px-5 py-4 space-y-3">
                        <div>
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1.5">Work Done</p>
                          <p className="text-white/60 text-sm leading-relaxed">{r.workDone}</p>
                        </div>
                        {r.issues && (
                          <div className="flex gap-2.5 bg-red-950/30 rounded-xl p-3 border border-red-900/30">
                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-red-300/80 text-sm">{r.issues}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-16 rounded-2xl border border-dashed border-white/[0.08] text-center text-white/20 text-sm">No reports for this date</div>
                )}
              </div>
            </div>
          )}

          {/* ── MUSTER ── */}
          {tab === 'muster' && (
            <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white min-h-[500px]">
              <MusterRoll clientId={client?.id} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
