import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users, FileText, MapPin, Building2, Clock, Calendar,
  RefreshCw, CheckCircle, AlertCircle, ChevronRight, Sparkles,
  TrendingUp, BarChart3, LogOut
} from 'lucide-react';
import { Assignment, DailyReport, CheckIn, LeaveRequest, Client, User, Site } from '../../types';
import { StorageService } from '../../lib/storage';
import MusterRoll from '../MusterRoll';

export default function MobileClientDashboard() {
  const { user, signOut } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [engineers, setEngineers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'reports' | 'muster'>('overview');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadData(); }, [user, selectedDate]);

  async function loadData(isRefresh = false) {
    if (!user) return;
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [allClients, allAssignments, allReports, allCheckIns, allLeaves, allEngineers, allSites] = await Promise.all([
        StorageService.getClients(), StorageService.getAssignments(), StorageService.getDailyReports(),
        StorageService.getCheckIns(), StorageService.getLeaveRequests(), StorageService.getEngineers(), StorageService.getSites()
      ]);

      setEngineers(allEngineers);
      setSites(allSites);

      const clientData = allClients.find((c: Client) => c.email === user.email || c.userId === user.id);
      if (!clientData) { setLoading(false); setRefreshing(false); return; }
      setClient(clientData);

      const clientAssignments = allAssignments.filter((a: Assignment) => a.clientId === clientData.id);
      setAssignments(clientAssignments);
      const engineerIds = clientAssignments.map((a: Assignment) => a.engineerId);

      setReports(allReports.filter((r: DailyReport) => r.date === selectedDate && engineerIds.includes(r.engineerId)));
      setCheckIns(allCheckIns.filter((c: CheckIn) => c.date === selectedDate && engineerIds.includes(c.engineerId)));
      setLeaves(allLeaves.filter((l: LeaveRequest) => l.status === 'approved' && engineerIds.includes(l.engineerId)));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const getEngineer = (id: string) => engineers.find(e => e.id === id);
  const isOnLeave = (engId: string) => {
    const d = new Date(selectedDate);
    return leaves.find(l => l.engineerId === engId && d >= new Date(l.startDate) && d <= new Date(l.endDate));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-400 animate-spin"></div>
            <Building2 className="absolute inset-0 m-auto w-8 h-8 text-amber-400 animate-pulse" />
          </div>
          <p className="text-amber-200 font-medium text-sm">Loading client view...</p>
        </div>
      </div>
    );
  }



  const assignedEngIds = assignments.map(a => a.engineerId);
  const activeEngineers = engineers.filter(e => assignedEngIds.includes(e.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-amber-50/20 pb-28">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-600 to-red-600"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_50%)]"></div>
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        
        <div className="relative px-6 pt-10 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-amber-200/80 text-xs font-semibold uppercase tracking-[0.2em] mb-1">Client Portal</p>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{client?.name || 'Client Portal'}</h1>
              <p className="text-amber-200/70 text-xs font-medium mt-1">{client?.contactPerson || user?.name}</p>
            </div>
            <button onClick={() => loadData(true)} disabled={refreshing}
              className="p-3.5 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 active:scale-90 transition-all">
              <RefreshCw className={`w-5 h-5 text-slate-800 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Engineers', value: activeEngineers.length },
              { label: 'Present', value: checkIns.length },
              { label: 'Reports', value: reports.length }
            ].map(s => (
              <div key={s.label} className="bg-white/[0.08] backdrop-blur-xl rounded-2xl p-3.5 border border-slate-200">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-200/50">{s.label}</p>
                <p className="text-lg font-black text-slate-800 mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="flex px-2">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'team', label: 'Team', icon: Users },
            { id: 'reports', label: 'Reports', icon: FileText },
            { id: 'muster', label: 'Muster', icon: BarChart3 }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-3.5 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                activeTab === tab.id ? 'border-amber-600 text-amber-400' : 'border-transparent text-slate-500'
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Picker */}
      <div className="px-5 pt-4 pb-2">
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none shadow-sm" />
      </div>

      {/* Content */}
      <div className="px-5 pt-2 space-y-4">
        {activeTab === 'overview' && (
          <div className="bg-white rounded-3xl border border-slate-100 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Today's Attendance
            </h3>
            <div className="space-y-3">
              {activeEngineers.map(eng => {
                const ci = checkIns.find(c => c.engineerId === eng.id);
                const onLeave = isOnLeave(eng.id);
                return (
                  <div key={eng.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-black text-sm">
                        {eng.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{eng.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{(eng as any).designation || 'Engineer'}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                      ci ? 'bg-emerald-50 text-emerald-400/80 border border-emerald-200' :
                      onLeave ? 'bg-amber-500/[0.06] text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-500 border border-slate-100'
                    }`}>
                      {ci ? (ci.checkOutTime ? 'Done' : 'Present') : onLeave ? 'Leave' : 'Absent'}
                    </span>
                  </div>
                );
              })}
              {activeEngineers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No engineers assigned</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Assigned Engineers</h3>
            {activeEngineers.map(eng => {
              const ci = checkIns.find(c => c.engineerId === eng.id);
              const report = reports.find(r => r.engineerId === eng.id);
              return (
                <div key={eng.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-amber-700 font-black text-lg">
                      {eng.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-700">{eng.name}</p>
                      <p className="text-xs text-slate-500">{eng.email}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${ci ? 'bg-emerald-500/[0.06] text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                      {ci ? 'Active' : 'Offline'}
                    </span>
                  </div>
                  {ci && (
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                      <span className="font-semibold">Check-in:</span> {new Date(ci.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {ci.locationName && <span className="ml-2 text-slate-500">· {ci.locationName.substring(0, 40)}...</span>}
                    </div>
                  )}
                  {report && (
                    <div className="bg-indigo-500/[0.06] rounded-xl p-3 mt-2 text-xs text-blue-700">
                      <span className="font-semibold">Report:</span> {report.workDone.substring(0, 80)}...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
              Reports — {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </h3>
            {reports.length > 0 ? reports.map(report => {
              const eng = getEngineer(report.engineerId);
              return (
                <div key={report.id} className="bg-white rounded-2xl border border-slate-100 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/[0.08] flex items-center justify-center font-black text-blue-700 text-sm">
                      {eng?.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{eng?.name || 'Engineer'}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{new Date(report.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{report.workDone}</p>
                  {report.issues && (
                    <div className="flex items-start gap-2 mt-3 p-3 bg-amber-500/[0.06] rounded-xl border border-amber-100">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700">{report.issues}</p>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">No reports for this date</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'muster' && (
          <MusterRoll clientId={client?.id || ''} engineerIds={assignedEngIds} />
        )}
      </div>
    </div>
  );
}
