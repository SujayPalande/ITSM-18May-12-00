import React, { useState, useEffect } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Download, Filter, 
  Users, CheckCircle, XCircle, Clock, AlertCircle, FileText 
} from 'lucide-react';
import { StorageService } from '../lib/storage';
import { checkInService } from '../services/checkInService';
import { leaveService } from '../services/leaveService';
import { exportToCSV } from '../lib/export';
import type { User, CheckIn, LeaveRequest, Assignment } from '../types';

interface MusterRollProps {
  clientId?: string;
  engineerIds?: string[];
}

export default function MusterRoll({ clientId, engineerIds }: MusterRollProps) {
  const [view, setView] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    engineers: User[];
    checkIns: CheckIn[];
    leaves: LeaveRequest[];
    assignments: Assignment[];
  }>({ engineers: [], checkIns: [], leaves: [], assignments: [] });

  const [page, setPage] = useState(1);
  const [totalEng, setTotalEng] = useState(0);
  const limit = 20;

  useEffect(() => {
    loadMusterData();
  }, [selectedDate, view, page]);

  async function loadMusterData() {
    try {
      setLoading(true);
      
      let engResponse;
      if (!clientId && !engineerIds) {
        engResponse = await StorageService.getEngineers(page, limit);
      } else {
        engResponse = await StorageService.getEngineers();
      }

      const [allCk, allL, allA] = await Promise.all([
        checkInService.getAllCheckIns(),
        leaveService.getAllLeaveRequests(),
        StorageService.getAssignments()
      ]);

      let filteredEng: User[] = [];
      if (Array.isArray(engResponse)) {
        filteredEng = engResponse.filter(u => u.role === 'engineer');
        setTotalEng(filteredEng.length);
      } else {
        filteredEng = engResponse.data;
        setTotalEng(engResponse.total);
      }
      
      let filteredA = allA;

      if (clientId) {
        filteredA = allA.filter(a => a.clientId === clientId);
        const assignedIds = filteredA.map(a => a.engineerId);
        filteredEng = filteredEng.filter(e => assignedIds.includes(e.id));
      } else if (engineerIds) {
        filteredEng = filteredEng.filter(e => engineerIds.includes(e.id));
      }

      setData({ engineers: filteredEng, checkIns: allCk, leaves: allL, assignments: filteredA });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  
  const renderMonthlyMuster = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-100">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="sticky left-0 bg-white z-10 p-3 text-left border-r border-slate-100 min-w-[140px] text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">Staff Name</th>
              {days.map(d => (
                <th key={d} className={`p-2 border-r border-slate-100 text-center min-w-[32px] text-[10px] font-medium ${
                  new Date(year, month, d).getDay() === 0 ? 'text-red-400/60 bg-red-500/[0.03]' : 'text-slate-500'
                }`}>
                  {d}
                </th>
              ))}
              <th className="p-3 text-[10px] font-semibold text-indigo-400/70 uppercase tracking-[0.08em] border-l border-slate-100 text-center">T.P</th>
            </tr>
          </thead>
          <tbody>
            {data.engineers.map(eng => {
              let presentCount = 0;
              return (
                <tr key={eng.id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                  <td className="sticky left-0 bg-white z-10 p-3 border-r border-slate-100 text-[12px] font-medium text-slate-600">{eng.name}</td>
                  {days.map(d => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const hasCheckIn = data.checkIns.find(c => c.engineerId === eng.id && c.date === dateStr);
                    const onLeave = data.leaves.find(l => {
                      const start = new Date(l.startDate);
                      const end = new Date(l.endDate);
                      const current = new Date(year, month, d);
                      return l.engineerId === eng.id && l.status === 'approved' && current >= start && current <= end;
                    });

                    let status = 'A';
                    let color = 'text-slate-300';
                    if (hasCheckIn) { 
                      status = 'P'; color = 'text-emerald-400 font-semibold'; presentCount++;
                    } else if (onLeave) { 
                       status = 'L'; color = 'text-amber-400/70 font-medium';
                    } else if (new Date(year, month, d).getDay() === 0) {
                       status = 'H'; color = 'text-red-400/30';
                    }

                    return (
                      <td key={d} className={`p-2 border-r border-slate-100 text-center text-[11px] ${color} transition-colors`}>
                        {status}
                      </td>
                    );
                  })}
                  <td className="p-3 font-semibold text-center text-indigo-400 border-l border-slate-100 text-[12px]">{presentCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDailyMuster = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return (
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
           <span className="text-[10px] font-semibold uppercase text-slate-500 tracking-[0.1em]">Resource Presence</span>
           <span className="px-2.5 py-1 bg-indigo-500/[0.08] text-indigo-400/80 rounded-lg text-[10px] font-semibold border border-indigo-500/10">{data.engineers.length} Staff</span>
        </div>
        <div className="divide-y divide-white/[0.03]">
          {data.engineers.map(eng => {
            const hasCheckIn = data.checkIns.find(c => c.engineerId === eng.id && c.date === dateStr);
            const onLeave = data.leaves.find(l => {
              const start = new Date(l.startDate + 'T00:00:00');
              const end = new Date(l.endDate + 'T23:59:59');
              const current = new Date(year, month, day, 12, 0, 0); 
              return l.engineerId === eng.id && l.status === 'approved' && current >= start && current <= end;
            });

            let status = 'Absent';
            let statusStyle = 'bg-slate-100 text-slate-500 border-slate-100';
            if (hasCheckIn) { status = 'Present'; statusStyle = 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/10'; }
            else if (onLeave) { status = 'On Leave'; statusStyle = 'bg-amber-500/[0.08] text-amber-400 border-amber-500/10'; }
            else if (selectedDate.getDay() === 0) { status = 'Holiday'; statusStyle = 'bg-red-500/[0.06] text-red-400/60 border-red-500/10'; }

            return (
              <div key={eng.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.015] transition-colors">
                <div className="flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[12px] font-semibold text-slate-500 border border-slate-100">{eng.name.charAt(0)}</div>
                  <div>
                    <p className="font-medium text-slate-700 text-[13px]">{eng.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{eng.email}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.06em] border ${statusStyle}`}>{status}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearlyMuster = () => {
    const year = selectedDate.getFullYear();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
      <div className="overflow-x-auto bg-white rounded-xl border border-slate-100">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="sticky left-0 bg-white z-10 p-4 text-left border-r border-slate-100 min-w-[150px] text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">Staff Name</th>
              {months.map(m => <th key={m} className="p-3 border-r border-slate-100 text-center min-w-[50px] text-[10px] font-semibold text-slate-500 uppercase">{m}</th>)}
              <th className="p-4 text-[10px] font-semibold text-indigo-400/70 uppercase tracking-[0.08em] border-l border-slate-100 text-center">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.engineers.map(eng => {
              let yearlyTotal = 0;
              return (
                <tr key={eng.id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                  <td className="sticky left-0 bg-white z-10 p-4 border-r border-slate-100 text-[12px] font-medium text-slate-600">{eng.name}</td>
                  {months.map((m, monthIdx) => {
                    const monthPresent = data.checkIns.filter(c => 
                      c.engineerId === eng.id && 
                      new Date(c.date).getFullYear() === year && 
                      new Date(c.date).getMonth() === monthIdx
                    ).length;
                    yearlyTotal += monthPresent;
                    return <td key={m} className="p-3 border-r border-slate-100 text-center text-[12px] font-medium text-slate-600">{monthPresent}</td>;
                  })}
                  <td className="p-4 font-semibold text-center text-indigo-400 border-l border-slate-100 text-[12px]">{yearlyTotal}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const changeDate = (offset: number) => {
    const newDate = new Date(selectedDate);
    if (view === 'monthly') newDate.setMonth(newDate.getMonth() + offset);
    else if (view === 'yearly') newDate.setFullYear(newDate.getFullYear() + offset);
    else newDate.setDate(newDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  const exportMuster = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    
    const exportData = data.engineers.map(eng => {
      const row: any = { 'Staff Name': eng.name };
      let total = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hasCheckIn = data.checkIns.find(c => c.engineerId === eng.id && c.date === dateStr);
        row[`Day ${d}`] = hasCheckIn ? 'P' : 'A';
        if (hasCheckIn) total++;
      }
      row['Total Present'] = total;
      return row;
    });
    exportToCSV(exportData, `muster-roll-${year}-${month + 1}`);
  };

  if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse text-[13px] font-medium">Formatting Muster Roll...</div>;

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-100">
         <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-indigo-500/[0.08] rounded-xl border border-indigo-500/10">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
               <h2 className="text-[15px] font-semibold text-slate-800 tracking-[-0.01em]">Muster Roll</h2>
               <p className="text-slate-500 text-[10px] font-medium uppercase tracking-[0.1em] mt-0.5">Personnel Presence Tracker</p>
            </div>
         </div>
         <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-100">
            {['daily', 'monthly', 'yearly'].map((v:any) => (
              <button key={v} onClick={()=>setView(v)} className={`px-4 py-2 rounded-md text-[11px] font-semibold uppercase tracking-[0.06em] transition-all duration-200 ${view === v ? 'bg-indigo-500/[0.15] text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.08)]' : 'text-slate-500 hover:text-slate-600 hover:bg-slate-50'}`}>{v}</button>
            ))}
         </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <button onClick={()=>changeDate(-1)} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-600 hover:border-slate-300 active:scale-95 transition-all"><ChevronLeft className="w-4 h-4" /></button>
            <div className="text-center min-w-[160px]">
               <h3 className="text-[14px] font-semibold text-slate-700 tracking-[-0.01em]">
                 {view === 'monthly' ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
                  view === 'yearly' ? selectedDate.getFullYear() :
                  selectedDate.toLocaleDateString()}
               </h3>
               <p className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.1em]">Active Schedule</p>
            </div>
            <button onClick={()=>changeDate(1)} className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-600 hover:border-slate-300 active:scale-95 transition-all"><ChevronRight className="w-4 h-4" /></button>
         </div>
         <button onClick={exportMuster} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500/[0.1] text-indigo-400 rounded-lg border border-indigo-500/15 hover:bg-indigo-500/[0.15] active:scale-[0.98] transition-all text-[12px] font-semibold"><Download className="w-4 h-4"/> Export Roll</button>
      </div>

      {view === 'yearly' ? renderYearlyMuster() : view === 'monthly' ? renderMonthlyMuster() : renderDailyMuster()}

      {/* Legend & Pagination */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-5 py-4 rounded-xl border border-slate-100">
         <div className="flex flex-wrap gap-5 items-center justify-center">
            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-400 rounded-full" /> <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.08em]">Present (P)</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-white/15 rounded-full" /> <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.08em]">Absent (A)</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-amber-400 rounded-full" /> <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.08em]">Leave (L)</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-red-400/40 rounded-full" /> <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.08em]">Holiday (H)</span></div>
         </div>

         {totalEng > limit && (
           <div className="flex items-center gap-3">
             <span className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.08em]">
               Staff {((page - 1) * limit) + 1} - {Math.min(page * limit, totalEng)} of {totalEng}
             </span>
             <div className="flex gap-1">
               <button 
                 disabled={page === 1}
                 onClick={() => setPage(p => p - 1)}
                 className="p-2 border border-slate-200 rounded-lg disabled:opacity-20 hover:bg-slate-100 transition-colors text-slate-500"
               >
                 <ChevronLeft className="w-4 h-4" />
               </button>
               <button 
                 disabled={page * limit >= totalEng}
                 onClick={() => setPage(p => p + 1)}
                 className="p-2 border border-slate-200 rounded-lg disabled:opacity-20 hover:bg-slate-100 transition-colors text-slate-500"
               >
                 <ChevronRight className="w-4 h-4" />
               </button>
             </div>
           </div>
         )}
      </div>
    </div>
  );
}
