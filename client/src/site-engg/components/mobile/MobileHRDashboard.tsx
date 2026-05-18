import { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, Clock, Calendar, FileText, 
  TrendingUp, BarChart3, RefreshCw, ChevronRight,
  Filter, Download, Mail, Send, AlertCircle, X, Search, Settings, LogOut, LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { StorageService } from '../../lib/storage';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { hrReportService } from '../../services/hrReportService';
import { profileService } from '../../services/profileService';
import MusterRoll from '../MusterRoll';
import type { CheckIn, LeaveRequest, DailyReport, Engineer } from '../../types';

export default function MobileHRDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'muster' | 'leave' | 'reports' | 'enterprise' | 'profiles'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [stats, setStats] = useState({ present: 0, pendingLeaves: 0, totalEng: 0, reportsToday: 0 });

  useEffect(() => { loadData(); }, [activeTab, selectedDate]);

  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [engList, allCheckIns, allLeaves, allReports] = await Promise.all([
        StorageService.getEngineers(),
        checkInService.getAllCheckIns(),
        leaveService.getAllLeaveRequests(),
        reportService.getReports()
      ]);
      
      const dayCheckIns = allCheckIns.filter(c => c.date === selectedDate);
      const dayReports = allReports.filter((r: any) => (r.date || r.createdAt?.slice(0,10)) === selectedDate);
      const pending = allLeaves.filter(l => l.status === 'pending');
      
      setEngineers(engList);
      setCheckIns(dayCheckIns);
      setLeaveRequests(allLeaves);
      setReports(dayReports);
      setStats({
        present: dayCheckIns.filter(c => !c.checkOutTime).length,
        pendingLeaves: pending.length,
        totalEng: engList.length,
        reportsToday: dayReports.length
      });
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }

  const handleLeaveAction = async (id: string, status: 'approved' | 'rejected') => {
    try {
      if (status === 'approved') await leaveService.approveLeave(id, 'hr');
      else await leaveService.rejectLeave(id, 'hr');
      loadData();
    } catch (e: any) { alert(e.message); }
  };

  if (loading) return <div className="min-h-screen bg-emerald-50 flex items-center justify-center"><RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-slate-800 px-6 pt-12 pb-20 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="flex justify-between items-center relative z-10 mb-8">
          <div>
             <h1 className="text-3xl font-black uppercase tracking-tight">HR Console</h1>
             <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mt-1">Personnel Management</p>
          </div>
          <button onClick={() => loadData(true)} className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg active:scale-90 transition-all">
             <RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10">
          {[ 
            {l: 'Active Now', v: stats.present, i: CheckCircle, c: 'bg-emerald-400/20'},
            {l: 'Pend Leaves', v: stats.pendingLeaves, i: Clock, c: 'bg-orange-400/20'},
            {l: 'Total Staff', v: stats.totalEng, i: Users, c: 'bg-blue-400/20'},
            {l: 'Work Reports', v: stats.reportsToday, i: FileText, c: 'bg-purple-400/20'}
          ].map(s => (
            <div key={s.l} className="bg-white/10 backdrop-blur-lg p-5 rounded-[2rem] border border-white/10 flex items-center gap-4">
               <div className={`p-2 rounded-xl ${s.c}`}><s.i className="w-5 h-5" /></div>
               <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-100/70">{s.l}</p><p className="text-2xl font-black tracking-tighter">{s.v}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50 flex justify-around items-center px-4 py-3 pb-8">
         {[
           { id: 'overview', icon: BarChart3, label: 'Stats' },
           { id: 'muster', icon: Calendar, label: 'Roll' },
           { id: 'leave', icon: Clock, label: 'Leave' },
           { id: 'reports', icon: FileText, label: 'Feed' },
           { id: 'profiles', icon: Users, label: 'Staff' }
         ].map(t => (
           <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${activeTab === t.id ? 'text-emerald-400 scale-110' : 'text-slate-500'}`}>
              <t.icon className={`w-6 h-6 ${activeTab === t.id ? 'fill-emerald-600/10' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
              {activeTab === t.id && <div className="absolute -bottom-1 w-1 h-1 bg-emerald-600 rounded-full" />}
           </button>
         ))}
      </div>

      <div className="px-5 -mt-8 relative z-20 space-y-6">
        {/* Date Filter Bubble */}
        <div className="bg-white p-3 rounded-3xl shadow-xl border border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-3 px-3">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="font-extrabold text-sm uppercase bg-transparent outline-none" />
           </div>
           <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-400"><Filter className="w-5 h-5" /></div>
        </div>

        {activeTab === 'muster' && (
          <MusterRoll />
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
             <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-slate-800 shadow-xl shadow-emerald-500/20 flex items-center justify-between">
                <div><h3 className="text-xl font-black uppercase">Morning Sync</h3><p className="text-[10px] font-bold uppercase text-emerald-100 mt-1">Force Readiness Check</p></div>
                <div className="text-4xl font-black">{Math.round((stats.present/stats.totalEng)*100)||0}%</div>
             </div>
             <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 px-2">Key Management Modules</h4>
                <div className="grid gap-3">
                   {[
                     {l: 'Enterprise Reports', i: TrendingUp, s: 'Weekly/Monthly Exports', c: 'blue', a: () => setActiveTab('enterprise')},
                     {l: 'Payroll Data', i: BarChart3, s: 'Engagement Summaries', c: 'purple', a: () => setActiveTab('reports')},
                     {l: 'Backup Resource', i: LayoutDashboard, s: 'Engineer Substitution', c: 'orange', a: () => {}}
                   ].map(m => (
                     <button key={m.l} onClick={m.a} className="w-full bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between group active:scale-95 transition-all">
                        <div className="flex items-center gap-4">
                           <div className={`p-4 bg-${m.c}-50 rounded-2xl text-${m.c}-600`}><m.i className="w-6 h-6" /></div>
                           <div className="text-left"><p className="font-black text-slate-700 uppercase leading-none">{m.l}</p><p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{m.s}</p></div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-800/15 group-hover:translate-x-1 transition-transform" />
                     </button>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
             {checkIns.map(c => (
               <div key={c.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black">{c.engineerName?.charAt(0)}</div>
                     <div><p className="text-sm font-extrabold text-slate-800 uppercase">{c.engineerName}</p><p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(c.checkInTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • {c.site||'Site A'}</p></div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase ${c.checkOutTime ? 'bg-slate-50 text-slate-500' : 'bg-emerald-100 text-emerald-400/80 animate-pulse'}`}>{c.checkOutTime ? 'Offline' : 'Active'}</div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'enterprise' && (
          <div className="space-y-4">
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-slate-800">
              <h3 className="text-xl font-black uppercase">Enterprise Core</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Aggregate Personnel Intelligence</p>
            </div>
            {/* Here we could render more specific enterprise report components */}
            <div className="p-12 text-center text-slate-500 font-bold uppercase text-xs">Generating Tactical Insights...</div>
          </div>
        )}

        {activeTab === 'leave' && (
          <div className="space-y-4">
             {leaveRequests.filter(l => activeTab === 'leave' ? l.status === 'pending' : true).map(l => (
               <div key={l.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                     <div><h5 className="font-black text-slate-700 uppercase">{l.engineerName}</h5><p className="text-[10px] font-bold text-amber-400 uppercase mt-1">{l.startDate} to {l.endDate}</p></div>
                     <div className="p-3 bg-slate-50 rounded-full text-slate-500"><Calendar className="w-5 h-5" /></div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl text-[11px] font-medium text-slate-600 leading-relaxed">"{l.reason}"</div>
                  <div className="flex gap-3">
                     <button onClick={()=>handleLeaveAction(l.id, 'approved')} className="flex-1 py-4 bg-emerald-600 text-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Approve</button>
                     <button onClick={()=>handleLeaveAction(l.id, 'rejected')} className="flex-1 py-4 bg-white border border-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Decline</button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'reports' && reports.map(r => (
           <div key={r.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                 <div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black">R</div><div><p className="font-black uppercase text-slate-700 leading-none">{r.engineerName}</p><p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{r.clientName}</p></div></div>
                 <div className="p-3 bg-emerald-500/[0.06] text-emerald-400 rounded-2xl"><Mail className="w-5 h-5" /></div>
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">"{ (r.workDone || '').slice(0, 100) }..."</p>
           </div>
        ))}

        {activeTab === 'profiles' && (
           <div className="grid grid-cols-2 gap-3 pb-8">
              {engineers.map(e => (
                 <div key={e.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 text-center space-y-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-teal-100 rounded-[1.5rem] mx-auto flex items-center justify-center font-black text-xl text-emerald-400/80">{e.name.charAt(0)}</div>
                    <div><p className="font-black uppercase text-slate-700 tracking-tight leading-tight">{e.name}</p><p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Engineer</p></div>
                    <button className="w-full py-2.5 bg-slate-50 text-slate-600 rounded-xl font-black uppercase text-[8px] tracking-widest hover:bg-emerald-50 hover:text-emerald-400/80 transition-colors">Details</button>
                 </div>
              ))}
           </div>
        )}
      </div>

      {/* Global Config Actions (Floating) */}
      <div className="fixed bottom-24 right-6 flex flex-col gap-3 group">
         <button onClick={() => signOut()} className="w-14 h-14 bg-slate-900 text-slate-800 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-90 transition-all">
            <LogOut className="w-6 h-6" />
         </button>
      </div>
    </div>
  );
}
