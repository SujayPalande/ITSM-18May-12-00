import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, FileText, MapPin, Download, Building2, Clock, TrendingUp, Calendar, LayoutDashboard, AlertCircle } from 'lucide-react';
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

  useEffect(() => {
    loadData();
  }, [user, selectedDate]);

  async function loadData() {
    if (!user) return;

    try {
      setLoading(true);
      const [allClients, allAssignments, allReports, allCheckIns, allLeaves, allEngineers, allSites] = await Promise.all([
        StorageService.getClients(),
        StorageService.getAssignments(),
        StorageService.getDailyReports(),
        StorageService.getCheckIns(),
        StorageService.getLeaveRequests(),
        StorageService.getEngineers(),
        StorageService.getSites()
      ]);

      setEngineers(Array.isArray(allEngineers) ? allEngineers : (allEngineers as any).data || []);
      setSites(Array.isArray(allSites) ? allSites : (allSites as any).data || []);

      const clientData = allClients.find((c: Client) =>
        (user.clientId && c.id === user.clientId) ||
        c.email === user.email ||
        c.userId === user.id ||
        (c.contactPerson && c.contactPerson.toLowerCase() === user.name.toLowerCase())
      );
      if (!clientData) {
        setLoading(false);
        return;
      }
      setClient(clientData);

      const clientAssignments = allAssignments.filter((a: Assignment) => a.clientId === clientData.id);
      setAssignments(clientAssignments);

      const engineerIds = clientAssignments.map((a: Assignment) => a.engineerId);

      const filteredReports = allReports.filter((r: DailyReport) => 
        r.date === selectedDate && engineerIds.includes(r.engineerId)
      );
      setReports(filteredReports);

      const filteredCheckIns = allCheckIns.filter((c: CheckIn) =>
        c.date === selectedDate && engineerIds.includes(c.engineerId)
      );
      setCheckIns(filteredCheckIns);

      const filteredLeaves = allLeaves.filter((l: LeaveRequest) =>
        l.status === 'approved' && engineerIds.includes(l.engineerId)
      );
      setLeaves(filteredLeaves);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getEngineerById(id: string): User | undefined {
    return engineers.find(e => e.id === id);
  }

  function getSiteById(id: string): Site | undefined {
    return sites.find(s => s.id === id);
  }

  function isEngineerOnLeave(engineerId: string): LeaveRequest | undefined {
    const today = new Date(selectedDate);
    return leaves.find(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      return leave.engineerId === engineerId && today >= start && today <= end;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500 animate-spin"></div>
          </div>
          <p className="text-slate-400 text-[11px] font-bold tracking-[0.2em] uppercase">Loading Portal</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 selection:bg-amber-500/20 pb-20">
      {/* ─── Apple-Style Clean Header ─── */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 pt-16 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div className="space-y-2">
            <p className="text-amber-500 font-bold text-xs uppercase tracking-widest">{client ? client.name : 'Client Portal'}</p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              Overview
            </h1>
            <p className="text-slate-500 font-medium">Project oversight & workforce analytics</p>
          </div>
          
          {/* iOS Segmented Control */}
          <div className="flex p-1.5 bg-slate-200/50 backdrop-blur-xl rounded-2xl shadow-inner w-full md:w-auto overflow-x-auto scrollbar-hide">
             {[
               { id: 'overview', label: 'Overview', icon: LayoutDashboard },
               { id: 'reports', label: 'Work Reports', icon: FileText },
               { id: 'enterprise', label: 'Attendance', icon: Clock },
               { id: 'muster', label: 'Muster Roll', icon: Calendar }
             ].map(t => (
               <button 
                 key={t.id} 
                 onClick={() => setActiveTab(t.id as any)}
                 className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                   activeTab === t.id 
                    ? 'bg-white text-amber-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                 }`}
               >
                 <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-amber-500' : ''}`} />
                 {t.label}
               </button>
             ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Assigned Engineers', value: assignments.length, icon: Users, tab: 'enterprise' as const, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: "Today's Reports", value: reports.length, icon: FileText, tab: 'reports' as const, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Check-ins Today', value: checkIns.length, icon: MapPin, tab: 'muster' as const, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'On Leave', value: assignments.filter(a => isEngineerOnLeave(a.engineerId)).length, icon: TrendingUp, tab: 'muster' as const, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(stat => (
              <div key={stat.label} onClick={() => setActiveTab(stat.tab)} className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300 cursor-pointer">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Global Date Picker for overview & reports tabs */}
        {(activeTab === 'overview' || activeTab === 'reports' || activeTab === 'enterprise') && (
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">Date Filter</h2>
                <p className="text-xs font-medium text-slate-400">Viewing data for selected date</p>
              </div>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-5 py-3 bg-slate-50 border-transparent focus:border-amber-500 focus:bg-white focus:ring-[4px] focus:ring-amber-500/10 rounded-xl text-sm font-bold text-slate-700 outline-none transition-all w-full sm:w-auto"
            />
          </div>
        )}

        <div className="grid gap-8">
          {activeTab === 'overview' && (
            <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <Users className="w-5 h-5 text-slate-400" />
                <h3 className="text-slate-800 font-bold text-lg">Assigned Engineers</h3>
              </div>
              <div className="p-8">
                <div className="grid gap-4 md:grid-cols-2">
                  {assignments.length > 0 ? assignments.map(assignment => {
                    const engineer = getEngineerById(assignment.engineerId);
                    const site = assignment.siteId ? getSiteById(assignment.siteId) : null;
                    const leave = isEngineerOnLeave(assignment.engineerId);
                    const backupEngineer = leave?.backupEngineerId ? getEngineerById(leave.backupEngineerId) : null;

                    return (
                      <div key={assignment.id} className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100 hover:bg-slate-100/50 transition-all duration-300 flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 font-bold text-lg">
                             {engineer?.name?.charAt(0) || '?'}
                           </div>
                           <div>
                             <h4 className="font-bold text-slate-800 text-base">{engineer?.name || 'Unknown Engineer'}</h4>
                             <p className="text-xs font-medium text-slate-400 mt-0.5">{engineer?.email}</p>
                             {site && (
                               <p className="text-xs font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                                 <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                 {site.name}
                               </p>
                             )}
                           </div>
                        </div>
                        {leave ? (
                          <div className="text-right flex flex-col items-end">
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                              On Leave
                            </span>
                            {backupEngineer && (
                              <p className="text-[10px] font-medium text-slate-400 mt-2">
                                Backup: {backupEngineer.name}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                    );
                  }) : (
                     <div className="col-span-2 text-center py-12">
                       <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                       <p className="text-slate-400 font-medium text-sm">No engineers assigned yet</p>
                     </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'enterprise' && (
            <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                <Clock className="w-5 h-5 text-slate-400" />
                <h3 className="text-slate-800 font-bold text-lg">Daily Attendance</h3>
              </div>
              <div className="p-8 space-y-4">
                {checkIns.length > 0 ? checkIns.map(checkIn => {
                  const engineer = getEngineerById(checkIn.engineerId);
                  return (
                    <div key={checkIn.id} className="bg-slate-50/80 border border-slate-100 rounded-2xl p-5 hover:bg-slate-100/50 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${checkIn.checkOutTime ? 'bg-slate-200' : 'bg-emerald-500 text-white'}`}>
                           <Clock className="w-5 h-5" />
                         </div>
                         <div>
                           <h4 className="font-bold text-slate-800 text-base">{engineer?.name || 'Unknown Engineer'}</h4>
                           <div className="flex flex-wrap items-center gap-4 mt-2">
                             <p className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1 rounded-lg shadow-sm flex items-center gap-1.5">
                               IN: {new Date(checkIn.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                             {checkIn.checkOutTime ? (
                               <p className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1 rounded-lg shadow-sm flex items-center gap-1.5 border border-slate-100">
                                 OUT: {new Date(checkIn.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </p>
                             ) : (
                               <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 px-2 py-0.5 bg-emerald-100 rounded-md">Shifting Active</span>
                             )}
                           </div>
                         </div>
                      </div>
                      {checkIn.latitude && checkIn.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${checkIn.latitude},${checkIn.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-full md:w-auto gap-2 text-indigo-600 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 px-5 py-3 rounded-xl transition-all"
                        >
                          <MapPin className="w-4 h-4" />
                          View on Map
                        </a>
                      )}
                    </div>
                  );
                }) : (
                  <div className="text-center py-16">
                    <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium text-sm">No check-ins available for this date.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden">
              <div className="px-8 py-5 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <h3 className="text-slate-800 font-bold text-lg">Work Reports</h3>
                </div>
                <button
                  onClick={() => {
                    const exportData = reports.map(r => {
                      const engineer = getEngineerById(r.engineerId);
                      const site = r.siteId ? getSiteById(r.siteId) : null;
                      return {
                        Engineer: engineer?.name || '',
                        Site: site?.name || '-',
                        Date: r.date,
                        WorkDone: r.workDone,
                        Issues: r.issues || 'None',
                      };
                    });
                    exportToCSV(exportData, `reports-${client?.name || 'client'}-${selectedDate}`);
                  }}
                  className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export to CSV
                </button>
              </div>
              <div className="p-8 space-y-6">
                {reports.length > 0 ? reports.map(report => {
                  const engineer = getEngineerById(report.engineerId);
                  const site = report.siteId ? getSiteById(report.siteId) : null;
                  return (
                    <div key={report.id} className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 hover:shadow-md transition-all duration-300">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-lg font-bold text-indigo-500">{engineer?.name?.charAt(0)}</div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-base">{engineer?.name || 'Staff'}</h4>
                            <div className="flex gap-2 items-center mt-1">
                               {site && <p className="text-[11px] font-bold text-slate-500 bg-white shadow-sm px-2 py-0.5 rounded-md">{site.name}</p>}
                               <p className="text-[11px] font-bold text-slate-400 px-2 py-0.5 border border-slate-200 rounded-md">
                                 {new Date(report.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                               </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Activities Completed</p>
                          <p className="text-sm font-medium text-slate-700 leading-relaxed">"{report.workDone}"</p>
                        </div>
                        {report.issues && (
                          <div className="bg-red-50/80 rounded-2xl p-5 border border-red-100/50 flex gap-3 items-start">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                               <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Noted Issues</p>
                               <p className="text-sm font-medium text-red-700 leading-relaxed">"{report.issues}"</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-16">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium text-sm">No status reports found for this interval.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'muster' && (
            <div className="bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgb(0,0,0,0.03)] border border-slate-100 overflow-hidden min-h-[500px]">
               <MusterRoll clientId={client?.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
