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

const F = 'w-full bg-white border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-50 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all';
const FL = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5';

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl shadow-slate-200/80 w-full max-w-md overflow-y-auto max-h-[90vh]">
        {children}
      </div>
    </div>
  );
}

function MHead({ title, sub, icon: Icon, onClose }: { title: string; sub: string; icon: React.ElementType; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-violet-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">{title}</p>
          <p className="text-slate-400 text-xs">{sub}</p>
        </div>
      </div>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
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
    { label: 'Total Staff',       value: stats.totalEngineers,   icon: Users,    bg: 'bg-blue-50',   iconColor: 'text-blue-600',   trend: '+2 this month' },
    { label: 'Clients',           value: stats.totalClients,      icon: Building2, bg: 'bg-violet-50', iconColor: 'text-violet-600', trend: 'Active accounts' },
    { label: 'Live Assignments',  value: stats.activeAssignments, icon: UserCog,  bg: 'bg-emerald-50', iconColor: 'text-emerald-600', trend: 'Currently mapped' },
    { label: "Today's Check-ins", value: stats.todayCheckIns,     icon: Activity, bg: 'bg-amber-50',  iconColor: 'text-amber-600',  trend: 'As of now' },
  ];

  const roleBadge = (role: string) => {
    const cfg: Record<string, string> = {
      admin:    'bg-violet-50 text-violet-600 border border-violet-100',
      hr:       'bg-emerald-50 text-emerald-600 border border-emerald-100',
      engineer: 'bg-blue-50 text-blue-600 border border-blue-100',
    };
    return cfg[role] || 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* ─── SIDEBAR ─── */}
      <aside className="w-60 shrink-0 fixed top-14 left-0 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-100 flex flex-col z-30 shadow-[1px_0_0_0_#f1f5f9] overflow-y-auto">
        <div className="px-3 pt-6 pb-4 flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 px-2">Navigation</p>
          <nav className="space-y-0.5">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 text-left group ${
                  tab === n.id
                    ? 'bg-violet-50 text-violet-700 font-semibold shadow-[inset_2px_0_0_#7c3aed]'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-medium'
                }`}>
                <n.icon className={`w-4 h-4 shrink-0 transition-colors ${tab === n.id ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-500'}`} />
                <span className="truncate">{n.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="px-4 pb-6 pt-4 border-t border-slate-100">
          <button onClick={() => { setUserRole('engineer'); setShowAddUser(true); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all duration-150 shadow-sm">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </aside>

      {/* ─── MAIN ─── */}
      <main className="ml-60 flex-1 min-h-screen flex flex-col">
        <div className="sticky top-14 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">{NAV.find(n => n.id === tab)?.label}</h1>
            <p className="text-slate-400 text-xs mt-0.5">Admin Control Center</p>
          </div>
          {msg && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {msg.text}
            </div>
          )}
        </div>

        <div className="flex-1 p-8 space-y-7">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-7">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statBlocks.map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 border border-slate-50">
                    <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-4`}>
                      <s.icon className={`w-[18px] h-[18px] ${s.iconColor}`} />
                    </div>
                    <p className="text-3xl font-bold text-slate-800 tracking-tight">{s.value}</p>
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-widest mt-1">{s.label}</p>
                    <p className="text-slate-300 text-[10px] mt-1">{s.trend}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-widest mb-4">Quick Actions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: 'Add Engineer',    icon: UserPlus,  color: 'blue',   action: () => { setUserRole('engineer'); setShowAddUser(true); } },
                    { label: 'Add HR',          icon: UserPlus,  color: 'emerald', action: () => { setUserRole('hr');       setShowAddUser(true); } },
                    { label: 'Add Client',      icon: Building2, color: 'amber',  action: () => setShowAddClient(true) },
                    { label: 'Assign Engineer', icon: UserCog,   color: 'violet', action: () => setShowAssign(true) },
                    { label: 'Add Admin',       icon: Shield,    color: 'rose',   action: () => { setUserRole('admin'); setShowAddUser(true); } },
                  ].map(a => {
                    const colors: Record<string, string> = {
                      blue:    'bg-blue-50 border-blue-100 text-blue-700 group-hover:bg-blue-100',
                      emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700 group-hover:bg-emerald-100',
                      amber:   'bg-amber-50 border-amber-100 text-amber-700 group-hover:bg-amber-100',
                      violet:  'bg-violet-50 border-violet-100 text-violet-700 group-hover:bg-violet-100',
                      rose:    'bg-rose-50 border-rose-100 text-rose-700 group-hover:bg-rose-100',
                    };
                    return (
                      <button key={a.label} onClick={a.action}
                        className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-150 group text-left">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${colors[a.color]}`}>
                            <a.icon className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-slate-700 text-sm">{a.label}</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-sm">{userTotal} total users</p>
                <div className="flex gap-2">
                  <button onClick={syncZoho} disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40">
                    <Activity className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Zoho'}
                  </button>
                  <button onClick={() => { setUserRole('engineer'); setShowAddUser(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Add User
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] border border-slate-50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Name', 'Status', 'Role', 'Contact', ''].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
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
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm border border-slate-200">
                                {u.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                                <p className="text-slate-400 text-[11px]">{u.designation || 'Staff'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {checkedIn ? (
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                <span className="text-xs font-medium text-slate-500">{isActive ? 'On duty' : 'Checked out'}</span>
                              </div>
                            ) : <span className="text-xs text-slate-300">—</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${roleBadge(u.role)}`}>{u.role}</span>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-slate-500 text-xs">{u.email}</p>
                            <p className="text-slate-400 text-[11px]">{u.phone}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setViewItem({ type: 'user', data: u })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditUser(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteUser(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center"><Users className="w-5 h-5 text-slate-400" /></div>
                      <p className="text-slate-400 text-sm font-medium">No users found</p>
                    </div>
                  </div>
                )}
              </div>
              {userTotal > userLimit && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Page {userPage} of {Math.ceil(userTotal / userLimit)}</span>
                  <div className="flex gap-2">
                    <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                    <button disabled={userPage * userLimit >= userTotal} onClick={() => setUserPage(p => p + 1)} className="p-2 rounded-xl border border-slate-200 text-slate-400 disabled:opacity-30 hover:bg-slate-50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CLIENTS ── */}
          {tab === 'clients' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-sm">{clients.length} clients registered</p>
                <button onClick={() => setShowAddClient(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"><Plus className="w-4 h-4" />Add Client</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {clients.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-amber-100 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-150 group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-bold text-base">{c.name?.charAt(0)}</div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                        <p className="text-slate-500 text-xs">{c.contactPerson}</p>
                        <p className="text-slate-400 text-[11px]">{c.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewItem({ type: 'client', data: c })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditClient(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteClient(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="col-span-2 py-16 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-slate-400" /></div>
                      <p className="text-slate-400 text-sm font-medium">No clients yet</p>
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
                <p className="text-slate-500 text-sm">{assignments.length} active assignments</p>
                <button onClick={() => setShowAssign(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"><Plus className="w-4 h-4" />New Assignment</button>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] border border-slate-50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Engineer','Client','Date','Status',''].map(h => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {assignments.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-4 font-semibold text-slate-800 text-sm">{a.engineerName || a.engineerId}</td>
                        <td className="px-5 py-4 text-slate-500 text-sm">{a.clientName || a.clientId}</td>
                        <td className="px-5 py-4 text-slate-400 text-xs">{a.assignedDate ? new Date(a.assignedDate).toLocaleDateString() : '—'}</td>
                        <td className="px-5 py-4"><span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold uppercase tracking-wide">Active</span></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewItem({ type: 'assignment', data: a })} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setEditAssignment(a)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteAssignment(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {assignments.length === 0 && (
                  <div className="py-16 text-center">
                    <p className="text-slate-400 text-sm font-medium">No active assignments</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MUSTER ── */}
          {tab === 'muster' && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] border border-slate-50 overflow-hidden">
              <MusterRoll />
            </div>
          )}

          {/* ── COMPANY PROFILE ── */}
          {tab === 'company-profile' && <CompanyProfile />}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-slate-50 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><Settings className="w-5 h-5 text-slate-400" /></div>
              <p className="text-slate-500 text-sm font-medium">Settings panel coming soon</p>
            </div>
          )}
        </div>
      </main>

      {/* ── ADD USER MODAL ── */}
      {showAddUser && (
        <Modal onClose={() => setShowAddUser(false)}>
          <MHead title={`Add ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`} sub="Create a new user account" icon={UserPlus} onClose={() => setShowAddUser(false)} />
          <div className="p-6 space-y-4">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              {(['engineer','hr','admin'] as const).map(r => (
                <button key={r} onClick={() => setUserRole(r)} className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${userRole === r ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{r}</button>
              ))}
            </div>
            {[{ key: 'name', label: 'Full Name', type: 'text' }, { key: 'email', label: 'Email Address', type: 'email' }, { key: 'phone', label: 'Phone Number', type: 'tel' }, { key: 'password', label: 'Password', type: 'password' }].map(f => (
              <div key={f.key}>
                <label className={FL}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} className={F} placeholder={f.label} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddUser(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={addUser} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">Add User</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── ADD CLIENT MODAL ── */}
      {showAddClient && (
        <Modal onClose={() => setShowAddClient(false)}>
          <MHead title="Add Client" sub="Register a new client account" icon={Building2} onClose={() => setShowAddClient(false)} />
          <div className="p-6 space-y-4">
            {[{ key: 'name', label: 'Company Name' }, { key: 'contactPerson', label: 'Contact Person' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }].map(f => (
              <div key={f.key}>
                <label className={FL}>{f.label}</label>
                <input value={(clientForm as any)[f.key]} onChange={e => setClientForm({ ...clientForm, [f.key]: e.target.value })} className={F} placeholder={f.label} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAddClient(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={addClient} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">Add Client</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── ASSIGN MODAL ── */}
      {showAssign && (
        <Modal onClose={() => setShowAssign(false)}>
          <MHead title="Assign Engineer" sub="Map an engineer to a client site" icon={UserCog} onClose={() => setShowAssign(false)} />
          <div className="p-6 space-y-4">
            <div>
              <label className={FL}>Engineer</label>
              <select value={assignForm.engineerId} onChange={e => setAssignForm({ ...assignForm, engineerId: e.target.value })} className={`${F} appearance-none`}>
                <option value="">Select engineer...</option>
                {engineers.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className={FL}>Client</label>
              <select value={assignForm.clientId} onChange={e => setAssignForm({ ...assignForm, clientId: e.target.value })} className={`${F} appearance-none`}>
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAssign(false)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={assignEngineer} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">Assign</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── EDIT USER MODAL ── */}
      {editUser && (
        <Modal onClose={() => setEditUser(null)}>
          <MHead title="Edit User" sub={editUser.name} icon={Pencil} onClose={() => setEditUser(null)} />
          <div className="p-6 space-y-4">
            {[{ key: 'name', label: 'Full Name' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'designation', label: 'Designation' }].map(f => (
              <div key={f.key}>
                <label className={FL}>{f.label}</label>
                <input value={(editUser as any)[f.key] || ''} onChange={e => setEditUser({ ...editUser, [f.key]: e.target.value })} className={F} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={updateUser} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── EDIT CLIENT MODAL ── */}
      {editClient && (
        <Modal onClose={() => setEditClient(null)}>
          <MHead title="Edit Client" sub={editClient.name} icon={Pencil} onClose={() => setEditClient(null)} />
          <div className="p-6 space-y-4">
            {[{ key: 'name', label: 'Company Name' }, { key: 'contactPerson', label: 'Contact Person' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }].map(f => (
              <div key={f.key}>
                <label className={FL}>{f.label}</label>
                <input value={(editClient as any)[f.key] || ''} onChange={e => setEditClient({ ...editClient, [f.key]: e.target.value })} className={F} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditClient(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={updateClient} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">Save Changes</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── VIEW MODAL ── */}
      {viewItem && (
        <Modal onClose={() => setViewItem(null)}>
          <MHead title={viewItem.type.charAt(0).toUpperCase() + viewItem.type.slice(1)} sub="Details" icon={Eye} onClose={() => setViewItem(null)} />
          <div className="p-6">
            <div className="space-y-3">
              {Object.entries(viewItem.data).filter(([k]) => !['id','passwordHash','password'].includes(k)).map(([k, v]) => (
                <div key={k} className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{k}</span>
                  <span className="text-slate-700 text-sm text-right font-medium">{String(v ?? '—')}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setViewItem(null)} className="w-full mt-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
