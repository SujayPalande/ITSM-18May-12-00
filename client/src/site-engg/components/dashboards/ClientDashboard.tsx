import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, MapPin, Download, Building2, Clock, Calendar, AlertCircle, LayoutDashboard } from 'lucide-react';
import { Assignment, DailyReport, CheckIn, LeaveRequest, Client, User, Site } from '../../types';
import { exportToCSV } from '../../lib/export';
import { StorageService } from '../../lib/storage';
import MusterRoll from '../MusterRoll';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'enterprise' | 'muster'>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [engineers, setEngineers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [user, selectedDate]);

  async function loadData() {
    if (!user) return;
    try {
      setLoading(true);
      const [allClients, allAssignments, allReports, allCheckIns, allLeaves, allEngineers, allSites] = await Promise.all([
        StorageService.getClients(), StorageService.getAssignments(), StorageService.getDailyReports(),
        StorageService.getCheckIns(), StorageService.getLeaveRequests(), StorageService.getEngineers(), StorageService.getSites(),
      ]);
      setEngineers(Array.isArray(allEngineers) ? allEngineers : (allEngineers as any).data || []);
      setSites(Array.isArray(allSites) ? allSites : (allSites as any).data || []);
      const clientData = allClients.find((c: Client) =>
        (user.clientId && c.id === user.clientId) || c.email === user.email ||
        c.userId === user.id || (c.contactPerson && c.contactPerson.toLowerCase() === user.name.toLowerCase())
      );
      if (!clientData) { setLoading(false); return; }
      setClient(clientData);
      const clientAssignments = allAssignments.filter((a: Assignment) => a.clientId === clientData.id);
      setAssignments(clientAssignments);
      const engineerIds = clientAssignments.map((a: Assignment) => a.engineerId);
      setReports(allReports.filter((r: DailyReport) => r.date === selectedDate && engineerIds.includes(r.engineerId)));
      setCheckIns(allCheckIns.filter((c: CheckIn) => c.date === selectedDate && engineerIds.includes(c.engineerId)));
      setLeaves(allLeaves.filter((l: LeaveRequest) => l.status === 'approved' && engineerIds.includes(l.engineerId)));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally { setLoading(false); }
  }

  function getEngineerById(id: string): User | undefined { return engineers.find(e => e.id === id); }
  function getSiteById(id: string): Site | undefined { return sites.find(s => s.id === id); }
  function isEngineerOnLeave(engineerId: string): LeaveRequest | undefined {
    const today = new Date(selectedDate);
    return leaves.find(leave => {
      const start = new Date(leave.startDate), end = new Date(leave.endDate);
      return leave.engineerId === engineerId && today >= start && today <= end;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm font-medium">Loading portal...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview',    label: 'Overview',   icon: LayoutDashboard },
    { id: 'reports',     label: 'Reports',    icon: FileText },
    { id: 'enterprise',  label: 'Attendance', icon: Clock },
    { id: 'muster',      label: 'Muster Roll',icon: Calendar },
  ];

  const onLeaveCount = assignments.filter(a => isEngineerOnLeave(a.engineerId)).length;

  return (
    <div className="min-h-screen bg-slate-100 pb-16">

      {/* ═══ HERO BANNER ═══ */}
      <div className="bg-gradient-to-br from-amber-700 via-amber-600 to-orange-500 text-white">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 pt-8 pb-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-amber-200 text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Client Portal
              </p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{client?.name || 'Overview'}</h1>
              <p className="text-amber-200 text-sm mt-1">Project oversight & workforce analytics</p>
            </div>
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {assignments.length} Engineers Assigned
            </div>
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Engineers',        value: assignments.length, icon: Users },
              { label: "Today's Reports",  value: reports.length,     icon: FileText },
              { label: 'Check-ins Today',  value: checkIns.length,    icon: MapPin },
              { label: 'On Leave',         value: onLeaveCount,       icon: Calendar },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="w-3 h-3 text-amber-200" />
                  <p className="text-amber-200 text-[9px] font-bold uppercase tracking-widest">{s.label}</p>
                </div>
                <p className="text-white text-lg font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tab nav */}
          <div className="flex gap-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-xl transition-all ${
                  activeTab === tab.id ? 'bg-slate-100 text-amber-700' : 'text-amber-100/80 hover:text-white hover:bg-white/10'
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
      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-6">

        {/* Date filter for relevant tabs */}
        {(activeTab === 'overview' || activeTab === 'reports' || activeTab === 'enterprise') && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3.5 mb-5">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 rounded-lg px-4 py-2 text-sm text-slate-700 outline-none transition-all"
            />
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
              <Users className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-slate-900 text-sm">Assigned Engineers</h3>
              <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{assignments.length} total</span>
            </div>
            <div className="p-5">
              {assignments.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {assignments.map(assignment => {
                    const engineer = getEngineerById(assignment.engineerId);
                    const site = assignment.siteId ? getSiteById(assignment.siteId) : null;
                    const leave = isEngineerOnLeave(assignment.engineerId);
                    const backupEngineer = leave?.backupEngineerId ? getEngineerById(leave.backupEngineerId) : null;
                    return (
                      <div key={assignment.id} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-white shadow-sm flex items-center justify-center text-amber-700 font-bold text-base">
                            {engineer?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-900 text-sm">{engineer?.name || 'Unknown'}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">{engineer?.email}</p>
                            {site && (
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />{site.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {leave ? (
                            <>
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">On Leave</span>
                              {backupEngineer && <p className="text-[10px] text-slate-400 mt-1">Backup: {backupEngineer.name}</p>}
                            </>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">Active</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No engineers assigned yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {activeTab === 'enterprise' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-slate-900 text-sm">Daily Attendance</h3>
              <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">{checkIns.length} check-ins</span>
            </div>
            <div className="p-5 space-y-3">
              {checkIns.length > 0 ? checkIns.map(checkIn => {
                const engineer = getEngineerById(checkIn.engineerId);
                return (
                  <div key={checkIn.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${checkIn.checkOutTime ? 'bg-slate-200' : 'bg-emerald-500'}`}>
                        <Clock className={`w-4 h-4 ${checkIn.checkOutTime ? 'text-slate-500' : 'text-white'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm">{engineer?.name || 'Unknown'}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                            IN: {new Date(checkIn.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {checkIn.checkOutTime ? (
                            <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                              OUT: {new Date(checkIn.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">Active</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {checkIn.latitude && checkIn.longitude && (
                      <a href={`https://www.google.com/maps?q=${checkIn.latitude},${checkIn.longitude}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-amber-600 text-xs font-bold bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg transition-colors shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                        View on Map
                      </a>
                    )}
                  </div>
                );
              }) : (
                <div className="text-center py-12">
                  <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No check-ins for this date</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REPORTS ── */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
              <FileText className="w-4 h-4 text-slate-400" />
              <h3 className="font-bold text-slate-900 text-sm">Work Reports</h3>
              <button
                onClick={() => {
                  const exportData = reports.map(r => {
                    const engineer = getEngineerById(r.engineerId);
                    const site = r.siteId ? getSiteById(r.siteId) : null;
                    return { Engineer: engineer?.name || '', Site: site?.name || '-', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' };
                  });
                  exportToCSV(exportData, `reports-${client?.name || 'client'}-${selectedDate}`);
                }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
            <div className="p-5 space-y-4">
              {reports.length > 0 ? reports.map(report => {
                const engineer = getEngineerById(report.engineerId);
                const site = report.siteId ? getSiteById(report.siteId) : null;
                return (
                  <div key={report.id} className="rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                        {engineer?.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{engineer?.name || 'Staff'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {site && <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{site.name}</span>}
                          <span className="text-[10px] text-slate-400">{new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Activities Completed</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{report.workDone}</p>
                      </div>
                      {report.issues && (
                        <div className="flex gap-2.5 bg-red-50 rounded-lg p-3 border border-red-100">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Issues Noted</p>
                            <p className="text-sm text-red-700">{report.issues}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-12">
                  <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">No reports for this date</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MUSTER ROLL ── */}
        {activeTab === 'muster' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
            <MusterRoll clientId={client?.id} />
          </div>
        )}
      </div>
    </div>
  );
}
