import { useState, useEffect } from 'react';
import {
  Users, Building2, UserCog, Activity, Plus, UserPlus, X, Shield, Settings,
  TrendingUp, ChevronLeft, ChevronRight, Clock, LayoutDashboard,
  Calendar, Pencil, Trash2, Eye, ArrowUpRight, CheckCircle, AlertCircle,
} from 'lucide-react';
import { User, Client, Assignment } from '../../types';
import { StorageService } from '../../lib/storage';
import CompanyProfile from '../CompanyProfile';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'users' | 'clients' | 'assignments' | 'muster' | 'company-profile' | 'settings';

const NAV: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'overview',        label: 'Overview',    icon: LayoutDashboard, desc: 'Dashboard summary' },
  { id: 'users',           label: 'Users',       icon: Users,           desc: 'Manage staff' },
  { id: 'clients',         label: 'Clients',     icon: Building2,       desc: 'Client accounts' },
  { id: 'assignments',     label: 'Assignments', icon: UserCog,         desc: 'Engineer mapping' },
  { id: 'muster',          label: 'Muster Roll', icon: TrendingUp,      desc: 'Monthly register' },
  { id: 'company-profile', label: 'Company',     icon: Shield,          desc: 'Org settings' },
  { id: 'settings',        label: 'Settings',    icon: Settings,        desc: 'Configuration' },
];

const F = 'w-full bg-white border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all shadow-sm';
const FL = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5';

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-y-auto max-h-[90vh] border border-slate-100">
        {children}
      </div>
    </div>
  );
}

function MHead({ title, sub, icon: Icon, onClose }: { title: string; sub: string; icon: React.ElementType; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-md shadow-violet-200">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-sm">{title}</p>
          <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
        </div>
      </div>
      <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
        <X className="w-4 h-4" />
      </button>
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
  async function deleteUser(id: string) { if (!confirm('Delete this user?')) return; try { await StorageService.deleteUser(id); flash('success', 'Deleted'); await load(); } catch (e: any) { flash('error', e.message); } }
  async function deleteClient(id: string) { if (!confirm('Delete this client?')) return; try { await StorageService.deleteClient(id); flash('success', 'Deleted'); await load(); } catch (e: any) { flash('error', e.message); } }
  async function deleteAssignment(id: any) { if (!confirm('Remove assignment?')) return; try { await StorageService.deleteAssignment(Number(id)); flash('success', 'Removed'); await load(); } catch (e: any) { flash('error', e.message); } }
  async function updateAssignment() { if (!editAssignment) return; try { await StorageService.updateAssignment(editAssignment.id as any, { engineerId: editAssignment.engineerId, clientId: editAssignment.clientId }); flash('success', 'Updated'); setEditAssignment(null); await load(); } catch (e: any) { flash('error', e.message); } }
  async function updateUser() { if (!editUser) return; try { await StorageService.updateUser(editUser.id, { name: editUser.name, email: editUser.email, phone: editUser.phone, role: editUser.role, designation: editUser.designation }); flash('success', 'Updated'); setEditUser(null); await load(); } catch (e: any) { flash('error', e.message); } }
  async function updateClient() { if (!editClient) return; try { await StorageService.updateClient(editClient.id, { name: editClient.name, contactPerson: editClient.contactPerson, email: editClient.email, phone: editClient.phone }); flash('success', 'Updated'); setEditClient(null); await load(); } catch (e: any) { flash('error', e.message); } }
  async function syncZoho() { try { setIsSyncing(true); const r = await fetch('/php/api/sync-zoho.php'); const d = await r.json(); if (!r.ok) throw new Error(d.error); flash('success', d.message || 'Synced'); await load(); } catch (e: any) { flash('error', e.message); } finally { setIsSyncing(false); } }

  const statBlocks = [
    { label: 'Total Staff',       value: stats.totalEngineers,   icon: Users,    gradient: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-50',    iconColor: 'text-blue-600',   trend: '+2 this month' },
    { label: 'Clients',           value: stats.totalClients,      icon: Building2, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50',  iconColor: 'text-violet-600', trend: 'Active accounts' },
    { label: 'Live Assignments',  value: stats.activeAssignments, icon: UserCog,  gradient: 'from-emerald-500 to-teal-600',  bg: 'bg-emerald-50', iconColor: 'text-emerald-600', trend: 'Currently mapped' },
    { label: "Today's Check-ins", value: stats.todayCheckIns,     icon: Activity, gradient: 'from-amber-500 to-orange-500',  bg: 'bg-amber-50',   iconColor: 'text-amber-600',  trend: 'As of now' },
  ];

  const roleBadge = (role: string) => {
    const cfg: Record<string, string> = {
      admin:    'bg-violet-100 text-violet-700 border border-violet-200',
      hr:       'bg-emerald-100 text-emerald-700 border border-emerald-200',
      engineer: 'bg-blue-100 text-blue-700 border border-blue-200',
    };
    return cfg[role] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="flex min-h-screen bg-[#f4f6f9]">

      {/* ─── SIDEBAR ─── */}
      <aside className="w-64 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-[#0d1117] flex flex-col z-30 overflow-y-auto">
        <div className="px-3 pt-6 pb-4 flex-1">
          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-4 px-3">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-150 text-left group ${
                  tab === n.id
                    ? 'bg-violet-600 text-white font-semibold shadow-lg shadow-violet-900/40'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.06] font-medium'
                }`}>
                <n.icon className={`w-4 h-4 shrink-0 transition-colors ${tab === n.id ? 'text-white' : 'text-white/30 group-hover:text-white/70'}`} />
                <span className="truncate">{n.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="px-3 pb-6 pt-4 border-t border-white/[0.06]">
          <button onClick={() => { setUserRole('engineer'); setShowAddUser(true); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-all duration-150 shadow-lg shadow-violet-900/30">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-64 flex-1 min-h-screen flex flex-col">

        {/* Page header */}
        <div className="sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{NAV.find(n => n.id === tab)?.label}</h1>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Admin Control Center</p>
          </div>
          {msg && (
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold border shadow-sm ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}
        </div>

        <div className="flex-1 p-8 space-y-6">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {statBlocks.map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-px transition-all duration-200 overflow-hidden relative">
                    <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${s.gradient}`} />
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                      <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{s.value}</p>
                    <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mt-1">{s.label}</p>
                    <p className="text-slate-300 text-[10px] mt-1 font-medium">{s.trend}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-4">Quick Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: 'Add Engineer',    icon: UserPlus,  gradient: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-50',   action: () => { setUserRole('engineer'); setShowAddUser(true); } },
                    { label: 'Add HR',          icon: UserPlus,  gradient: 'from-emerald-500 to-teal-600',  bg: 'bg-emerald-50', action: () => { setUserRole('hr');       setShowAddUser(true); } },
                    { label: 'Add Client',      icon: Building2, gradient: 'from-amber-500 to-orange-500',  bg: 'bg-amber-50',  action: () => setShowAddClient(true) },
                    { label: 'Assign Engineer', icon: UserCog,   gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', action: () => setShowAssign(true) },
                    { label: 'Add Admin',       icon: Shield,    gradient: 'from-rose-500 to-pink-600',     bg: 'bg-rose-50',   action: () => { setUserRole('admin'); setShowAddUser(true); } },
                  ].map(a => (
                    <button key={a.label} onClick={a.action}
                      className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md hover:-translate-y-px transition-all duration-150 group text-left">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center`}>
                          <a.icon className="w-5 h-5 text-slate-600" />
                        </div>
                        <span className="font-semibold text-slate-700 text-sm">{a.label}</span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
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
                <p className="text-slate-500 text-sm font-medium">{userTotal} total users</p>
                <div className="flex gap-2">
                  <button onClick={syncZoho} disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 shadow-sm">
                    <Activity className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Zoho'}
                  </button>
                  <button onClick={() => { setUserRole('engineer'); setShowAddUser(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-200">
                    <Plus className="w-4 h-4" /> Add User
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      {['Name', 'Status', 'Role', 'Contact', ''].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map(u => {
                      const u2 = u as any;
                      const sessions = u2.todaySessions?.length || 0;
                      const latest = sessions > 0 ? u2.todaySessions[sessions - 1] : null;
                      const isActive = latest ? !latest.todayCheckOut : (!u2.todayCheckOut && u2.todayCheckIn);
                      const checkedIn = latest || u2.todayCheckIn || u2.todayCheckOut;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 font-bold text-sm shadow-sm">
                                {u.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                                <p className="text-slate-400 text-[11px] font-medium">{u.designation || 'Staff'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {checkedIn ? (
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                <span className={`text-xs font-semibold ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>{isActive ? 'On duty' : 'Checked out'}</span>
                              </div>
                            ) : <span className="text-xs text-slate-300 font-medium">—</span>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${roleBadge(u.role)}`}>{u.role}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-600 text-xs font-medium">{u.email}</p>
                            <p className="text-slate-400 text-[11px]">{u.phone}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setViewItem({ type: 'user', data: u })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Users className="w-6 h-6 text-slate-400" /></div>
                      <p className="text-slate-500 text-sm font-semibold">No users found</p>
                      <p className="text-slate-300 text-xs">Add your first user to get started</p>
                    </div>
                  </div>
                )}
              </div>

              {userTotal > userLimit && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Page {userPage} of {Math.ceil(userTotal / userLimit)}</span>
                  <div className="flex gap-2">
                    <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={userPage * userLimit >= userTotal} onClick={() => setUserPage(p => p + 1)} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 disabled:opacity-30 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CLIENTS ── */}
          {tab === 'clients' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-sm font-medium">{clients.length} clients registered</p>
                <button onClick={() => setShowAddClient(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-200">
                  <Plus className="w-4 h-4" />Add Client
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {clients.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-violet-200 hover:shadow-md transition-all duration-150 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-md shadow-violet-200">{c.name?.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                        <p className="text-slate-500 text-xs font-medium">{c.contactPerson}</p>
                        <p className="text-slate-400 text-[11px]">{c.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewItem({ type: 'client', data: c })} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditClient(c)} className="p-2 rounded-xl hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteClient(c.id)} className="p-2 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="col-span-2 py-20 rounded-2xl border border-dashed border-slate-200 bg-white text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Building2 className="w-6 h-6 text-slate-400" /></div>
                      <p className="text-slate-500 text-sm font-semibold">No clients yet</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ASSIGNMENTS ── */}
          {tab === 'assignments' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-sm font-medium">{assignments.length} active assignments</p>
                <button onClick={() => setShowAssign(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-200">
                  <Plus className="w-4 h-4" />Assign Engineer
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      {['Engineer', 'Client', 'Assigned Date', ''].map(h => (
                        <th key={h} className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {assignments.map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                              {(a.engineerName || 'E')[0]}
                            </div>
                            <span className="font-semibold text-slate-800 text-sm">{a.engineerName || a.engineerId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-violet-700 font-bold text-sm">
                              {(a.clientName || 'C')[0]}
                            </div>
                            <span className="font-semibold text-slate-700 text-sm">{a.clientName || a.clientId}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm font-medium">{a.assignedDate ? new Date(a.assignedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditAssignment(a)} className="p-1.5 rounded-lg hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteAssignment(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {assignments.length === 0 && (
                      <tr><td colSpan={4} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><UserCog className="w-6 h-6 text-slate-400" /></div>
                          <p className="text-slate-500 text-sm font-semibold">No assignments yet</p>
                        </div>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── MUSTER ── */}
          {tab === 'muster' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-6">
              <MusterRoll />
            </div>
          )}

          {/* ── COMPANY PROFILE ── */}
          {tab === 'company-profile' && <CompanyProfile />}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Settings className="w-6 h-6 text-slate-400" /></div>
                <p className="text-slate-500 text-sm font-semibold">Settings coming soon</p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── MODALS ── */}

      {/* Add User */}
      {showAddUser && (
        <Modal onClose={() => setShowAddUser(false)}>
          <MHead title={`Add ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`} sub="Create a new account" icon={UserPlus} onClose={() => setShowAddUser(false)} />
          <div className="p-6 space-y-4">
            <div>
              <label className={FL}>Role</label>
              <div className="flex gap-2">
                {(['engineer', 'hr', 'admin'] as const).map(r => (
                  <button key={r} onClick={() => setUserRole(r)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${userRole === r ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200' : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            {['name', 'email', 'phone'].map(field => (
              <div key={field}>
                <label className={FL}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input type={field === 'email' ? 'email' : 'text'} value={(form as any)[field]} onChange={e => setForm({ ...form, [field]: e.target.value })} className={F} placeholder={`Enter ${field}`} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddUser(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={addUser} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-200">Add User</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit User */}
      {editUser && (
        <Modal onClose={() => setEditUser(null)}>
          <MHead title="Edit User" sub="Update user details" icon={Pencil} onClose={() => setEditUser(null)} />
          <div className="p-6 space-y-4">
            {(['name', 'email', 'phone', 'designation'] as const).map(field => (
              <div key={field}>
                <label className={FL}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input type="text" value={(editUser as any)[field] || ''} onChange={e => setEditUser({ ...editUser, [field]: e.target.value } as User)} className={F} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={updateUser} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-200">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Client */}
      {showAddClient && (
        <Modal onClose={() => setShowAddClient(false)}>
          <MHead title="Add Client" sub="Register a new client account" icon={Building2} onClose={() => setShowAddClient(false)} />
          <div className="p-6 space-y-4">
            {(['name', 'contactPerson', 'email', 'phone'] as const).map(field => (
              <div key={field}>
                <label className={FL}>{field === 'contactPerson' ? 'Contact Person' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input type={field === 'email' ? 'email' : 'text'} value={(clientForm as any)[field]} onChange={e => setClientForm({ ...clientForm, [field]: e.target.value })} className={F} placeholder={`Enter ${field}`} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddClient(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={addClient} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-200">Add Client</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Client */}
      {editClient && (
        <Modal onClose={() => setEditClient(null)}>
          <MHead title="Edit Client" sub="Update client details" icon={Pencil} onClose={() => setEditClient(null)} />
          <div className="p-6 space-y-4">
            {(['name', 'contactPerson', 'email', 'phone'] as const).map(field => (
              <div key={field}>
                <label className={FL}>{field === 'contactPerson' ? 'Contact Person' : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input type="text" value={(editClient as any)[field] || ''} onChange={e => setEditClient({ ...editClient, [field]: e.target.value } as Client)} className={F} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditClient(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={updateClient} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-200">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Engineer */}
      {showAssign && (
        <Modal onClose={() => setShowAssign(false)}>
          <MHead title="Assign Engineer" sub="Map an engineer to a client" icon={UserCog} onClose={() => setShowAssign(false)} />
          <div className="p-6 space-y-4">
            <div>
              <label className={FL}>Engineer</label>
              <select value={assignForm.engineerId} onChange={e => setAssignForm({ ...assignForm, engineerId: e.target.value })} className={`${F} appearance-none`}>
                <option value="" disabled>Select engineer...</option>
                {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className={FL}>Client</label>
              <select value={assignForm.clientId} onChange={e => setAssignForm({ ...assignForm, clientId: e.target.value })} className={`${F} appearance-none`}>
                <option value="" disabled>Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAssign(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={assignEngineer} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-200">Assign</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Assignment */}
      {editAssignment && (
        <Modal onClose={() => setEditAssignment(null)}>
          <MHead title="Edit Assignment" sub="Update engineer mapping" icon={UserCog} onClose={() => setEditAssignment(null)} />
          <div className="p-6 space-y-4">
            <div>
              <label className={FL}>Engineer</label>
              <select value={editAssignment.engineerId} onChange={e => setEditAssignment({ ...editAssignment, engineerId: e.target.value })} className={`${F} appearance-none`}>
                {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className={FL}>Client</label>
              <select value={editAssignment.clientId} onChange={e => setEditAssignment({ ...editAssignment, clientId: e.target.value })} className={`${F} appearance-none`}>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditAssignment(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={updateAssignment} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold hover:from-violet-500 hover:to-purple-500 transition-all shadow-md shadow-violet-200">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Item */}
      {viewItem && (
        <Modal onClose={() => setViewItem(null)}>
          <MHead title={`View ${viewItem.type.charAt(0).toUpperCase() + viewItem.type.slice(1)}`} sub="Details" icon={Eye} onClose={() => setViewItem(null)} />
          <div className="p-6">
            <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
              {Object.entries(viewItem.data).filter(([k]) => !['id', 'createdAt', 'updatedAt', 'userId'].includes(k)).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-400 font-medium capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-slate-700 font-semibold text-right truncate max-w-[200px]">{String(v || '—')}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setViewItem(null)} className="w-full mt-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">Close</button>
          </div>
        </Modal>
      )}

    </div>
  );
}
