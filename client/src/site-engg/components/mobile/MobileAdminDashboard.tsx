import { useState, useEffect } from 'react';
import { 
  Users, Building2, UserCog, Activity, Shield, 
  RefreshCw, TrendingUp, Search, PlusCircle, UserPlus,
  Plus, X, ChevronDown, Settings, LogOut, Filter, BarChart3, Mail,
  Clock, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { StorageService } from '../../lib/storage';
import CompanyProfile from '../CompanyProfile';
import type { User, Client, Assignment } from '../../types';

export default function MobileAdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'clients' | 'assignments' | 'company' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [engineers, setEngineers] = useState<User[]>([]);
  const [stats, setStats] = useState({ totalEngineers: 0, totalClients: 0, activeAssignments: 0, todayCheckIns: 0 });

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [userRole, setUserRole] = useState<'engineer' | 'hr' | 'admin'>('engineer');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });
  const [clientFormData, setClientFormData] = useState({ name: '', contactPerson: '', email: '', phone: '' });
  const [assignFormData, setAssignFormData] = useState({ engineerId: '', clientId: '' });
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([]);
  const [notifying, setNotifying] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadData(); }, [activeTab]);

  async function loadData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const [allU, allC, allA, allCk] = await Promise.all([
        StorageService.getUsers(), StorageService.getClients(),
        StorageService.getAssignments(), StorageService.getCheckIns()
      ]);
      const actA = allA.filter(a => a.status === 'active' || (a as any).isActive === 1 || (a as any).is_active === 1);
      const allE = allU.filter(u => u.role === 'engineer');
      const today = new Date().toISOString().split('T')[0];
      setUsers(allU); setClients(allC); setAssignments(actA); setEngineers(allE);
      setStats({
        totalEngineers: allE.length, totalClients: allC.length,
        activeAssignments: actA.length, todayCheckIns: allCk.filter(c => c.date === today).length
      });
    } catch (e) { console.error(e); } finally { setLoading(false); setRefreshing(false); }
  }

  const handleAddUser = async () => {
    try {
      await StorageService.addUser({ id: Math.random().toString(36).substr(2, 9), ...formData, role: userRole, createdAt: new Date().toISOString() });
      setMessage({ type: 'success', text: 'User added!' }); setShowAddUserModal(false); setFormData({ name: '', email: '', phone: '', password: '' }); loadData();
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
  };

  const handleAddClient = async () => {
    try {
      await StorageService.createClient({ ...clientFormData, userId: '' });
      setMessage({ type: 'success', text: 'Client added!' }); setShowAddClientModal(false); setClientFormData({ name: '', contactPerson: '', email: '', phone: '' }); loadData();
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
  };

  const handleAssign = async () => {
    try {
      await StorageService.createAssignment({ ...assignFormData, assignedDate: new Date().toISOString().split('T')[0], status: 'active', siteId: '' });
      setMessage({ type: 'success', text: 'Assigned!' }); setShowAssignModal(false); setAssignFormData({ engineerId: '', clientId: '' }); loadData();
    } catch (e: any) { setMessage({ type: 'error', text: e.message }); }
  };

  const handleNotifyClients = async () => {
    if (selectedEngineers.length === 0) return;
    try {
      setNotifying(true);
      const res = await StorageService.notifyClients(selectedEngineers);
      setMessage({ type: 'success', text: `Sent notifications for ${selectedEngineers.length} staff members!` });
      setSelectedEngineers([]);
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setNotifying(false);
    }
  };

  const toggleEngineerSelection = (id: string) => {
    setSelectedEngineers(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4"><RefreshCw className="w-10 h-10 text-red-400 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      {/* Premium Header */}
      <div className="bg-gradient-to-br from-red-600 via-rose-600 to-rose-700 text-slate-800 px-6 pt-12 pb-20 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="flex justify-between items-center relative z-10 mb-8">
          <div><h1 className="text-3xl font-black uppercase tracking-tight">Admin Console</h1><p className="text-red-100 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mt-1">Global System Control</p></div>
          <button onClick={() => loadData(true)} className="p-4 bg-white/20 rounded-2xl border border-white/20 active:scale-90 transition-all"><RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          {[ ['Engineers', stats.totalEngineers, UserPlus], ['Clients', stats.totalClients, Building2], ['Tasks', stats.activeAssignments, UserCog], ['Today', stats.todayCheckIns, Clock] ].map(([l, v, I]:any) => (
            <div key={l} className="bg-white/10 backdrop-blur-lg p-5 rounded-[2rem] border border-white/10 flex items-center gap-4">
              <div className="p-2 bg-white/10 rounded-xl"><I className="w-5 h-5 text-slate-800" /></div>
              <div><p className="text-[10px] font-black uppercase tracking-widest text-red-100/70">{l}</p><p className="text-2xl font-black tracking-tighter">{v}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50 flex justify-around items-center px-4 py-3 pb-8 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
         {[ {id:'overview', icon:Activity, label:'Main'}, {id:'users', icon:Users, label:'Staff'}, {id:'clients', icon:Building2, label:'Partners'}, {id:'assignments', icon:UserCog, label:'Deploy'}, {id:'company', icon:Shield, label:'Org'} ].map(t => (
           <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${activeTab === t.id ? 'text-red-400 scale-110' : 'text-slate-500'}`}>
              <t.icon className="w-6 h-6" /><span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
           </button>
         ))}
      </div>

      <div className="px-5 -mt-8 relative z-20 space-y-6">
        {message && <div className={`p-4 rounded-3xl font-bold text-sm shadow-lg ${message.type === 'success' ? 'bg-emerald-500/[0.06]0 text-slate-800' : 'bg-red-500/[0.06]0 text-slate-800'}`}>{message.text}</div>}
        
        {activeTab === 'overview' && (
          <div className="grid gap-3">
             <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 px-2">Rapid Deployment</h4>
             {[ 
               ['Add Engineer', UserPlus, 'blue', () => {setUserRole('engineer'); setShowAddUserModal(true);}],
               ['Add HR', UserPlus, 'emerald', () => {setUserRole('hr'); setShowAddUserModal(true);}],
               ['Register Client', Building2, 'orange', () => setShowAddClientModal(true)],
               ['Assign Project', UserCog, 'purple', () => setShowAssignModal(true)],
               ['System Admin', Shield, 'red', () => {setUserRole('admin'); setShowAddUserModal(true);}]
             ].map(([l, I, c, a]: any) => (
               <button key={l} onClick={a} className="flex items-center gap-4 p-6 bg-white border border-slate-100 rounded-[2rem] text-left active:scale-95 transition-all"><div className={`p-4 bg-${c}-50 rounded-2xl text-${c}-600`}><I className="w-6 h-6" /></div><div><p className="font-black text-slate-700 uppercase leading-none">{l}</p><p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Management Action</p></div></button>
             ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Staff Management ({users.length})</h4>
              {selectedEngineers.length > 0 && (
                <button 
                  onClick={handleNotifyClients}
                  disabled={notifying}
                  className="bg-red-500/[0.12] text-red-400 border border-red-500/15 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/30 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Mail className="w-3 h-3" /> {notifying ? 'Sending...' : 'Notify Clients'}
                </button>
              )}
            </div>
            {users.map(u => {
              const isSelected = selectedEngineers.includes(u.id);
              const isEngineer = u.role === 'engineer';
              return (
                <div 
                  key={u.id} 
                  onClick={() => isEngineer && toggleEngineerSelection(u.id)}
                  className={`p-5 rounded-[2rem] border shadow-sm flex items-center justify-between transition-all ${isSelected ? 'bg-red-500/[0.06] border-red-200' : 'bg-white border-slate-100'} ${isEngineer ? 'cursor-pointer active:scale-98' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${isSelected ? 'bg-red-500/[0.12] text-red-400 border border-red-500/15' : 'bg-slate-50'}`}>
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-slate-800 uppercase leading-none">{u.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{u.role} • {u.email}</p>
                    </div>
                  </div>
                  {isEngineer && (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-red-600 border-red-600' : 'border-slate-100'}`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  )}
                  {!isEngineer && <ChevronRight className="w-4 h-4 text-slate-800/15" />}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'clients' && clients.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 mb-4"><div className="p-4 bg-red-500/[0.06] rounded-2xl text-red-400"><Building2 className="w-7 h-7" /></div><div><p className="font-black text-slate-700 uppercase leading-none">{c.name}</p><p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{c.contactPerson || 'No Contact'}</p></div></div>
        ))}

        {activeTab === 'assignments' && assignments.map(a => (
          <div key={a.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 space-y-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4"><span className="px-3 py-1 bg-emerald-500/[0.06] text-emerald-400 rounded-lg text-[9px] font-black uppercase">Live</span></div>
             <div className="flex items-start gap-4"><div className="p-4 bg-slate-50 rounded-2xl font-black text-slate-500 text-xs">TASK</div><div><p className="text-[10px] font-black text-slate-500 uppercase">Field Resource</p><p className="font-extrabold text-slate-700 uppercase">{engineers.find(e => e.id === a.engineerId)?.name}</p></div></div>
             <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-sm font-bold text-slate-600 uppercase"><Building2 className="w-4 h-4 text-red-400/80" /> {clients.find(c => c.id === a.clientId)?.name}</div>
          </div>
        ))}

        {activeTab === 'company' && <CompanyProfile />}

        {activeTab === 'settings' && (
           <div className="space-y-6 pb-8">
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 text-center">
                 <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6"><Settings className="w-10 h-10 text-slate-800/15" /></div>
                 <h3 className="text-xl font-black uppercase mb-1">System Control</h3>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-10">Administrative Node: IN-1</p>
                 <button onClick={()=>signOut()} className="w-full py-5 bg-slate-900 text-slate-800 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"><LogOut className="w-4 h-4" /> Sign Out</button>
              </div>
           </div>
        )}
      </div>

      {/* Modals - Optimized for Next-Level UI */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] p-4 flex items-end justify-center"><div className="bg-white w-full max-w-sm rounded-[3rem] p-10 border border-slate-100 animate-in slide-in-from-bottom-10">
          <div className="flex justify-between items-center mb-10"><h2 className="text-2xl font-black uppercase tracking-tight">New {userRole}</h2><button onClick={()=>setShowAddUserModal(false)} className="p-3 bg-slate-50 rounded-full"><X className="w-6 h-6 text-slate-500"/></button></div>
          <div className="space-y-4">
            <input type="text" placeholder="Full Name" className="w-full p-5 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-red-500 transition-all shadow-inner" onChange={e=>setFormData({...formData, name: e.target.value})}/>
            <input type="email" placeholder="Work Email" className="w-full p-5 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-red-500 transition-all shadow-inner" onChange={e=>setFormData({...formData, email: e.target.value})}/>
            <input type="tel" placeholder="Mobile" className="w-full p-5 bg-slate-50 border-0 rounded-2xl font-bold text-sm focus:ring-2 focus:ring-red-500 transition-all shadow-inner" onChange={e=>setFormData({...formData, phone: e.target.value})}/>
            <button onClick={handleAddUser} className="w-full py-6 bg-red-500/[0.12] text-red-400 border border-red-500/15 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/30 mt-4 active:scale-95 transition-all">Launch Account</button>
          </div>
        </div></div>
      )}

      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] p-4 flex items-end justify-center"><div className="bg-white w-full max-w-sm rounded-[3rem] p-10 border border-slate-100 animate-in slide-in-from-bottom-10">
          <div className="flex justify-between items-center mb-10"><h2 className="text-2xl font-black uppercase tracking-tight">Add Client</h2><button onClick={()=>setShowAddClientModal(false)} className="p-3 bg-slate-50 rounded-full"><X className="w-6 h-6 text-slate-500"/></button></div>
          <div className="space-y-4">
            <input type="text" placeholder="Organization" className="w-full p-5 bg-slate-50 border-0 rounded-2xl font-bold text-sm shadow-inner" onChange={e=>setClientFormData({...clientFormData, name: e.target.value})}/>
            <input type="text" placeholder="POC Name" className="w-full p-5 bg-slate-50 border-0 rounded-2xl font-bold text-sm shadow-inner" onChange={e=>setClientFormData({...clientFormData, contactPerson: e.target.value})}/>
            <input type="email" placeholder="POC Email" className="w-full p-5 bg-slate-50 border-0 rounded-2xl font-bold text-sm shadow-inner" onChange={e=>setClientFormData({...clientFormData, email: e.target.value})}/>
            <button onClick={handleAddClient} className="w-full py-6 bg-orange-600 text-slate-800 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-500/30 mt-4 active:scale-95 transition-all">Add Client</button>
          </div>
        </div></div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] p-4 flex items-end justify-center"><div className="bg-white w-full max-w-sm rounded-[3rem] p-10 border border-slate-100 animate-in slide-in-from-bottom-10">
          <div className="flex justify-between items-center mb-10"><h2 className="text-2xl font-black uppercase tracking-tight">Deployment</h2><button onClick={()=>setShowAssignModal(false)} className="p-3 bg-slate-50 rounded-full"><X className="w-6 h-6 text-slate-500"/></button></div>
          <div className="space-y-4">
            <select className="w-full p-5 bg-slate-50 border-0 rounded-2xl font-bold text-sm shadow-inner" onChange={e=>setAssignFormData({...assignFormData, engineerId: e.target.value})}><option value="">Select Engineer...</option>{engineers.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>
            <select className="w-full p-5 bg-slate-50 border-0 rounded-2xl font-bold text-sm shadow-inner" onChange={e=>setAssignFormData({...assignFormData, clientId: e.target.value})}><option value="">Select Client...</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
            <button onClick={handleAssign} className="w-full py-6 bg-purple-600 text-slate-800 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-purple-500/30 mt-4 active:scale-95 transition-all">Engage</button>
          </div>
        </div></div>
      )}
    </div>
  );
}
