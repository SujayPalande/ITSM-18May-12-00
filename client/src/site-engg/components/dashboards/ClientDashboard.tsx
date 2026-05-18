import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, MapPin, Download, Building2, Clock, Calendar, AlertCircle, LayoutDashboard } from 'lucide-react';
import { Assignment, DailyReport, CheckIn, LeaveRequest, Client, User, Site } from '../../types';
import { exportToCSV } from '../../lib/export';
import { StorageService } from '../../lib/storage';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'reports' | 'enterprise' | 'muster';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard },
  { id: 'reports',    label: 'Reports',     icon: FileText },
  { id: 'enterprise', label: 'Attendance',  icon: Clock },
  { id: 'muster',     label: 'Muster Roll', icon: Calendar },
];

export default function ClientDashboard() {
  const { user } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-amber-100 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  const onLeaveCount = assignments.filter(a => isEngineerOnLeave(a.engineerId)).length;

  const statCards = [
    { label: 'Engineers',       value: assignments.length, icon: Users,    accent: 'blue' },
    { label: "Today's Reports", value: reports.length,     icon: FileText, accent: 'violet' },
    { label: 'Check-ins Today', value: checkIns.length,    icon: MapPin,   accent: 'emerald' },
    { label: 'On Leave',        value: onLeaveCount,       icon: Calendar, accent: 'amber' },
  ];

  const accentMap: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-600 border-blue-100',
    violet:  'bg-violet-50 text-violet-600 border-violet-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-20">
        <div className="max-w-6xl mx-auto px-5 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  {client?.name || 'Client Portal'}
                </h1>
                <p className="text-gray-400 text-sm mt-0.5">Project oversight & workforce analytics</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {assignments.length} Engineers Assigned
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 lg:px-8 py-6 space-y-6">

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${accentMap[s.accent]}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── DATE FILTER ── */}
        {(activeTab === 'overview' || activeTab === 'reports' || activeTab === 'enterprise') && (
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">
                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-gray-50 border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-50 rounded-xl px-4 py-2 text-sm text-gray-700 outline-none transition-all"
            />
          </div>
        )}

        {/* ── TABS ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-2 pt-2 flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <Users className="w-4 h-4 text-gray-400" />
                  <h3 className="font-bold text-gray-900 text-sm">Assigned Engineers</h3>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg font-semibold">{assignments.length} total</span>
                </div>
                {assignments.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {assignments.map(assignment => {
                      const engineer = getEngineerById(assignment.engineerId);
                      const site = assignment.siteId ? getSiteById(assignment.siteId) : null;
                      const leave = isEngineerOnLeave(assignment.engineerId);
                      const backupEngineer = leave?.backupEngineerId ? getEngineerById(leave.backupEngineerId) : null;
                      return (
                        <div key={assignment.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-base">
                              {engineer?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-sm">{engineer?.name || 'Unknown'}</h4>
                              <p className="text-xs text-gray-400 mt-0.5">{engineer?.email}</p>
                              {site && (
                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />{site.name}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {leave ? (
                              <>
                                <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-amber-200">On Leave</span>
                                {backupEngineer && <p className="text-[10px] text-gray-400 mt-1">Backup: {backupEngineer.name}</p>}
                              </>
                            ) : (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-emerald-200">Active</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="text-gray-400 text-sm font-medium">No engineers assigned yet</p>
                  </div>
                )}
              </div>
            )}

            {/* ── ATTENDANCE ── */}
            {activeTab === 'enterprise' && (
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <h3 className="font-bold text-gray-900 text-sm">Daily Attendance</h3>
                  <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg font-semibold">{checkIns.length} check-ins</span>
                </div>
                <div className="space-y-3">
                  {checkIns.length > 0 ? checkIns.map(checkIn => {
                    const engineer = getEngineerById(checkIn.engineerId);
                    return (
                      <div key={checkIn.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 border-white shadow-sm ${checkIn.checkOutTime ? 'bg-gray-200' : 'bg-emerald-500'}`}>
                            <Clock className={`w-4 h-4 ${checkIn.checkOutTime ? 'text-gray-500' : 'text-white'}`} />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm">{engineer?.name || 'Unknown'}</h4>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-lg">
                                IN: {new Date(checkIn.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {checkIn.checkOutTime ? (
                                <span className="text-[11px] font-semibold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-lg">
                                  OUT: {new Date(checkIn.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg uppercase tracking-wider border border-emerald-200">Active</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {checkIn.latitude && checkIn.longitude && (
                          <a href={`https://www.google.com/maps?q=${checkIn.latitude},${checkIn.longitude}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-amber-600 text-xs font-bold bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-xl transition-colors shrink-0 border border-amber-200">
                            <MapPin className="w-3.5 h-3.5" />
                            View on Map
                          </a>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-5 h-5 text-gray-300" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium">No check-ins for this date</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── REPORTS ── */}
            {activeTab === 'reports' && (
              <div>
                <div className="flex items-center gap-2.5 mb-5">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <h3 className="font-bold text-gray-900 text-sm">Work Reports</h3>
                  <button
                    onClick={() => {
                      const exportData = reports.map(r => {
                        const engineer = getEngineerById(r.engineerId);
                        const site = r.siteId ? getSiteById(r.siteId) : null;
                        return { Engineer: engineer?.name || '', Site: site?.name || '-', Date: r.date, WorkDone: r.workDone, Issues: r.issues || 'None' };
                      });
                      exportToCSV(exportData, `reports-${client?.name || 'client'}-${selectedDate}`);
                    }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                </div>
                <div className="space-y-4">
                  {reports.length > 0 ? reports.map(report => {
                    const engineer = getEngineerById(report.engineerId);
                    const site = report.siteId ? getSiteById(report.siteId) : null;
                    return (
                      <div key={report.id} className="rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-sm shrink-0">
                            {engineer?.name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{engineer?.name || 'Staff'}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {site && <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded-lg">{site.name}</span>}
                              <span className="text-[10px] text-gray-400">{new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Activities Completed</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{report.workDone}</p>
                          </div>
                          {report.issues && (
                            <div className="flex gap-2.5 bg-red-50 rounded-xl p-3 border border-red-100">
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
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-5 h-5 text-gray-300" />
                      </div>
                      <p className="text-gray-400 text-sm font-medium">No reports for this date</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── MUSTER ROLL ── */}
            {activeTab === 'muster' && (
              <div className="min-h-[500px]">
                <MusterRoll clientId={client?.id} />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
