import React, { useState, useEffect } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Download, 
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
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left border-r border-slate-100 min-w-[150px] text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">
                Staff Name
              </th>
              {days.map(d => {
                const isWeekend = new Date(year, month, d).getDay() === 0;
                return (
                  <th key={d} className={`px-2 py-3 border-r border-slate-100 text-center min-w-[34px] text-[10px] font-bold ${
                    isWeekend ? 'text-red-400 bg-red-50/50' : 'text-slate-400'
                  }`}>
                    {d}
                  </th>
                );
              })}
              <th className="px-4 py-3 text-[10px] font-bold text-indigo-500 uppercase tracking-[0.08em] border-l border-slate-100 text-center min-w-[50px]">
                T.P
              </th>
            </tr>
          </thead>
          <tbody>
            {data.engineers.map((eng, idx) => {
              let presentCount = 0;
              return (
                <tr key={eng.id} className={`border-b border-slate-50 transition-colors hover:bg-slate-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3 border-r border-slate-100 text-[12px] font-semibold text-slate-700 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>
                    {eng.name}
                  </td>
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
                    let cellClass = 'text-slate-200 font-medium';
                    if (hasCheckIn) { 
                      status = 'P'; cellClass = 'text-emerald-600 font-bold'; presentCount++;
                    } else if (onLeave) { 
                      status = 'L'; cellClass = 'text-amber-500 font-semibold';
                    } else if (new Date(year, month, d).getDay() === 0) {
                      status = 'H'; cellClass = 'text-red-300 font-medium';
                    }

                    return (
                      <td key={d} className={`px-2 py-3 border-r border-slate-100 text-center text-[11px] ${cellClass}`}>
                        {status}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 font-black text-center text-indigo-600 border-l border-slate-100 text-[13px]">
                    {presentCount}
                  </td>
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
      <div className="rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.12em]">Resource Presence</span>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold border border-indigo-100">{data.engineers.length} Staff</span>
        </div>
        <div className="divide-y divide-slate-50">
          {data.engineers.map((eng, idx) => {
            const hasCheckIn = data.checkIns.find(c => c.engineerId === eng.id && c.date === dateStr);
            const onLeave = data.leaves.find(l => {
              const start = new Date(l.startDate + 'T00:00:00');
              const end = new Date(l.endDate + 'T23:59:59');
              const current = new Date(year, month, day, 12, 0, 0); 
              return l.engineerId === eng.id && l.status === 'approved' && current >= start && current <= end;
            });

            let status = 'Absent';
            let statusClass = 'bg-red-50 text-red-600 border-red-200';
            let dotColor = 'bg-red-400';
            if (hasCheckIn) { status = 'Present'; statusClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'; dotColor = 'bg-emerald-500'; }
            else if (onLeave) { status = 'On Leave'; statusClass = 'bg-amber-50 text-amber-700 border-amber-200'; dotColor = 'bg-amber-400'; }
            else if (selectedDate.getDay() === 0) { status = 'Holiday'; statusClass = 'bg-slate-100 text-slate-400 border-slate-200'; dotColor = 'bg-slate-300'; }

            return (
              <div key={eng.id} className={`px-5 py-4 flex items-center justify-between transition-colors hover:bg-slate-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-[12px] font-bold text-slate-600 border border-slate-200 shadow-sm">
                    {eng.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-[13px]">{eng.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{eng.email}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${status === 'Present' ? 'animate-pulse' : ''}`} />
                  {status}
                </div>
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
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3.5 text-left border-r border-slate-100 min-w-[150px] text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Staff Name</th>
              {months.map(m => (
                <th key={m} className="px-3 py-3.5 border-r border-slate-100 text-center min-w-[52px] text-[10px] font-bold text-slate-400 uppercase">{m}</th>
              ))}
              <th className="px-4 py-3.5 text-[10px] font-bold text-indigo-500 uppercase tracking-[0.08em] border-l border-slate-100 text-center">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {data.engineers.map((eng, idx) => {
              let yearlyTotal = 0;
              return (
                <tr key={eng.id} className={`border-b border-slate-50 transition-colors hover:bg-slate-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                  <td className={`sticky left-0 z-10 px-4 py-3.5 border-r border-slate-100 text-[12px] font-semibold text-slate-700 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>{eng.name}</td>
                  {months.map((m, monthIdx) => {
                    const monthPresent = data.checkIns.filter(c => 
                      c.engineerId === eng.id && 
                      new Date(c.date).getFullYear() === year && 
                      new Date(c.date).getMonth() === monthIdx
                    ).length;
                    yearlyTotal += monthPresent;
                    return (
                      <td key={m} className={`px-3 py-3.5 border-r border-slate-100 text-center text-[12px] font-semibold ${monthPresent > 0 ? 'text-slate-700' : 'text-slate-200'}`}>
                        {monthPresent > 0 ? monthPresent : '—'}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3.5 font-black text-center text-indigo-600 border-l border-slate-100 text-[13px]">{yearlyTotal}</td>
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

  if (loading) return (
    <div className="py-16 text-center">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-slate-400 text-sm font-medium">Formatting Muster Roll...</p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Header bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-slate-800 tracking-tight">Muster Roll</h2>
            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-[0.12em] mt-0.5">Personnel Presence Tracker</p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {(['daily', 'monthly', 'yearly'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-[0.06em] transition-all duration-200 ${
                view === v
                  ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => changeDate(-1)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[170px] bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
            <h3 className="text-[14px] font-bold text-slate-800 tracking-tight">
              {view === 'monthly' ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 
               view === 'yearly' ? selectedDate.getFullYear() :
               selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
          </div>
          <button onClick={() => changeDate(1)}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-95 transition-all shadow-sm">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button onClick={exportMuster}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200 hover:-translate-y-px">
          <Download className="w-4 h-4"/> Export Roll
        </button>
      </div>

      {/* Table */}
      {view === 'yearly' ? renderYearlyMuster() : view === 'monthly' ? renderMonthlyMuster() : renderDailyMuster()}

      {/* Legend & Pagination */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-100 px-5 py-4 rounded-xl">
        <div className="flex flex-wrap gap-5 items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Present (P)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-slate-200 rounded-full" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Absent (A)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em]">Leave (L)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-300 rounded-full" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Holiday (H)</span>
          </div>
        </div>

        {totalEng > limit && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.08em]">
              Staff {((page - 1) * limit) + 1} – {Math.min(page * limit, totalEng)} of {totalEng}
            </span>
            <div className="flex gap-1.5">
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="p-2 border border-slate-200 bg-white rounded-xl disabled:opacity-20 hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-500 shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                disabled={page * limit >= totalEng}
                onClick={() => setPage(p => p + 1)}
                className="p-2 border border-slate-200 bg-white rounded-xl disabled:opacity-20 hover:bg-slate-50 hover:border-slate-300 transition-all text-slate-500 shadow-sm"
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
