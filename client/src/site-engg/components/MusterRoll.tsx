import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download } from 'lucide-react';
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

  useEffect(() => { loadMusterData(); }, [selectedDate, view, page]);

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
        filteredA = allA.filter((a: any) => a.clientId === clientId);
        const assignedIds = filteredA.map((a: any) => a.engineerId);
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
      <div>
        <div style={{ minWidth: `${Math.max(900, 160 + daysInMonth * 38 + 60)}px` }}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left border-r border-slate-200 w-40 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Staff Name
                </th>
                {days.map(d => {
                  const dow = new Date(year, month, d).getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  return (
                    <th key={d} className={`px-1 py-3 border-r border-slate-100 text-center w-9 text-xs font-semibold ${isWeekend ? 'text-red-400 bg-red-50/50' : 'text-slate-400'}`}>
                      {d}
                    </th>
                  );
                })}
                <th className="px-3 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wide border-l border-slate-200 text-center w-14">
                  T.P
                </th>
              </tr>
            </thead>
            <tbody>
              {data.engineers.map((eng, idx) => {
                let presentCount = 0;
                return (
                  <tr key={eng.id} className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className={`sticky left-0 z-10 px-4 py-3 border-r border-slate-200 text-sm font-semibold text-slate-700 truncate max-w-[160px] ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>
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
                      const dow = new Date(year, month, d).getDay();
                      const isWeekend = dow === 0 || dow === 6;

                      let status = 'A';
                      let cellClass = 'text-slate-200';
                      if (hasCheckIn) { status = 'P'; cellClass = 'text-emerald-600 font-bold'; presentCount++; }
                      else if (onLeave) { status = 'L'; cellClass = 'text-amber-500 font-semibold'; }
                      else if (isWeekend) { status = 'H'; cellClass = 'text-red-300'; }

                      return (
                        <td key={d} className={`px-1 py-3 border-r border-slate-100 text-center text-xs ${cellClass}`}>
                          {status}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 font-bold text-center text-blue-600 border-l border-slate-200 text-sm">
                      {presentCount}
                    </td>
                  </tr>
                );
              })}
              {data.engineers.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 2} className="py-12 text-center text-slate-400 text-sm font-medium">
                    No engineers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderDailyMuster = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return (
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resource Presence</span>
          <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold ring-1 ring-blue-100">{data.engineers.length} Staff</span>
        </div>
        <div className="divide-y divide-slate-100">
          {data.engineers.map((eng) => {
            const hasCheckIn = data.checkIns.find(c => c.engineerId === eng.id && c.date === dateStr);
            const onLeave = data.leaves.find(l => {
              const start = new Date(l.startDate + 'T00:00:00');
              const end = new Date(l.endDate + 'T23:59:59');
              const current = new Date(year, month, day, 12, 0, 0);
              return l.engineerId === eng.id && l.status === 'approved' && current >= start && current <= end;
            });

            let status = 'Absent';
            let statusClass = 'bg-red-50 text-red-600 ring-1 ring-red-200';
            let dotColor = 'bg-red-400';
            if (hasCheckIn) { status = 'Present'; statusClass = 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'; dotColor = 'bg-emerald-500'; }
            else if (onLeave) { status = 'On Leave'; statusClass = 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'; dotColor = 'bg-amber-400'; }
            else if (selectedDate.getDay() === 0 || selectedDate.getDay() === 6) { status = 'Holiday'; statusClass = 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'; dotColor = 'bg-slate-300'; }

            return (
              <div key={eng.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                    {eng.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{eng.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{eng.email}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${statusClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${status === 'Present' ? 'animate-pulse' : ''}`} />
                  {status}
                </div>
              </div>
            );
          })}
          {data.engineers.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm font-medium">No engineers found</div>
          )}
        </div>
      </div>
    );
  };

  const renderYearlyMuster = () => {
    const year = selectedDate.getFullYear();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
      <div>
        <div style={{ minWidth: '820px' }}>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left border-r border-slate-200 w-40 text-xs font-semibold text-slate-500 uppercase tracking-wide">Staff Name</th>
                {months.map(m => (
                  <th key={m} className="px-2 py-3 border-r border-slate-100 text-center text-xs font-semibold text-slate-400 uppercase w-14">{m}</th>
                ))}
                <th className="px-3 py-3 text-xs font-semibold text-blue-600 uppercase tracking-wide border-l border-slate-200 text-center">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.engineers.map((eng, idx) => {
                let yearlyTotal = 0;
                return (
                  <tr key={eng.id} className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    <td className={`sticky left-0 z-10 px-4 py-3 border-r border-slate-200 text-sm font-semibold text-slate-700 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}`}>{eng.name}</td>
                    {months.map((m, monthIdx) => {
                      const monthPresent = data.checkIns.filter(c =>
                        c.engineerId === eng.id &&
                        new Date(c.date).getFullYear() === year &&
                        new Date(c.date).getMonth() === monthIdx
                      ).length;
                      yearlyTotal += monthPresent;
                      return (
                        <td key={m} className={`px-2 py-3 border-r border-slate-100 text-center text-sm font-semibold ${monthPresent > 0 ? 'text-slate-700' : 'text-slate-200'}`}>
                          {monthPresent > 0 ? monthPresent : '—'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 font-bold text-center text-blue-600 border-l border-slate-200 text-sm">{yearlyTotal}</td>
                  </tr>
                );
              })}
              {data.engineers.length === 0 && (
                <tr><td colSpan={14} className="py-12 text-center text-slate-400 text-sm font-medium">No engineers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
    exportToCSV(exportData, `muster-roll-${year}-${selectedDate.getMonth() + 1}`);
  };

  if (loading) return (
    <div className="py-12 text-center">
      <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-slate-400 text-sm font-medium">Formatting Muster Roll...</p>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Muster Roll</h2>
            <p className="text-slate-400 text-xs font-medium mt-0.5">Personnel Presence Tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          {(['daily', 'monthly', 'yearly'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all duration-150 ${
                view === v ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 hover:border-slate-300 active:scale-95 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[160px] bg-white border border-slate-200 rounded-lg px-4 py-2 text-center">
            <span className="text-sm font-bold text-slate-800">
              {view === 'monthly' ? selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) :
               view === 'yearly' ? selectedDate.getFullYear() :
               selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <button onClick={() => changeDate(1)}
            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 hover:border-slate-300 active:scale-95 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button onClick={exportMuster}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all">
          <Download className="w-3.5 h-3.5" /> Export Roll
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white" style={{ overflowX: view === 'monthly' || view === 'yearly' ? 'auto' : 'hidden' }}>
        {view === 'yearly' ? renderYearlyMuster() : view === 'monthly' ? renderMonthlyMuster() : renderDailyMuster()}
      </div>

      {/* Legend & Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200 px-5 py-3.5 rounded-xl">
        <div className="flex flex-wrap gap-4 items-center justify-center">
          {[
            { color: 'bg-emerald-500', label: 'Present (P)' },
            { color: 'bg-slate-200', label: 'Absent (A)' },
            { color: 'bg-amber-400', label: 'Leave (L)' },
            { color: 'bg-red-300', label: 'Holiday (H)' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 ${item.color} rounded-full`} />
              <span className="text-xs font-medium text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>

        {totalEng > limit && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-400">
              {((page - 1) * limit) + 1}–{Math.min(page * limit, totalEng)} of {totalEng}
            </span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 border border-slate-200 bg-white rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-all text-slate-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button disabled={page * limit >= totalEng} onClick={() => setPage(p => p + 1)}
                className="p-1.5 border border-slate-200 bg-white rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-all text-slate-500">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
