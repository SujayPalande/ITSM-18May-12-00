import { useState, useEffect } from 'react';
import {
  Users, Building2, UserCog, Activity, Plus, UserPlus, X, Shield, Settings,
  TrendingUp, ChevronDown, ChevronLeft, ChevronRight, Clock, LayoutDashboard,
  Calendar, Pencil, Trash2, Eye, ArrowUpRight, Zap,
} from 'lucide-react';
import { User, Client, Assignment } from '../../types';
import { StorageService } from '../../lib/storage';
import CompanyProfile from '../CompanyProfile';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'users' | 'clients' | 'assignments' | 'muster' | 'company-profile' | 'settings';

const NAV: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',        label: 'Overview',    icon: LayoutDashboard },
  { id: 'users',           label: 'Users',       icon: Users },
  { id: 'clients',         label: 'Clients',     icon: Building2 },
  { id: 'assignments',     label: 'Assignments', icon: UserCog },
  { id: 'muster',          label: 'Muster Roll', icon: TrendingUp },
  { id: 'company-profile', label: 'Company',     icon: Shield },
  { id: 'settings',        label: 'Settings',    icon: Settings },
];

const F = 'w-full bg-white/10 border border-white/20 focus:border-white/60 focus:ring-2 focus:ring-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none transition-all';
const FL = 'block text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5';

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f172a] border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        {children}
      </div>
    </div>
  );
}

function MHead({ title, sub, icon: Icon, onClose }: { title: string; sub: string; icon: React.ElementType; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Icon className="w-4 h-4 text-white" /></div>
        <div><p className="font-bold text-white text-sm">{title}</p><p className="text-white/40 text-xs">{sub}</p></div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40"><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [engineers, setEngineers] = useState<User[]>([]);
  const [stats, setStats] = useState({ totalEngineers: 0, totalClients: 0, activeAssignments: 0, todayCheckIns: 0 });
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [userRole, setUserRole] = useState<'engineer' | 'hr' | 'admin'>('engineer');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [clientForm, setClientForm] = useState({ name: '', contactPerson: '', email: '', phone: '' });
  const [assignForm, setAssignForm] = useState({ engineerId: '', clientId: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [viewItem, setViewItem] = useState<{ type: 'user' | 'client' | 'assignment'; data: any } | null>(null);
  const [editAssignment, setEditAssignment] = useState<Assignment | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const userLimit = 20;

  useEffect(() => { load(); }, [tab, userPage]);

  async function load() {
    try {
      const [ur, allClients, allAssignments, allCheckIns] = await Promise.all([
        StorageService.getUsers(tab === 'users' ? userPage : 0, tab === 'users' ? userLimit : 0),
        StorageService.getClients(), StorageService.getAssignments(), StorageService.getCheckIns(),
      ]);
      const fu = Array.isArray(ur) ? ur : ur.data;
      const total = Array.isArray(ur) ? ur.length : ur.total;
      const activeA = allAssignments.filter((a: any) => a.status === 'active' || a.isActive === 1 || a.is_active === 1);
      const today = new Date().toISOString().split('T')[0];
      setUsers(fu); setUserTotal(total); setClients(allClients); setAssignments(activeA);
      setEngineers(fu.filter((u: User) => u.role === 'engineer'));
      setStats({ totalEngineers: total, totalClients: allClients.length, activeAssignments: activeA.length, todayCheckIns: allCheckIns.filter((c: any) => c.date === today).length });
    } catch (e) { console.error(e); }
  }

  function flash(type: 'success' | 'error', text: string) { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000); }

  async function addUser() {
    try { await StorageService.addUser({ id: Math.random().toString(36).substr(2, 9), email: form.email, name: form.name, role: userRole, phone: form.phone, createdAt: new Date().toISOString() }); flash('success', `${userRole} added`); setShowAddUser(false); setForm({ name: '', email: '', phone: '', password: '' }); await load(); } catch (e: any) { flash('error', e.message); }
  }
  async function addClient() {
    try { await StorageService.createClient({ name: clientForm.name, contactPerson: clientForm.contactPerson, email: clientForm.email, phone: clientForm.phone, userId: '' }); flash('success', 'Client added'); setShowAddClient(false); setClientForm({ name: '', contactPerson: '', email: '', phone: '' }); await load(); } catch (e: any) { flash('error', e.message); }
  }
  async function assignEngineer() {
    try { await StorageService.createAssignment({ engineerId: assignForm.engineerId, clientId: assignForm.clientId, assignedDate: new Date().toISOString().split('T')[0], status: 'active', siteId: '' }); flash('success', 'Assigned'); setShowAssign(false); setAssignForm({ engineerId: '', clientId: '' }); await load(); } catch (e: any) { flash('error', e.message); }
  }
  async function deleteUser(id: string) { if (!confirm('Delete?')) return; try { await StorageService.deleteUser(id); flash('success', 'Deleted'); await load(); } catch (e: any) { flash('error', e.message); } }
  async function deleteClient(id: string) { if (!confirm('Delete?')) return; try { await StorageService.deleteClient(id); flash('success', 'Deleted'); await load(); } catch (e: any) { flash('error', e.message); } }
  async function deleteAssignment(id: any) { if (!confirm('Remove?')) return; try { await StorageService.deleteAssignment(Number(id)); flash('success', 'Removed'); await load(); } catch (e: any) { flash('error', e.message); } }
  async function updateAssignment() { if (!editAssignment) return; try { await StorageService.updateAssignment(editAssignment.id as any, { engineerId: editAssignment.engineerId, clientId: editAssignment.clientId }); flash('success', 'Updated'); setEditAssignment(null); await load(); } catch (e: any) { flash('error', e.message); } }
  async function updateUser() { if (!editUser) return; try { await StorageService.updateUser(editUser.id, { name: editUser.name, email: editUser.email, phone: editUser.phone, role: editUser.role, designation: editUser.designation }); flash('success', 'Updated'); setEditUser(null); await load(); } catch (e: any) { flash('error', e.message); } }
  async function updateClient() { if (!editClient) return; try { await StorageService.updateClient(editClient.id, { name: editClient.name, contactPerson: editClient.contactPerson, email: editClient.email, phone: editClient.phone }); flash('success', 'Updated'); setEditClient(null); await load(); } catch (e: any) { flash('error', e.message); } }
  async function syncZoho() { try { setIsSyncing(true); const r = await fetch('/php/api/sync-zoho.php'); const d = await r.json(); if (!r.ok) throw new Error(d.error); flash('success', d.message || 'Synced'); await load(); } catch (e: any) { flash('error', e.message); } finally { setIsSyncing(false); } }

  const statBlocks = [
    { label: 'Total Staff',       value: stats.totalEngineers,   icon: Users,    color: 'from-blue-500 to-blue-700' },
    { label: 'Clients',           value: stats.totalClients,      icon: Building2, color: 'from-violet-500 to-violet-700' },
    { label: 'Live Assignments',  value: stats.activeAssignments, icon: UserCog,  color: 'from-emerald-500 to-emerald-700' },
    { label: "Today's Check-ins", value: stats.todayCheckIns,     icon: Activity, color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="flex min-h-screen bg-[#0a0f1e]">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-56 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[#0f172a] border-r border-white/[0.06] flex flex-col z-30 overflow-y-auto">
        <div className="px-4 pt-6 pb-4">
          <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.25em] mb-4">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tab === n.id
                    ? 'bg-white/10 text-white shadow-lg shadow-black/20'
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}>
                <n.icon className={`w-4 h-4 shrink-0 ${tab === n.id ? 'text-white' : 'text-white/30'}`} />
                {n.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto px-4 pb-6 pt-4 border-t border-white/[0.06]">
          <button onClick={() => { setUserRole('engineer'); setShowAddUser(true); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-56 flex-1 min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="sticky top-14 z-20 bg-[#0a0f1e]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">
              {NAV.find(n => n.id === tab)?.label}
            </h1>
            <p className="text-white/30 text-xs mt-0.5">Admin Control Center</p>
          </div>
          {msg && (
            <div className={`px-4 py-2 rounded-xl text-xs font-bold ${msg.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
              {msg.text}
            </div>
          )}
        </div>

        <div className="flex-1 p-8 space-y-8">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {statBlocks.map(s => (
                  <div key={s.label} className="relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08] p-6 hover:border-white/20 transition-all group">
                    <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-5 shadow-lg`}>
                      <s.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-4xl font-black text-white tracking-tighter">{s.value}</p>
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-4">Quick Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Add Engineer', icon: UserPlus, action: () => { setUserRole('engineer'); setShowAddUser(true); } },
                    { label: 'Add HR',       icon: UserPlus, action: () => { setUserRole('hr');       setShowAddUser(true); } },
                    { label: 'Add Client',   icon: Building2, action: () => setShowAddClient(true) },
                    { label: 'Assign Engineer', icon: UserCog, action: () => setShowAssign(true) },
                    { label: 'Add Admin',    icon: Shield, action: () => { setUserRole('admin'); setShowAddUser(true); } },
                  ].map(a => (
                    <button key={a.label} onClick={a.action}
                      className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.06] transition-all group text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                          <a.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-white/80 text-sm">{a.label}</span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-sm">{userTotal} total users</p>
                <div className="flex gap-2">
                  <button onClick={syncZoho} disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-white/[0.06] border border-white/10 text-white/60 rounded-xl text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-40">
                    <Activity className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Zoho'}
                  </button>
                  <button onClick={() => { setUserRole('engineer'); setShowAddUser(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors">
                    <Plus className="w-4 h-4" /> Add User
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Name', 'Status', 'Role', 'Contact', ''].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const u2 = u as any;
                      const sessions = u2.todaySessions?.length || 0;
                      const latest = sessions > 0 ? u2.todaySessions[sessions - 1] : null;
                      const isActive = latest ? !latest.todayCheckOut : (!u2.todayCheckOut && u2.todayCheckIn);
                      const checkedIn = latest || u2.todayCheckIn || u2.todayCheckOut;
                      return (
                        <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-white font-black text-sm">
                                {u.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{u.name}</p>
                                <p className="text-white/30 text-[11px]">{u.designation || 'Staff'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {checkedIn ? (
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                                <span className="text-xs font-semibold text-white/60">{isActive ? 'On duty' : 'Checked out'}</span>
                              </div>
                            ) : <span className="text-xs text-white/20">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              u.role === 'admin' ? 'bg-violet-500/20 text-violet-300' :
                              u.role === 'hr' ? 'bg-emerald-500/20 text-emerald-300' :
                              u.role === 'engineer' ? 'bg-blue-500/20 text-blue-300' :
                              'bg-white/10 text-white/50'
                            }`}>{u.role}</span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-white/50 text-xs">{u.email}</p>
                            <p className="text-white/30 text-[11px]">{u.phone}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setViewItem({ type: 'user', data: u })} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {users.length === 0 && <div className="py-16 text-center text-white/20 text-sm">No users found</div>}
              </div>
              {userTotal > userLimit && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/30">Page {userPage} of {Math.ceil(userTotal / userLimit)}</span>
                  <div className="flex gap-2">
                    <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="p-2 rounded-xl border border-white/10 text-white/40 disabled:opacity-20 hover:bg-white/10 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={userPage * userLimit >= userTotal} onClick={() => setUserPage(p => p + 1)} className="p-2 rounded-xl border border-white/10 text-white/40 disabled:opacity-20 hover:bg-white/10 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CLIENTS ── */}
          {tab === 'clients' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-sm">{clients.length} clients registered</p>
                <button onClick={() => setShowAddClient(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors"><Plus className="w-4 h-4" />Add Client</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {clients.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.05] transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-base">{c.name?.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-white text-sm">{c.name}</p>
                        <p className="text-white/40 text-xs">{c.contactPerson}</p>
                        <p className="text-white/25 text-[11px]">{c.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewItem({ type: 'client', data: c })} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditClient(c)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="col-span-2 py-16 text-center rounded-2xl border border-dashed border-white/10 text-white/20 text-sm">No clients yet</div>
                )}
              </div>
            </div>
          )}

          {/* ── ASSIGNMENTS ── */}
          {tab === 'assignments' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-white/40 text-sm">{assignments.length} active assignments</p>
                <button onClick={() => setShowAssign(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-xl text-sm font-bold hover:bg-white/90 transition-colors"><Plus className="w-4 h-4" />New Assignment</button>
              </div>
              <div className="rounded-2xl border border-white/[0.08] overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-white/[0.06]">{['Engineer','Client','Date','Status',''].map(h => <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black text-white/30 uppercase tracking-widest">{h}</th>)}</tr></thead>
                  <tbody>
                    {assignments.map(a => (
                      <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors group">
                        <td className="px-5 py-4 font-bold text-white text-sm">{a.engineerName || a.engineerId}</td>
                        <td className="px-5 py-4 text-white/50 text-sm">{a.clientName || a.clientId}</td>
                        <td className="px-5 py-4 text-white/30 text-xs">{a.assignedDate ? new Date(a.assignedDate).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-4"><span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider">Active</span></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewItem({ type: 'assignment', data: a })} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditAssignment(a)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteAssignment(a.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {assignments.length === 0 && <div className="py-16 text-center text-white/20 text-sm">No assignments</div>}
              </div>
            </div>
          )}

          {tab === 'muster'          && <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white"><MusterRoll /></div>}
          {tab === 'company-profile' && <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-white"><CompanyProfile /></div>}
          {tab === 'settings' && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Settings className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-white/30 font-semibold">Settings panel coming soon</p>
            </div>
          )}

        </div>
      </main>

      {/* ─── MODALS ─── */}
      {showAddUser && (
        <Modal onClose={() => setShowAddUser(false)}>
          <MHead title={`Add ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`} sub="Create a new system account" icon={UserPlus} onClose={() => setShowAddUser(false)} />
          <div className="p-6 space-y-4">
            <div><label className={FL}>Role</label><div className="relative"><select value={userRole} onChange={e => setUserRole(e.target.value as any)} className={`${F} appearance-none pr-10`}><option value="engineer">Engineer</option><option value="hr">HR</option><option value="admin">Admin</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" /></div></div>
            <div><label className={FL}>Full Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={F} placeholder="John Doe" /></div>
            <div><label className={FL}>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={F} placeholder="name@company.com" /></div>
            <div><label className={FL}>Password</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={F} placeholder="••••••••" /></div>
            <div><label className={FL}>Phone</label><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={F} placeholder="+1 555 000-0000" /></div>
            <button onClick={addUser} className="w-full py-3 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-white/90 transition-colors mt-2">Create Account</button>
          </div>
        </Modal>
      )}

      {showAddClient && (
        <Modal onClose={() => setShowAddClient(false)}>
          <MHead title="Add Client" sub="Register a new partner client" icon={Building2} onClose={() => setShowAddClient(false)} />
          <div className="p-6 space-y-4">
            <div><label className={FL}>Organization Name</label><input value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className={F} placeholder="Acme Corp" /></div>
            <div><label className={FL}>Contact Person</label><input value={clientForm.contactPerson} onChange={e => setClientForm({ ...clientForm, contactPerson: e.target.value })} className={F} placeholder="Contact Name" /></div>
            <div><label className={FL}>Email</label><input type="email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} className={F} placeholder="contact@company.com" /></div>
            <div><label className={FL}>Phone</label><input type="tel" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })} className={F} placeholder="+1 555 000-0000" /></div>
            <button onClick={addClient} className="w-full py-3 bg-amber-400 text-slate-900 rounded-2xl font-black text-sm hover:bg-amber-300 transition-colors mt-2">Register Client</button>
          </div>
        </Modal>
      )}

      {showAssign && (
        <Modal onClose={() => setShowAssign(false)}>
          <MHead title="Assign Engineer" sub="Deploy resource to client site" icon={UserCog} onClose={() => setShowAssign(false)} />
          <div className="p-6 space-y-4">
            <div><label className={FL}>Select Engineer</label><div className="relative"><select value={assignForm.engineerId} onChange={e => setAssignForm({ ...assignForm, engineerId: e.target.value })} className={`${F} appearance-none pr-10`}><option value="">Choose...</option>{engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" /></div></div>
            <div><label className={FL}>Target Client</label><div className="relative"><select value={assignForm.clientId} onChange={e => setAssignForm({ ...assignForm, clientId: e.target.value })} className={`${F} appearance-none pr-10`}><option value="">Choose...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" /></div></div>
            <button onClick={assignEngineer} disabled={!assignForm.engineerId || !assignForm.clientId} className="w-full py-3 bg-violet-500 text-white rounded-2xl font-black text-sm hover:bg-violet-400 transition-colors mt-2 disabled:opacity-40">Confirm Assignment</button>
          </div>
        </Modal>
      )}

      {editUser && (
        <Modal onClose={() => setEditUser(null)}>
          <MHead title="Edit User" sub="Update account info" icon={UserPlus} onClose={() => setEditUser(null)} />
          <div className="p-6 space-y-4">
            <div><label className={FL}>Name</label><input value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} className={F} /></div>
            <div><label className={FL}>Email</label><input type="email" value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} className={F} /></div>
            <div><label className={FL}>Phone</label><input type="tel" value={editUser.phone || ''} onChange={e => setEditUser({ ...editUser, phone: e.target.value })} className={F} /></div>
            <div><label className={FL}>Role</label><div className="relative"><select value={editUser.role} onChange={(e: any) => setEditUser({ ...editUser, role: e.target.value })} className={`${F} appearance-none pr-10`}><option value="engineer">Engineer</option><option value="hr">HR</option><option value="admin">Admin</option><option value="client">Client</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" /></div></div>
            <button onClick={updateUser} className="w-full py-3 bg-white text-slate-900 rounded-2xl font-black text-sm mt-2">Save Changes</button>
          </div>
        </Modal>
      )}

      {editClient && (
        <Modal onClose={() => setEditClient(null)}>
          <MHead title="Edit Client" sub="Update client details" icon={Building2} onClose={() => setEditClient(null)} />
          <div className="p-6 space-y-4">
            <div><label className={FL}>Name</label><input value={editClient.name} onChange={e => setEditClient({ ...editClient, name: e.target.value })} className={F} /></div>
            <div><label className={FL}>Contact Person</label><input value={editClient.contactPerson} onChange={e => setEditClient({ ...editClient, contactPerson: e.target.value })} className={F} /></div>
            <div><label className={FL}>Email</label><input type="email" value={editClient.email} onChange={e => setEditClient({ ...editClient, email: e.target.value })} className={F} /></div>
            <button onClick={updateClient} className="w-full py-3 bg-amber-400 text-slate-900 rounded-2xl font-black text-sm mt-2">Save Changes</button>
          </div>
        </Modal>
      )}

      {editAssignment && (
        <Modal onClose={() => setEditAssignment(null)}>
          <MHead title="Edit Assignment" sub="Reassign engineer or client" icon={UserCog} onClose={() => setEditAssignment(null)} />
          <div className="p-6 space-y-4">
            <div><label className={FL}>Engineer</label><div className="relative"><select value={editAssignment.engineerId} onChange={e => setEditAssignment({ ...editAssignment, engineerId: e.target.value })} className={`${F} appearance-none pr-10`}><option value="">Select</option>{engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" /></div></div>
            <div><label className={FL}>Client</label><div className="relative"><select value={editAssignment.clientId} onChange={e => setEditAssignment({ ...editAssignment, clientId: e.target.value })} className={`${F} appearance-none pr-10`}><option value="">Select</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" /></div></div>
            <button onClick={updateAssignment} className="w-full py-3 bg-violet-500 text-white rounded-2xl font-black text-sm mt-2">Save Changes</button>
          </div>
        </Modal>
      )}

      {viewItem && (
        <Modal onClose={() => setViewItem(null)}>
          <MHead title={`${viewItem.type.charAt(0).toUpperCase() + viewItem.type.slice(1)} Details`} sub="Record information" icon={Eye} onClose={() => setViewItem(null)} />
          <div className="p-6 space-y-3">
            {viewItem.type === 'user' && [['Name', viewItem.data.name], ['Email', viewItem.data.email], ['Phone', viewItem.data.phone || '—'], ['Role', viewItem.data.role], ['Designation', viewItem.data.designation || '—']].map(([l, v]) => (
              <div key={l} className="flex justify-between py-3 border-b border-white/[0.06] last:border-0">
                <span className="text-white/30 text-xs font-bold uppercase tracking-wider">{l}</span>
                <span className="text-white text-sm font-semibold">{v}</span>
              </div>
            ))}
            {viewItem.type === 'client' && [['Name', viewItem.data.name], ['Contact', viewItem.data.contactPerson], ['Email', viewItem.data.email], ['Phone', viewItem.data.phone || '—']].map(([l, v]) => (
              <div key={l} className="flex justify-between py-3 border-b border-white/[0.06] last:border-0">
                <span className="text-white/30 text-xs font-bold uppercase tracking-wider">{l}</span>
                <span className="text-white text-sm font-semibold">{v}</span>
              </div>
            ))}
            {viewItem.type === 'assignment' && [['Engineer', viewItem.data.engineerName], ['Client', viewItem.data.clientName], ['Status', 'Active']].map(([l, v]) => (
              <div key={l} className="flex justify-between py-3 border-b border-white/[0.06] last:border-0">
                <span className="text-white/30 text-xs font-bold uppercase tracking-wider">{l}</span>
                <span className="text-white text-sm font-semibold">{v}</span>
              </div>
            ))}
            <button onClick={() => setViewItem(null)} className="w-full py-3 bg-white/10 text-white rounded-2xl font-bold text-sm mt-2 hover:bg-white/20 transition-colors">Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
