import React, { useState, useEffect } from 'react';
import { 
  FileText, Clock, Calendar, Plus, Send, CheckCircle, AlertCircle,
  LogOut, Navigation, Briefcase, TrendingUp, MapPin, ArrowRight,
  Sparkles, Download, ChevronRight, BarChart3, Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { assignmentService } from '../../services/assignmentService';
import type { DailyReport, CheckIn, LeaveRequest, Assignment } from '../../types';

export default function EngineerDashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'attendance' | 'reports' | 'leave'>('attendance');
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [todayCheckIn, setTodayCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [reportForm, setReportForm] = useState({ clientId: '', siteId: '', workDone: '', issues: '' });
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    if (user?.id) {
      loadData();
      const timer = setTimeout(() => setLoading(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const engId = (user as any)?.engineerId || user?.id;
      if (!engId) { setLoading(false); return; }
      const [reportsData, checkInsData, leavesData, assignmentsData, todayCheck] = await Promise.all([
        reportService.getReports(engId),
        checkInService.getAllCheckIns(engId),
        leaveService.getMyLeaveRequests(engId),
        assignmentService.getMyAssignments(engId),
        checkInService.getTodayCheckIn(engId)
      ]);
      setReports([...reportsData]);
      setCheckIns(checkInsData.filter((c: CheckIn) => c.engineerId === engId));
      setLeaves([...leavesData]);
      setAssignments(assignmentsData);
      setTodayCheckIn(todayCheck);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally { setLoading(false); }
  };

  const handleCheckIn = async () => {
    if (!user || submitting) return;
    try {
      setSubmitting(true);
      let lat = 0, lng = 0, locationName = 'Location unavailable', gotLocation = false;
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 });
          }).catch(async (err) => {
            if (err.code === 3 || err.code === 2) {
              return new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 });
              });
            }
            throw err;
          });
          lat = pos.coords.latitude; lng = pos.coords.longitude; gotLocation = true;
        } catch (geoErr: any) { if (geoErr.code === 1) throw geoErr; }
      }
      if (!gotLocation) {
        try { const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) }); const d = await r.json(); if (d.latitude) { lat = d.latitude; lng = d.longitude; gotLocation = true; } } catch {}
      }
      if (gotLocation) {
        try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`); const d = await r.json(); if (d.display_name) locationName = d.display_name; } catch { locationName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; }
      }
      const result = await checkInService.createCheckIn((user as any).engineerId || user.id, lat, lng, locationName);
      setTodayCheckIn(result); loadData();
      alert(gotLocation ? `Checked in at ${locationName}` : 'Checked in (location unavailable)');
    } catch (error: any) {
      alert(error.code === 1 ? 'Location access denied.' : (error.message || 'Check-in failed'));
    } finally { setSubmitting(false); }
  };

  const handleCheckOut = async () => {
    if (!todayCheckIn || submitting) return;
    try { 
      setSubmitting(true);
      await checkInService.checkOut(todayCheckIn.id); 
      setTodayCheckIn(null); 
      await loadData(); 
    }
    catch { alert('Check-out failed'); }
    finally { setSubmitting(false); }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportForm.clientId || submitting) return;
    try {
      setSubmitting(true);
      const result = await reportService.createReport((user as any).engineerId || user.id, reportForm.clientId, reportForm.workDone, reportForm.issues, reportForm.siteId || undefined);
      const newReport: DailyReport = { ...result, clientName: assignments.find(a => a.clientId === reportForm.clientId)?.clientName || 'Project Report', date: result.date || new Date().toISOString().split('T')[0] };
      setReports(prev => [newReport, ...prev]);
      setReportForm({ clientId: '', siteId: '', workDone: '', issues: '' });
      await loadData(); alert('Report submitted successfully');
    } catch { alert('Failed to submit report'); }
    finally { setSubmitting(false); }
  };

  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    try {
      setSubmitting(true);
      const result = await leaveService.createLeaveRequest((user as any).engineerId || user.id, leaveForm.startDate, leaveForm.endDate, leaveForm.reason);
      setLeaves(prev => [{ ...result, engineerName: user.name, status: 'pending' }, ...prev]);
      setLeaveForm({ startDate: '', endDate: '', reason: '' });
      await loadData(); alert('Leave request submitted');
    } catch { alert('Failed to submit leave request'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 animate-spin"></div>
          </div>
          <p className="text-slate-400 text-[11px] font-bold tracking-[0.2em] uppercase">Syncing Workspace</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'leave', label: 'Leave', icon: Calendar },
  ];

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-800 selection:bg-blue-500/20 pb-20">
      {/* ─── Apple-Style Clean Header ─── */}
      <div className="max-w-[1000px] mx-auto px-6 pt-16 pb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              {greeting}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 font-medium flex items-center gap-2 text-sm">
              <Briefcase className="w-4 h-4 text-blue-500" />
              Field Engineering Console
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="p-3 bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full animate-pulse ${todayCheckIn && !todayCheckIn.checkOutTime ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`} />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  {todayCheckIn ? (todayCheckIn.checkOutTime ? 'Off Duty' : 'On Duty') : 'Pending'}
                </span>
             </div>
          </div>
        </div>

        {/* Floating Colorful Action Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          <div className="bg-white p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Today</p>
            <p className="text-xl font-bold text-slate-800">{todayCheckIn ? (todayCheckIn.checkOutTime ? 'Done' : 'Active') : 'Not Started'}</p>
          </div>
          <div className="bg-white p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Assignments</p>
            <p className="text-xl font-bold text-slate-800">{assignments.length}</p>
          </div>
          <div className="bg-white p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Reports</p>
            <p className="text-xl font-bold text-slate-800">{reports.length}</p>
          </div>
          <div className="bg-white p-5 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 flex flex-col justify-between hover:scale-[1.02] transition-transform duration-300">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Leaves</p>
            <p className="text-xl font-bold text-slate-800">{leaves.length}</p>
          </div>
        </div>
      </div>

      {/* ─── Main Content Area ─── */}
      <div className="max-w-[1000px] mx-auto px-6">
        {/* iOS Segmented Control */}
        <div className="flex p-1.5 bg-slate-200/50 backdrop-blur-xl rounded-2xl w-full max-w-md mx-auto md:mx-0 mb-10 shadow-inner">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}>
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-500' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══ ATTENDANCE VIEW ═══ */}
        {activeTab === 'attendance' && (
          <div className="grid gap-8 md:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Primary Action Card (Big & Bold) */}
            <div className="md:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-100 to-transparent rounded-[2.5rem] blur-xl opacity-50" />
              <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.05)] border border-slate-100 p-8 relative flex flex-col items-center text-center h-full">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                  <MapPin className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-800 mb-2">Location Sync</h2>
                <p className="text-slate-400 text-sm mb-10 leading-relaxed max-w-[250px]">
                  {todayCheckIn ? (todayCheckIn.checkOutTime ? 'Shift completed. Great job today!' : 'You are currently clocked in. Stay safe out there.') : 'Start your shift by syncing your current location.'}
                </p>

                <div className="mt-auto w-full">
                  {!todayCheckIn ? (
                    <button onClick={handleCheckIn} disabled={submitting} 
                      className={`w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-base shadow-xl shadow-slate-900/20 transition-all duration-300 flex items-center justify-center gap-3 ${submitting ? 'opacity-70 scale-95' : 'hover:-translate-y-1'}`}>
                      {submitting ? <Clock className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                      {submitting ? 'Syncing...' : 'Start Shift'}
                    </button>
                  ) : !todayCheckIn.checkOutTime ? (
                     <button onClick={handleCheckOut} disabled={submitting} 
                      className={`w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-red-500/20 transition-all duration-300 flex items-center justify-center gap-3 ${submitting ? 'opacity-70 scale-95' : 'hover:-translate-y-1'}`}>
                      {submitting ? <Clock className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                      {submitting ? 'Ending...' : 'End Shift'}
                    </button>
                  ) : (
                    <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold flex items-center justify-center gap-2 border border-emerald-100">
                      <CheckCircle className="w-5 h-5" />
                      Session Done
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* List / Log View */}
            <div className="md:col-span-7 bg-white rounded-[2.5rem] shadow-[0_10px_40px_rgb(0,0,0,0.03)] border border-slate-100 p-8 h-full min-h-[400px] flex flex-col">
              <div className="flex justify-between items-end mb-8">
                <h3 className="text-xl font-bold text-slate-800">Activity Log</h3>
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{checkIns.length} Entries</span>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {checkIns.length > 0 ? checkIns.slice(0, 10).map((ci, i) => (
                  <div key={ci.id} className="relative pl-6 pb-2">
                    {/* Timeline line */}
                    {i !== checkIns.length - 1 && <div className="absolute left-2 top-8 bottom-0 w-px bg-slate-100" />}
                    
                    <div className="flex items-start gap-5 group">
                      <div className={`absolute left-0 mt-1.5 w-4 h-4 rounded-full border-[3px] border-white ${ci.checkOutTime ? 'bg-slate-300' : 'bg-emerald-500'} shadow-sm z-10`} />
                      <div className="flex-1 bg-slate-50/80 group-hover:bg-slate-100/50 rounded-2xl p-4 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-slate-800 text-sm">
                            {new Date(ci.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {ci.checkOutTime && <span className="text-slate-400 font-medium"> → {new Date(ci.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          </p>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${ci.checkOutTime ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'}`}>
                            {ci.checkOutTime ? 'Closed' : 'Active'}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs font-medium line-clamp-1">{ci.locationName || 'Location Not Specified'}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-50 py-10">
                    <Clock className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-sm font-semibold text-slate-400">No shifts recorded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ REPORTS VIEW ═══ */}
        {activeTab === 'reports' && (
          <div className="grid gap-8 md:grid-cols-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Form */}
            <div className="md:col-span-5 bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.05)] border border-slate-100 p-8 h-fit">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">New Report</h3>
              <p className="text-slate-400 text-sm mb-8">Document your site progress.</p>
              
              <form onSubmit={handleReportSubmit} className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Client / Project</label>
                  <select required value={reportForm.clientId} onChange={e => setReportForm({ ...reportForm, clientId: e.target.value })}
                    className="w-full bg-slate-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-[4px] focus:ring-blue-500/10 rounded-[1.25rem] px-5 py-3.5 text-sm font-semibold text-slate-700 outline-none transition-all appearance-none">
                    <option value="" disabled>Select Assignment...</option>
                    {Array.from(new Map(assignments.map(a => [a.clientId, a])).values()).map((a, idx) => (
                      <option key={`opt-${a.clientId}-${idx}`} value={a.clientId}>{a.clientName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Activities</label>
                  <textarea required value={reportForm.workDone} onChange={e => setReportForm({ ...reportForm, workDone: e.target.value })}
                    className="w-full bg-slate-50 border-transparent focus:border-blue-500 focus:bg-white focus:ring-[4px] focus:ring-blue-500/10 rounded-[1.25rem] px-5 py-4 text-sm font-medium text-slate-700 outline-none transition-all resize-none min-h-[120px]" 
                    placeholder="What did you build, fix, or inspect today?" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Notes / Blockers</label>
                  <textarea value={reportForm.issues} onChange={e => setReportForm({ ...reportForm, issues: e.target.value })}
                    className="w-full bg-red-50/50 border-transparent focus:border-red-400 focus:bg-white focus:ring-[4px] focus:ring-red-500/10 rounded-[1.25rem] px-5 py-4 text-sm font-medium text-slate-700 outline-none transition-all resize-none min-h-[80px]" 
                    placeholder="Any material shortages or delays?" />
                </div>
                
                <button type="submit" disabled={submitting} 
                  className={`w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-base shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center justify-center gap-3 ${submitting ? 'opacity-70 scale-95' : 'hover:-translate-y-1'}`}>
                  {submitting ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {submitting ? 'Saving...' : 'Submit Now'}
                </button>
              </form>
            </div>

            {/* List */}
            <div className="md:col-span-7 space-y-4">
               {reports.length > 0 ? reports.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()).map(report => (
                <div key={report.id} className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md border border-slate-100 transition-all duration-300 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{report.clientName || 'Report Log'}</h4>
                        <p className="text-xs font-medium text-slate-400">{new Date(report.date || report.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                    {/* Share action */}
                    <button onClick={async () => { const e = prompt("Send copy to email:"); if (e) { try { const r = await fetch(`/api/reports/${report.id}/send-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }) }); const d = await r.json(); alert(d.message || 'Sent!'); } catch { alert('Failed'); } } }}
                      className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="bg-slate-50/80 rounded-2xl p-4 text-sm text-slate-600 leading-relaxed font-medium">
                    {report.workDone}
                  </div>
                  
                  {report.issues && (
                    <div className="mt-3 bg-red-50/80 rounded-2xl p-4 flex gap-3 text-sm">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-red-700 font-medium">{report.issues}</p>
                    </div>
                  )}
                </div>
              )) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-700">No Reports Filed</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-[200px]">Your submitted activities will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ LEAVE VIEW ═══ */}
        {activeTab === 'leave' && (
          <div className="max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
             
             {/* Big Request Button */}
             <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl shadow-amber-500/20 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="z-10 text-center md:text-left">
                  <h2 className="text-3xl font-bold mb-2">Need Time Off?</h2>
                  <p className="text-amber-100 font-medium max-w-sm">Submit your absence request directly through the portal for fast approval.</p>
                </div>
             </div>

             <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_rgb(0,0,0,0.05)] border border-slate-100 p-6 md:p-10 mb-8">
                <form onSubmit={handleLeaveRequest} className="space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">First Day</label>
                      <input required type="date" value={leaveForm.startDate} onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                         className="w-full bg-slate-50 border-transparent focus:border-amber-500 focus:bg-white focus:ring-[4px] focus:ring-amber-500/10 rounded-[1.25rem] px-5 py-3.5 text-sm font-semibold text-slate-700 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Return Day</label>
                      <input required type="date" value={leaveForm.endDate} onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                         className="w-full bg-slate-50 border-transparent focus:border-amber-500 focus:bg-white focus:ring-[4px] focus:ring-amber-500/10 rounded-[1.25rem] px-5 py-3.5 text-sm font-semibold text-slate-700 outline-none transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block ml-1">Details</label>
                    <textarea required value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                      className="w-full bg-slate-50 border-transparent focus:border-amber-500 focus:bg-white focus:ring-[4px] focus:ring-amber-500/10 rounded-[1.25rem] px-5 py-4 text-sm font-medium text-slate-700 outline-none transition-all resize-none min-h-[100px]" placeholder="Optional comment for HR..." />
                  </div>
                  <button type="submit" disabled={submitting} 
                    className={`w-full py-4 mt-2 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-base shadow-lg shadow-slate-900/20 transition-all duration-300 flex items-center justify-center gap-3 ${submitting ? 'opacity-70 scale-95' : 'hover:-translate-y-1'}`}>
                    {submitting ? <Clock className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    {submitting ? 'Processing...' : 'Send Request'}
                  </button>
                </form>
             </div>

             <div className="space-y-4 pb-10">
                <h3 className="text-lg font-bold text-slate-800 ml-2 mb-4">Past Requests</h3>
                {leaves.length > 0 ? leaves.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).map(leave => (
                   <div key={leave.id} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex items-center justify-between group">
                     <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
                        <div className="flex items-center gap-2">
                           <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                             <Calendar className="w-4 h-4 text-amber-500" />
                           </div>
                           <div className="flex flex-col">
                             <span className="font-bold text-slate-800 text-sm">
                               {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                             </span>
                             <span className="text-xs text-slate-400 font-medium line-clamp-1 max-w-[200px]">{leave.reason}</span>
                           </div>
                        </div>
                     </div>
                     <span className={`px-4 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider ${
                        leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                        leave.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                        'bg-slate-100 text-slate-600'
                     }`}>
                        {leave.status}
                     </span>
                   </div>
                )) : (
                  <p className="text-center text-slate-400 text-sm font-medium py-10 border-2 border-dashed border-slate-200 rounded-3xl">No leave history found.</p>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
