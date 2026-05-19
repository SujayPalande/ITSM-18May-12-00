import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Users, CheckCircle, XCircle, Clock, Download, FileText, TrendingUp, Database,
  Mail, Send, Calendar, AlertCircle, ChevronLeft, ChevronRight,
  RefreshCw, LayoutDashboard, MapPin,
} from 'lucide-react';
import { CheckIn, LeaveRequest, Engineer, DailyReport } from '../../types';
import { exportToCSV } from '../../lib/export';
import { checkInService } from '../../services/checkInService';
import { reportService } from '../../services/reportService';
import { leaveService } from '../../services/leaveService';
import { StorageService } from '../../lib/storage';
import { useAuth } from '@/hooks/use-auth';
import { hrReportService, AttendanceRecord, EngineerSummary, ClientReport, PayrollRecord } from '../../services/hrReportService';
import { profileService, UserProfile } from '../../services/profileService';
import HRClientWiseView from './HRClientWiseView';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'attendance' | 'muster' | 'leave' | 'reports' | 'clientwise' | 'enterprise' | 'profiles';

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard },
  { id: 'attendance', label: 'Daily Reg.',  icon: CheckCircle     },
  { id: 'muster',     label: 'Muster Roll', icon: Calendar        },
  { id: 'leave',      label: 'Leaves',      icon: Clock           },
  { id: 'reports',    label: 'Reports',     icon: FileText        },
  { id: 'enterprise', label: 'Enterprise',  icon: TrendingUp      },
  { id: 'profiles',   label: 'Staff',       icon: Users           },
];

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.25, 0.1, 0.25, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.16 } },
};
const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function useCounter(target: number, duration = 800) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => { const p = Math.min((now - start) / duration, 1); setVal(Math.floor(p * target)); if (p < 1) raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target]);
  return val;
}
function AnimatedNumber({ value }: { value: number }) { return <>{useCounter(value)}</>; }

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    present: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    leave:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    absent:  'bg-red-50 text-red-700 ring-1 ring-red-200',
    approved:'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    rejected:'bg-red-50 text-red-700 ring-1 ring-red-200',
    pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    completed:'bg-slate-100 text-slate-500',
    active:  'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg[status]||cfg.absent}`}>{status}</span>;
}

const F = 'w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all';
const EM = '#10b981';

export default function HRDashboard() {
  const { user } = useAuth();
  const [tab, setTab]           = useState<Tab>('overview');
  const [engineerProfiles, setEngineerProfiles] = useState<UserProfile[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [reports, setReports]   = useState<DailyReport[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [emailSending, setEmailSending] = useState(false);
  const [toast, setToast]       = useState<{ type: 'success'|'error'; text: string }|null>(null);
  const [enterpriseTab, setEnterpriseTab] = useState<'daily'|'weekly'|'monthly'|'backup'|'payroll'>('daily');
  const [attendanceRegister, setAttendanceRegister] = useState<AttendanceRecord[]>([]);
  const [weeklyStart, setWeeklyStart] = useState(new Date(Date.now()-7*86400000).toISOString().split('T')[0]);
  const [weeklyEnd,   setWeeklyEnd]   = useState(new Date().toISOString().split('T')[0]);
  const [engineerSummary, setEngineerSummary] = useState<EngineerSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0,7));
  const [clientReports, setClientReports]   = useState<ClientReport[]>([]);
  const [backupUsage,   setBackupUsage]     = useState<any>(null);
  const [payrollData,   setPayrollData]     = useState<PayrollRecord[]>([]);
  const [profilePage,   setProfilePage]     = useState(1);
  const [profileTotal,  setProfileTotal]    = useState(0);
  const profileLimit = 20;
  const [backupSelections, setBackupSelections] = useState<Record<string,string>>({});
  const [chartData, setChartData] = useState<{ trend: any[]; leaveStatus: any[] }>({ trend: [], leaveStatus: [] });

  useEffect(() => { loadData(); if (tab==='profiles') loadProfiles(); if (['enterprise','overview'].includes(tab)) loadEnterprise(); }, [tab, selectedDate, enterpriseTab, weeklyStart, weeklyEnd, selectedMonth]);
  useEffect(() => { loadProfiles(); }, [profilePage]);

  async function loadProfiles() {
    try { const r = await profileService.getAllEngineers(profilePage, profileLimit); if (Array.isArray(r)) { setEngineerProfiles(r as any); setProfileTotal(r.length); } else { setEngineerProfiles(r.data as any); setProfileTotal(r.total); } } catch(e){console.error(e);}
  }

  async function loadData() {
    try {
      const el = await StorageService.getEngineers();
      setEngineers(Array.isArray(el) ? (el as any) : ((el as any).data||[]));
      const [ci,lv,rp] = await Promise.all([checkInService.getAllCheckIns(), leaveService.getAllLeaveRequests(), reportService.getReports()]);
      setLeaveRequests(lv); setCheckIns(ci.filter((c:any)=>c.date===selectedDate)); setReports(rp.filter((r:any)=>r.date===selectedDate));

      // Trend chart — 7 days
      const trend = Array.from({length:7},(_,i)=>{
        const d=new Date(); d.setDate(d.getDate()-(6-i));
        const ds=d.toISOString().split('T')[0];
        return { day: d.toLocaleDateString('en-US',{weekday:'short'}), present: ci.filter((c:any)=>c.date===ds).length, reports: rp.filter((r:any)=>r.date===ds).length };
      });
      const lvStatus = [
        { name:'Approved', value: lv.filter((l:any)=>l.status==='approved').length, fill:'#22c55e' },
        { name:'Pending',  value: lv.filter((l:any)=>l.status==='pending').length,  fill:'#f59e0b' },
        { name:'Rejected', value: lv.filter((l:any)=>l.status==='rejected').length, fill:'#f87171' },
      ].filter(x=>x.value>0);
      setChartData({ trend, leaveStatus: lvStatus });
    } catch(e){console.error(e);}
  }

  async function loadEnterprise() {
    try {
      setLoading(true);
      if (enterpriseTab==='daily'||tab==='overview') setAttendanceRegister(await hrReportService.getDailyAttendanceRegister(selectedDate));
      if (enterpriseTab==='weekly') setEngineerSummary(await hrReportService.getWeeklyEngineerSummary(weeklyStart,weeklyEnd));
      if (enterpriseTab==='monthly') setClientReports(await hrReportService.getMonthlyClientReport(selectedMonth));
      if (enterpriseTab==='backup') setBackupUsage(await hrReportService.getBackupUsage());
      if (enterpriseTab==='payroll') setPayrollData(await hrReportService.getPayrollData(selectedMonth));
    } catch(e){console.error(e);} finally{setLoading(false);}
  }

  function showToast(type:'success'|'error',text:string){setToast({type,text});setTimeout(()=>setToast(null),4000);}

  async function handleLeave(id:string,status:'approved'|'rejected'){
    if(!user)return; setLoading(true);
    try{ if(status==='approved') await leaveService.approveLeave(id,String(user.id)); else await leaveService.rejectLeave(id,String(user.id)); await loadData(); showToast('success',`Leave ${status}`); }
    catch(e:any){showToast('error',e.message||'Failed');} finally{setLoading(false);}
  }

  async function sendEmail(reportType:string,data:any[],subject:string,to?:string){
    if(!data?.length){alert('No data.');return;} setEmailSending(true);
    try{ const r=await fetch('/api/send-report-email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reportType,reportData:data,subject,recipientEmail:to||'sujay.palande@cybaemtech.com'})}); const result=await r.json(); if(r.ok){showToast('success','Email sent!');alert('Email sent!');} else throw new Error(result.details||result.error||'Failed'); }
    catch(e:any){showToast('error',e.message);alert(`Error: ${e.message}`);} finally{setEmailSending(false);}
  }

  const pending = leaveRequests.filter(l=>l.status==='pending').length;
  const present = attendanceRegister.filter(r=>r.status==='present').length;

  const statBlocks = [
    { label:'Present Today',   value:present,          icon:CheckCircle, color:'text-emerald-600', bg:'bg-emerald-50', border:'border-emerald-100' },
    { label:'Pending Leaves',  value:pending,           icon:Clock,       color:'text-amber-600',   bg:'bg-amber-50',   border:'border-amber-100'   },
    { label:'Total Staff',     value:engineers.length,  icon:Users,       color:'text-blue-600',    bg:'bg-blue-50',    border:'border-blue-100'    },
    { label:'Reports Today',   value:reports.length,    icon:FileText,    color:'text-violet-600',  bg:'bg-violet-50',  border:'border-violet-100'  },
  ];

  const ActionBar = ({exportFn,emailFn,showDate=true}:{exportFn:()=>void;emailFn:()=>void;showDate?:boolean}) => (
    <div className="flex flex-wrap items-center gap-2">
      {showDate && <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all" />}
      <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={exportFn} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all"><Download className="w-3.5 h-3.5"/>Export</motion.button>
      <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={emailFn} disabled={emailSending} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"><Send className="w-3.5 h-3.5"/>{emailSending?'Sending…':'Email'}</motion.button>
    </div>
  );

  const today    = new Date();
  const greeting = today.getHours() < 12 ? 'Good Morning' : today.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* ─── TOAST ─── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{opacity:0,x:40}} animate={{opacity:1,x:0}} exit={{opacity:0,x:40}}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-semibold shadow-lg ${toast.type==='success'?'bg-white border-emerald-200 text-emerald-700':'bg-white border-red-200 text-red-700'}`}>
            {toast.type==='success'?<CheckCircle className="w-4 h-4 text-emerald-500"/>:<AlertCircle className="w-4 h-4 text-red-500"/>}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── SIDEBAR ─── */}
      <aside className="w-60 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 flex flex-col z-30 overflow-y-auto">
        <div className="px-4 pt-5 pb-4 border-b border-slate-100">
          <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} className="flex items-center gap-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0"><Users className="w-4 h-4 text-white"/></div>
            <div><p className="text-slate-800 text-xs font-bold">HR Manager</p><p className="text-slate-400 text-xs">{greeting}</p></div>
          </motion.div>
        </div>
        <nav className="flex-1 px-3 pt-4 pb-4 space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-2">Navigation</p>
          {NAV.map((n,i) => (
            <motion.button key={n.id} onClick={()=>setTab(n.id)}
              initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
              whileHover={{x:3}} whileTap={{scale:0.97}}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left relative ${tab===n.id?'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-200':'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'}`}>
              {tab===n.id&&<motion.span layoutId="hrNavIndicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white/60 rounded-r-full" transition={{type:'spring',stiffness:400,damping:35}}/>}
              <n.icon className="w-4 h-4 shrink-0"/><span className="truncate">{n.label}</span>
            </motion.button>
          ))}
        </nav>
        <div className="px-3 pb-5 pt-3 border-t border-slate-100">
          <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={()=>{loadData();loadEnterprise();}} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`}/>Refresh
          </motion.button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">{NAV.find(n=>n.id===tab)?.label}</h1>
            <p className="text-slate-400 text-xs mt-0.5">HR Dashboard — {today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
          </div>
          <AnimatePresence>
            {pending>0&&(
              <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.8}}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"/><span className="text-amber-700 text-xs font-semibold">{pending} pending</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            <motion.div key={tab} variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-6">

              {/* Stat cards — shown on all tabs */}
              <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statBlocks.map(s=>(
                  <motion.div key={s.label} variants={fadeUp} whileHover={{y:-3,boxShadow:'0 8px 24px -4px rgba(0,0,0,0.08)'}}
                    className={`bg-white rounded-xl border p-5 ${s.border} flex items-center gap-4 cursor-default transition-shadow`}>
                    <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}><s.icon className={`w-5 h-5 ${s.color}`}/></div>
                    <div><p className="text-2xl font-bold text-slate-900"><AnimatedNumber value={s.value}/></p><p className="text-slate-500 text-xs font-medium mt-0.5">{s.label}</p></div>
                  </motion.div>
                ))}
              </motion.div>

              {/* ── OVERVIEW ── */}
              {tab==='overview'&&(
                <div className="space-y-5">
                  <div className="grid gap-5 lg:grid-cols-3">
                    {/* 7-day trend */}
                    <motion.div variants={fadeUp} className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div><p className="text-sm font-bold text-slate-800">7-Day Trend</p><p className="text-xs text-slate-400 mt-0.5">Check-ins & reports per day</p></div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full ring-1 ring-emerald-200">This Week</span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData.trend} margin={{top:4,right:4,left:-28,bottom:0}}>
                          <defs>
                            <linearGradient id="hrPresent" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={EM} stopOpacity={0.15}/><stop offset="95%" stopColor={EM} stopOpacity={0}/></linearGradient>
                            <linearGradient id="hrReports" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                          <XAxis dataKey="day" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                          <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e2e8f0',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}/>
                          <Area type="monotone" dataKey="present" stroke={EM} strokeWidth={2.5} fill="url(#hrPresent)" dot={{r:3,fill:EM,strokeWidth:0}} activeDot={{r:5}} name="Check-ins"/>
                          <Area type="monotone" dataKey="reports" stroke="#8b5cf6" strokeWidth={2} fill="url(#hrReports)" dot={{r:3,fill:'#8b5cf6',strokeWidth:0}} activeDot={{r:4}} name="Reports"/>
                        </AreaChart>
                      </ResponsiveContainer>
                      <div className="flex gap-4 mt-3">
                        {[{c:EM,l:'Check-ins'},{c:'#8b5cf6',l:'Reports'}].map(i=>(
                          <div key={i.l} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{background:i.c}}/><span className="text-xs font-medium text-slate-500">{i.l}</span></div>
                        ))}
                      </div>
                    </motion.div>

                    {/* Pie — leave status */}
                    <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 p-5">
                      <p className="text-sm font-bold text-slate-800 mb-1">Leave Status</p>
                      <p className="text-xs text-slate-400 mb-4">All-time distribution</p>
                      {chartData.leaveStatus.length>0?(
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                              <Pie data={chartData.leaveStatus} cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={3} dataKey="value">
                                {chartData.leaveStatus.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                              </Pie>
                              <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e2e8f0'}}/>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-col gap-1.5 mt-1">
                            {chartData.leaveStatus.map(d=>(
                              <div key={d.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{background:d.fill}}/><span className="text-xs text-slate-500">{d.name}</span></div>
                                <span className="text-xs font-bold text-slate-700">{d.value}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ):<p className="text-slate-400 text-xs text-center py-12">No leave data yet</p>}
                    </motion.div>
                  </div>

                  {/* Quick reports */}
                  <motion.div variants={fadeUp}>
                    <p className="text-slate-700 text-sm font-semibold mb-3">Quick Reports</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        {label:'Daily Attendance',sub:selectedDate,icon:CheckCircle,color:'text-emerald-600',bg:'bg-emerald-50',
                         data:()=>attendanceRegister.map(r=>({Engineer:r.engineerName,Status:r.status,'Check In':r.checkInTime?new Date(r.checkInTime).toLocaleTimeString():'-','Check Out':r.checkOutTime?new Date(r.checkOutTime).toLocaleTimeString():'-',Hours:r.hoursWorked?r.hoursWorked.toFixed(1):'-'}))},
                        {label:'Leave Summary',sub:`${leaveRequests.length} total`,icon:Calendar,color:'text-amber-600',bg:'bg-amber-50',
                         data:()=>leaveRequests.map(l=>({Engineer:l.engineerName||'','Start':l.startDate,'End':l.endDate,Reason:l.reason,Status:l.status}))},
                        {label:'Work Reports',sub:`${reports.length} today`,icon:FileText,color:'text-violet-600',bg:'bg-violet-50',
                         data:()=>reports.map(r=>({Engineer:(r as any).engineerName||'',Client:(r as any).clientName||'',Date:r.date,'Work Done':r.workDone,Issues:r.issues||'None'}))},
                      ].map(item=>(
                        <motion.div key={item.label} variants={fadeUp} whileHover={{y:-2,boxShadow:'0 8px 20px -4px rgba(0,0,0,0.08)'}}
                          className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-200 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}><item.icon className={`w-4 h-4 ${item.color}`}/></div>
                            <div><p className="font-semibold text-slate-800 text-sm">{item.label}</p><p className="text-slate-400 text-xs">{item.sub}</p></div>
                          </div>
                          <div className="flex gap-1.5">
                            <motion.button whileTap={{scale:0.9}} onClick={()=>exportToCSV(item.data(),item.label.toLowerCase().replace(/ /g,'-'))} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"><Download className="w-3.5 h-3.5"/></motion.button>
                            <motion.button whileTap={{scale:0.9}} onClick={()=>sendEmail(item.label,item.data(),`${item.label} - ${selectedDate}`)} disabled={emailSending} className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors border border-emerald-100 disabled:opacity-40"><Mail className="w-3.5 h-3.5"/></motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}

              {/* ── MUSTER ── */}
              {tab==='muster'&&<div className="bg-white rounded-xl border border-slate-200 p-6"><MusterRoll/></div>}

              {/* ── ATTENDANCE ── */}
              {tab==='attendance'&&(
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-slate-800 text-sm font-bold">{checkIns.length} check-ins for {new Date(selectedDate).toLocaleDateString()}</p><p className="text-slate-400 text-xs mt-0.5">Daily attendance register</p></div>
                    <ActionBar exportFn={()=>exportToCSV(checkIns.map(c=>({Engineer:(c as any).engineerName||'',' Check In':new Date(c.checkInTime).toLocaleString(),'Check Out':c.checkOutTime?new Date(c.checkOutTime).toLocaleString():'-',Date:c.date,Location:c.locationName||'-'})),`attendance-${selectedDate}`)} emailFn={()=>sendEmail('attendance',checkIns.map(c=>({Engineer:(c as any).engineerName||'',' Check In':c.checkInTime?new Date(c.checkInTime).toLocaleString():'-',Date:c.date})),`Attendance - ${selectedDate}`)}/>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="bg-slate-50 border-b border-slate-200">{['Engineer','Check In','Check Out','Location','Status'].map(h=><th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {checkIns.map((ci,idx)=>(
                          <motion.tr key={ci.id} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:idx*0.04}} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-semibold text-white text-sm">{((ci as any).engineerName||'U')[0].toUpperCase()}</div><span className="font-semibold text-slate-800 text-sm">{(ci as any).engineerName||'Unknown'}</span></div></td>
                            <td className="px-5 py-4 text-slate-700 text-sm font-medium">{ci.checkInTime?new Date(ci.checkInTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—'}</td>
                            <td className="px-5 py-4 text-slate-500 text-sm">{ci.checkOutTime?new Date(ci.checkOutTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):<span className="text-slate-300">—</span>}</td>
                            <td className="px-5 py-4">{ci.latitude&&ci.longitude&&parseFloat(String(ci.latitude))!==0?(<a href={`https://www.google.com/maps?q=${ci.latitude},${ci.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 w-fit"><MapPin className="w-3 h-3"/>Map ↗</a>):(ci as any).locationName?(<span className="text-slate-400 text-xs truncate max-w-[140px] block">{(ci as any).locationName}</span>):<span className="text-slate-300">—</span>}</td>
                            <td className="px-5 py-4"><StatusPill status={ci.checkOutTime?'completed':'active'}/></td>
                          </motion.tr>
                        ))}
                        {checkIns.length===0&&<tr><td colSpan={5} className="py-16 text-center"><div className="flex flex-col items-center gap-2"><div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-emerald-400"/></div><p className="text-slate-500 text-sm font-medium">No check-ins for this date</p></div></td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── LEAVE ── */}
              {tab==='leave'&&(
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-slate-800 text-sm font-bold">{leaveRequests.length} leave requests</p><p className="text-slate-400 text-xs mt-0.5">{pending} pending approval</p></div>
                    <ActionBar exportFn={()=>exportToCSV(leaveRequests.map(l=>({Engineer:l.engineerName||'','Start':l.startDate,'End':l.endDate,Reason:l.reason,Status:l.status})),`leave-${new Date().toISOString().split('T')[0]}`)} emailFn={()=>sendEmail('leave',leaveRequests.map(l=>({Engineer:l.engineerName||'','Start':l.startDate,'End':l.endDate,Status:l.status})),`Leave Summary - ${new Date().toLocaleDateString()}`)} showDate={false}/>
                  </div>
                  <div className="space-y-3">
                    {leaveRequests.map((l,idx)=>(
                      <motion.div key={l.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:idx*0.05}}
                        whileHover={{y:-2}} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-200 hover:shadow-sm transition-all">
                        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">{(l.engineerName||'U')[0].toUpperCase()}</div>
                            <div><p className="font-semibold text-slate-800 text-sm">{l.engineerName||'Unknown'}</p><p className="text-slate-400 text-xs mt-0.5">{new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}</p></div>
                          </div>
                          <StatusPill status={l.status}/>
                        </div>
                        <div className="px-5 py-4 space-y-3">
                          <p className="text-slate-600 text-sm leading-relaxed">{l.reason}</p>
                          {l.backupEngineerName&&<p className="text-slate-400 text-xs flex items-center gap-1.5"><Users className="w-3 h-3"/>Backup: <span className="text-slate-700 font-semibold ml-1">{l.backupEngineerName}</span></p>}
                          {l.status==='pending'&&(
                            <div className="space-y-3 pt-1">
                              <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Select Backup Engineer</label>
                                <select value={backupSelections[l.id]||''} onChange={e=>setBackupSelections(prev=>({...prev,[l.id]:e.target.value}))} className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none transition-all appearance-none">
                                  <option value="">No backup needed</option>
                                  {engineers.filter((e:any)=>e.id!==l.engineerId).map((e:any)=><option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={()=>handleLeave(l.id,'approved')} disabled={loading} className="flex-1 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold border border-emerald-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"><CheckCircle className="w-3.5 h-3.5"/>Approve</motion.button>
                                <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.97}} onClick={()=>handleLeave(l.id,'rejected')} disabled={loading} className="flex-1 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold border border-red-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"><XCircle className="w-3.5 h-3.5"/>Reject</motion.button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {leaveRequests.length===0&&<div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center"><div className="flex flex-col items-center gap-2"><div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-400"/></div><p className="text-slate-500 text-sm font-medium">No leave requests</p></div></div>}
                  </div>
                </div>
              )}

              {/* ── REPORTS ── */}
              {tab==='reports'&&(
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-slate-800 text-sm font-bold">{reports.length} reports for {new Date(selectedDate).toLocaleDateString()}</p><p className="text-slate-400 text-xs mt-0.5">Daily work logs</p></div>
                    <ActionBar exportFn={()=>exportToCSV(reports.map(r=>({Engineer:(r as any).engineerName||'',Client:(r as any).clientName||'',Date:r.date,'Work Done':r.workDone,Issues:r.issues||'None'})),`reports-${selectedDate}`)} emailFn={()=>sendEmail('reports',reports.map(r=>({Engineer:(r as any).engineerName||'',Client:(r as any).clientName||'',Date:r.date,'Work Done':r.workDone})),`Work Reports - ${selectedDate}`)}/>
                  </div>
                  <div className="space-y-3">
                    {reports.map((r,idx)=>(
                      <motion.div key={r.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:idx*0.05}} whileHover={{y:-2}}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-emerald-200 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-semibold text-sm">{((r as any).engineerName||'E')[0]}</div>
                          <div className="flex-1 min-w-0"><p className="font-semibold text-slate-800 text-sm">{(r as any).engineerName||'Staff'}</p><p className="text-slate-400 text-xs">{(r as any).clientName||''}</p></div>
                          <span className="text-slate-400 text-xs">{new Date(r.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</span>
                        </div>
                        <div className="px-5 py-4 space-y-2.5">
                          <p className="text-slate-600 text-sm leading-relaxed">{r.workDone}</p>
                          {r.issues&&<div className="flex gap-2 bg-red-50 rounded-lg p-3 border border-red-100"><AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/><p className="text-red-600 text-sm">{r.issues}</p></div>}
                        </div>
                      </motion.div>
                    ))}
                    {reports.length===0&&<div className="py-16 rounded-xl border border-dashed border-slate-200 bg-white text-center"><div className="flex flex-col items-center gap-2"><div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center"><FileText className="w-5 h-5 text-violet-400"/></div><p className="text-slate-500 text-sm font-medium">No reports for this date</p></div></div>}
                  </div>
                </div>
              )}

              {tab==='clientwise'&&<HRClientWiseView/>}

              {/* ── ENTERPRISE ── */}
              {tab==='enterprise'&&(
                <div className="space-y-5">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
                    {(['daily','weekly','monthly','backup','payroll'] as const).map(t=>(
                      <motion.button key={t} onClick={()=>setEnterpriseTab(t)} whileTap={{scale:0.95}}
                        className={`px-3.5 py-2 rounded-md text-xs font-semibold uppercase tracking-wide transition-all ${enterpriseTab===t?'bg-emerald-600 text-white shadow-sm':'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>{t}</motion.button>
                    ))}
                  </div>

                  {enterpriseTab==='daily'&&(
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-slate-600 text-sm font-medium">{attendanceRegister.length} engineers for {selectedDate}</p>
                        <ActionBar exportFn={()=>exportToCSV(attendanceRegister.map(r=>({Engineer:r.engineerName,Status:r.status,Hours:r.hoursWorked?.toFixed(1)||'-'})),`daily-${selectedDate}`)} emailFn={()=>sendEmail('daily',attendanceRegister.map(r=>({Engineer:r.engineerName,Status:r.status})),`Daily Attendance - ${selectedDate}`)}/>
                      </div>

                      {/* Bar chart */}
                      {attendanceRegister.length>0&&(
                        <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 p-5">
                          <p className="text-sm font-bold text-slate-800 mb-4">Hours Worked Today</p>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={attendanceRegister.filter(r=>r.hoursWorked&&r.hoursWorked>0).map(r=>({name:r.engineerName.split(' ')[0],hours:parseFloat((r.hoursWorked||0).toFixed(1))}))} margin={{top:4,right:4,left:-28,bottom:0}}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                              <XAxis dataKey="name" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                              <Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'1px solid #e2e8f0'}}/>
                              <Bar dataKey="hours" fill={EM} radius={[4,4,0,0]} name="Hours"/>
                            </BarChart>
                          </ResponsiveContainer>
                        </motion.div>
                      )}

                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                          <thead><tr className="bg-slate-50 border-b border-slate-200">{['Engineer','Status','Check In','Check Out','Hours'].map(h=><th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {attendanceRegister.map((r,i)=>(
                              <motion.tr key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-4 font-medium text-slate-800 text-sm">{r.engineerName}</td>
                                <td className="px-5 py-4"><StatusPill status={r.status}/></td>
                                <td className="px-5 py-4 text-slate-600 text-sm">{r.checkInTime?new Date(r.checkInTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—'}</td>
                                <td className="px-5 py-4 text-slate-500 text-sm">{r.checkOutTime?new Date(r.checkOutTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'—'}</td>
                                <td className="px-5 py-4 text-emerald-600 text-sm font-semibold">{r.hoursWorked?`${r.hoursWorked.toFixed(1)}h`:'—'}</td>
                              </motion.tr>
                            ))}
                            {attendanceRegister.length===0&&<tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">No data for this date</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {enterpriseTab==='weekly'&&(
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <input type="date" value={weeklyStart} onChange={e=>setWeeklyStart(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all"/>
                          <span className="text-slate-400">—</span>
                          <input type="date" value={weeklyEnd} onChange={e=>setWeeklyEnd(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all"/>
                        </div>
                        <motion.button whileTap={{scale:0.97}} onClick={()=>exportToCSV(engineerSummary.map(e=>({Engineer:e.engineerName,Days:e.presentDays,Hours:e.totalHours?.toFixed(1)})),'weekly-summary')} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all"><Download className="w-3.5 h-3.5"/>Export</motion.button>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                          <thead><tr className="bg-slate-50 border-b border-slate-200">{['Engineer','Days Present','Total Hours','Avg/Day'].map(h=><th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {engineerSummary.map((e,i)=>(
                              <motion.tr key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-4 font-medium text-slate-800 text-sm">{e.engineerName}</td>
                                <td className="px-5 py-4 text-slate-700 text-sm font-semibold">{e.presentDays}</td>
                                <td className="px-5 py-4 text-emerald-600 text-sm font-semibold">{e.totalHours?.toFixed(1)||'—'}h</td>
                                <td className="px-5 py-4 text-slate-500 text-sm">{e.presentDays?((e.totalHours||0)/e.presentDays).toFixed(1):'—'}h</td>
                              </motion.tr>
                            ))}
                            {engineerSummary.length===0&&<tr><td colSpan={4} className="py-12 text-center text-slate-400 text-sm">No data for selected range</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {enterpriseTab==='monthly'&&(
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all"/>
                        <motion.button whileTap={{scale:0.97}} onClick={()=>exportToCSV(clientReports.map(c=>({Client:c.clientName,Engineers:c.engineerCount,Reports:c.reportCount})),`monthly-${selectedMonth}`)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all"><Download className="w-3.5 h-3.5"/>Export</motion.button>
                      </div>
                      <motion.div variants={stagger} initial="initial" animate="animate" className="grid gap-3 md:grid-cols-2">
                        {clientReports.map((c,i)=>(
                          <motion.div key={i} variants={fadeUp} whileHover={{y:-2,boxShadow:'0 8px 20px -4px rgba(0,0,0,0.08)'}} className="bg-white rounded-xl p-5 border border-slate-200 hover:border-emerald-200 transition-all">
                            <div className="flex items-center gap-3 mb-4"><div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">{c.clientName?.[0]||'C'}</div><p className="font-semibold text-slate-800 text-sm">{c.clientName}</p></div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100"><p className="text-xl font-bold text-slate-900">{c.engineerCount}</p><p className="text-slate-400 text-xs mt-0.5">Engineers</p></div>
                              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100"><p className="text-xl font-bold text-emerald-700">{c.reportCount}</p><p className="text-emerald-500 text-xs mt-0.5">Reports</p></div>
                            </div>
                          </motion.div>
                        ))}
                        {clientReports.length===0&&<div className="col-span-2 py-12 text-center text-slate-400 text-sm">No data for this month</div>}
                      </motion.div>
                    </div>
                  )}

                  {enterpriseTab==='backup'&&(
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <div className="flex items-center gap-2 mb-5"><Database className="w-4 h-4 text-emerald-500"/><p className="text-slate-700 text-sm font-semibold">Backup Usage</p></div>
                      {backupUsage?<div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Object.entries(backupUsage).map(([k,v])=><div key={k} className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center"><p className="text-xl font-bold text-slate-900">{String(v)}</p><p className="text-slate-400 text-xs mt-1">{k}</p></div>)}</div>:<p className="text-slate-400 text-sm text-center py-8">No backup data</p>}
                    </div>
                  )}

                  {enterpriseTab==='payroll'&&(
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 outline-none focus:border-emerald-400 transition-all"/>
                        <motion.button whileTap={{scale:0.97}} onClick={()=>exportToCSV(payrollData.map(p=>({Engineer:p.engineerName,Days:p.presentDays,Amount:p.amount})),`payroll-${selectedMonth}`)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all"><Download className="w-3.5 h-3.5"/>Export</motion.button>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full">
                          <thead><tr className="bg-slate-50 border-b border-slate-200">{['Engineer','Days Present','Amount'].map(h=><th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {payrollData.map((p,i)=>(
                              <motion.tr key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-4 font-medium text-slate-800 text-sm">{p.engineerName}</td>
                                <td className="px-5 py-4 text-slate-700 text-sm font-semibold">{p.presentDays}</td>
                                <td className="px-5 py-4 text-emerald-600 text-sm font-semibold">₹{p.amount?.toLocaleString()||'—'}</td>
                              </motion.tr>
                            ))}
                            {payrollData.length===0&&<tr><td colSpan={3} className="py-12 text-center text-slate-400 text-sm">No payroll data</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PROFILES ── */}
              {tab==='profiles'&&(
                <div className="space-y-5">
                  <div><p className="text-slate-800 text-sm font-bold"><AnimatedNumber value={profileTotal}/> staff profiles</p><p className="text-slate-400 text-xs mt-0.5">All registered staff</p></div>
                  <motion.div variants={stagger} initial="initial" animate="animate" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {engineerProfiles.map(ep=>{
                      const role=((ep as any).role||'engineer').toLowerCase();
                      const cfg:Record<string,{bg:string;text:string;av:string}>={
                        admin:{bg:'bg-violet-50',text:'text-violet-700',av:'bg-violet-600'},
                        engineer:{bg:'bg-blue-50',text:'text-blue-700',av:'bg-blue-600'},
                        hr:{bg:'bg-emerald-50',text:'text-emerald-700',av:'bg-emerald-600'},
                        client:{bg:'bg-amber-50',text:'text-amber-700',av:'bg-amber-500'},
                      };
                      const c=cfg[role]||cfg.engineer;
                      return (
                        <motion.div key={(ep as any).id||(ep as any).userId} variants={fadeUp} whileHover={{y:-2,boxShadow:'0 8px 20px -4px rgba(0,0,0,0.06)'}}
                          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-emerald-200 transition-all cursor-default">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-10 h-10 rounded-full ${c.av} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{((ep as any).name||'E')[0].toUpperCase()}</div>
                            <div className="min-w-0"><p className="font-semibold text-slate-800 text-sm truncate">{(ep as any).name||'Staff'}</p><p className="text-slate-400 text-xs truncate">{(ep as any).email||''}</p></div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>{role}</span>
                            {(ep as any).phone&&<span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500">{(ep as any).phone}</span>}
                          </div>
                        </motion.div>
                      );
                    })}
                    {engineerProfiles.length===0&&<div className="col-span-3 py-16 text-center text-slate-400 text-sm">No profiles found</div>}
                  </motion.div>
                  {profileTotal>profileLimit&&(
                    <div className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl">
                      <span className="text-xs text-slate-400">{((profilePage-1)*profileLimit)+1}–{Math.min(profilePage*profileLimit,profileTotal)} of {profileTotal}</span>
                      <div className="flex gap-1.5">
                        <button disabled={profilePage===1} onClick={()=>setProfilePage(p=>p-1)} className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 text-slate-500"><ChevronLeft className="w-4 h-4"/></button>
                        <button disabled={profilePage*profileLimit>=profileTotal} onClick={()=>setProfilePage(p=>p+1)} className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 text-slate-500"><ChevronRight className="w-4 h-4"/></button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
