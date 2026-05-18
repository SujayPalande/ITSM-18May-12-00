import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, MapPin, Download, Building2, Clock, Calendar, AlertCircle, LayoutDashboard } from 'lucide-react';
import { Assignment, DailyReport, CheckIn, LeaveRequest, Client, User, Site } from '../../types';
import { exportToCSV } from '../../lib/export';
import { StorageService } from '../../lib/storage';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'reports' | 'enterprise' | 'muster';

const NAV: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'overview',   label: 'Overview',   icon: LayoutDashboard, desc: 'Site summary' },
  { id: 'reports',    label: 'Reports',    icon: FileText,        desc: 'Work logs' },
  { id: 'enterprise', label: 'Attendance', icon: Clock,           desc: 'Daily check-ins' },
  { id: 'muster',     label: 'Muster Roll', icon: Calendar,       desc: 'Monthly register' },
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm font-medium">Loading your portal...</p>
      </div>
    </div>
  );

  const onLeaveCount = assignments.filter(a => onLeave(a.engineerId)).length;

  const statBlocks = [
    { label: 'Engineers',       value: assignments.length, icon: Users,    bg: 'bg-amber-50',   iconColor: 'text-amber-600' },
    { label: 'Reports Today',   value: reports.length,     icon: FileText, bg: 'bg-violet-50',  iconColor: 'text-violet-600' },
    { label: 'Check-ins Today', value: checkIns.length,    icon: MapPin,   bg: 'bg-blue-50',    iconColor: 'text-blue-600' },
    { label: 'On Leave',        value: onLeaveCount,       icon: Calendar, bg: 'bg-red-50',     iconColor: 'text-red-500' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-60 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-100 flex flex-col z-30 shadow-[1px_0_0_0_#f1f5f9]">
        {/* Client identity */}
        <div className="px-5 pt-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-amber-200">
              {client?.name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-sm truncate">{client?.name || 'Client'}</p>
              <p className="text-slate-400 text-[11px] font-medium">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-emerald-700 text-[11px] font-semibold">{assignments.length} Engineers Active</span>
          </div>
        </div>

        <div className="px-3 pt-5 pb-4 flex-1 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group ${
                  tab === n.id
                    ? 'bg-amber-50 text-amber-700 font-semibold shadow-[inset_2px_0_0_#d97706]'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium'
                }`}>
                <n.icon className={`w-4 h-4 shrink-0 ${tab === n.id ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                <span className="truncate">{n.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Date filter */}
        <div className="px-4 pb-6 pt-4 border-t border-slate-100">
          {(tab === 'overview' || tab === 'reports' || tab === 'enterprise') && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Date Filter</p>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-50 transition-all" />
            </div>
          )}
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4">
          <h1 className="text-lg font-bold text-slate-800 tracking-tight">{NAV.find(n => n.id === tab)?.label}</h1>
          <p className="text-slate-400 text-xs mt-0.5">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        <div className="flex-1 p-8 space-y-7">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statBlocks.map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 border border-slate-50">
                <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                  <s.icon className={`w-[18px] h-[18px] ${s.iconColor}`} />
                </div>
                <p className="text-2xl font-bold text-slate-800 tracking-tight">{s.value}</p>
                <p className="text-slate-400 text-[11px] font-medium uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div>
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-4">Assigned Engineers</p>
              <div className="grid gap-3 md:grid-cols-2">
                {assignments.length > 0 ? assignments.map(a => {
                  const eng = getEng(a.engineerId);
                  const site = a.siteId ? getSite(a.siteId) : null;
                  const leave = onLeave(a.engineerId);
                  const backup = leave?.backupEngineerId ? getEng(leave.backupEngineerId) : null;
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-amber-100 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-150">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-base shrink-0">
                          {eng?.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{eng?.name || 'Unknown'}</p>
                          <p className="text-slate-400 text-xs">{eng?.email}</p>
                          {site && (
                            <p className="text-slate-300 text-[11px] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />{site.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {leave ? (
                          <>
                            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold uppercase tracking-wide">On Leave</span>
                            {backup && <p className="text-slate-400 text-[10px] mt-1">Backup: {backup.name}</p>}
                          </>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wide">Active</span>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="col-span-2 py-16 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center"><Users className="w-5 h-5 text-slate-400" /></div>
                      <p className="text-slate-400 text-sm font-medium">No engineers assigned</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === 'enterprise' && (
            <div className="space-y-4">
              <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest">Daily Attendance</p>
              <div className="space-y-3">
                {checkIns.length > 0 ? checkIns.map(ci => {
                  const eng = getEng(ci.engineerId);
                  return (
                    <div key={ci.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5 rounded-2xl bg-white border border-slate-100 hover:border-amber-100 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-150">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${ci.checkOutTime ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50 border-emerald-100'}`}>
                          <Clock className={`w-4 h-4 ${ci.checkOutTime ? 'text-slate-400' : 'text-emerald-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{eng?.name || 'Unknown'}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">IN: {new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {ci.checkOutTime ? (
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">OUT: {new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">On Site</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {ci.latitude && ci.longitude && (
                        <a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors shrink-0 border border-amber-100">
                          <MapPin className="w-3.5 h-3.5" />View Map ↗
                        </a>
                      )}
                    </div>
                  );
                }) : (
                  <div className="py-16 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <p className="text-slate-400 text-sm font-medium">No check-ins for this date</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest">Work Reports</p>
                <button onClick={() => exportToCSV(reports.map(r => { const eng = getEng(r.engineerId); return { Engineer: eng?.name || '', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' }; }), `reports-${client?.name || 'client'}-${selectedDate}`)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors">
                  <Download className="w-3.5 h-3.5" />Export CSV
                </button>
              </div>
              <div className="space-y-3">
                {reports.length > 0 ? reports.map(r => {
                  const eng = getEng(r.engineerId);
                  const site = r.siteId ? getSite(r.siteId) : null;
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-amber-100 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-150">
                      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 bg-slate-50/50">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-sm shrink-0">{eng?.name?.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{eng?.name || 'Staff'}</p>
                          {site && <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-lg">{site.name}</span>}
                        </div>
                        <span className="text-slate-400 text-xs shrink-0">{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="px-5 py-4 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Work Done</p>
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
                  <div className="py-16 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <p className="text-slate-400 text-sm font-medium">No reports for this date</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MUSTER ── */}
          {tab === 'muster' && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-50 overflow-hidden min-h-[500px]">
              <MusterRoll clientId={client?.id} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
