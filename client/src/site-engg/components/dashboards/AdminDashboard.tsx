import { useState, useEffect } from 'react';
import {
  Users, Building2, UserCog, Activity, Plus, UserPlus, X, Shield, Settings,
  TrendingUp, ChevronDown, ChevronLeft, ChevronRight, Clock, LayoutDashboard,
  Calendar, Pencil, Trash2, Eye,
} from 'lucide-react';
import { User, Client, Assignment } from '../../types';
import { StorageService } from '../../lib/storage';
import CompanyProfile from '../CompanyProfile';
import MusterRoll from '../MusterRoll';

type Tab = 'overview' | 'users' | 'clients' | 'assignments' | 'muster' | 'company-profile' | 'settings';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',         label: 'Overview',    icon: LayoutDashboard },
  { id: 'users',            label: 'Users',       icon: Users },
  { id: 'clients',          label: 'Clients',     icon: Building2 },
  { id: 'assignments',      label: 'Assignments', icon: UserCog },
  { id: 'muster',           label: 'Muster Roll', icon: TrendingUp },
  { id: 'company-profile',  label: 'Company',     icon: Shield },
  { id: 'settings',         label: 'Settings',    icon: Settings },
];

const FIELD_CLS = 'w-full bg-white border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all';
const LABEL_CLS = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

function ModalWrap({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 overflow-y-auto max-h-[90vh]">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, icon: Icon, iconColor, onClose }: { title: string; subtitle: string; icon: React.ElementType; iconColor: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingItem, setViewingItem] = useState<{ type: 'user' | 'client' | 'assignment', data: any } | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const userLimit = 20;

  const handleSyncZoho = async () => {
    try {
      setIsSyncing(true);
      setMessage(null);
      const res = await fetch('/php/api/sync-zoho.php');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync with Zoho');
      setMessage({ type: 'success', text: data.message || 'Successfully synced with Zoho' });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  useEffect(() => { loadData(); }, [activeTab, userPage]);

  async function loadData() {
    try {
      const [usersResponse, allClients, allAssignments, allCheckIns] = await Promise.all([
        StorageService.getUsers(activeTab === 'users' ? userPage : 0, activeTab === 'users' ? userLimit : 0),
        StorageService.getClients(),
        StorageService.getAssignments(),
        StorageService.getCheckIns()
      ]);
      const fetchedUsers = Array.isArray(usersResponse) ? usersResponse : usersResponse.data;
      const totalUsersCount = Array.isArray(usersResponse) ? usersResponse.length : usersResponse.total;
      const activeAssignments = allAssignments.filter((a: any) => a.status === 'active' || a.isActive === 1 || a.is_active === 1);
      const allEngineers = fetchedUsers.filter((u: User) => u.role === 'engineer');
      const today = new Date().toISOString().split('T')[0];
      const todayCheckInsCount = allCheckIns.filter((c: any) => c.date === today).length;
      setUsers(fetchedUsers);
      setUserTotal(totalUsersCount);
      setClients(allClients);
      setAssignments(activeAssignments);
      setEngineers(allEngineers);
      setStats({ totalEngineers: totalUsersCount, totalClients: allClients.length, activeAssignments: activeAssignments.length, todayCheckIns: todayCheckInsCount });
    } catch (error) { console.error('Error loading data:', error); }
  }

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleAddUser() {
    try {
      await StorageService.addUser({ id: Math.random().toString(36).substr(2, 9), email: formData.email, name: formData.name, role: userRole, phone: formData.phone, createdAt: new Date().toISOString() });
      showMsg('success', `${userRole.toUpperCase()} added successfully!`);
      setShowAddUserModal(false);
      setFormData({ name: '', email: '', phone: '', password: '' });
      await loadData();
    } catch (error: any) { showMsg('error', error.message || 'Failed to add user'); }
  }

  async function handleAddClient() {
    try {
      await StorageService.createClient({ name: clientFormData.name, contactPerson: clientFormData.contactPerson, email: clientFormData.email, phone: clientFormData.phone, userId: '' });
      showMsg('success', 'Client added successfully!');
      setShowAddClientModal(false);
      setClientFormData({ name: '', contactPerson: '', email: '', phone: '' });
      await loadData();
    } catch (error: any) { showMsg('error', error.message || 'Failed to add client'); }
  }

  async function handleAssignEngineer() {
    try {
      await StorageService.createAssignment({ engineerId: assignFormData.engineerId, clientId: assignFormData.clientId, assignedDate: new Date().toISOString().split('T')[0], status: 'active', siteId: '' });
      showMsg('success', 'Engineer assigned successfully!');
      setShowAssignModal(false);
      setAssignFormData({ engineerId: '', clientId: '' });
      await loadData();
    } catch (error: any) { showMsg('error', error.message || 'Failed to assign engineer'); }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Delete this user?')) return;
    try { await StorageService.deleteUser(id); showMsg('success', 'User deleted'); await loadData(); }
    catch (error: any) { showMsg('error', error.message || 'Failed to delete user'); }
  }

  async function handleDeleteClient(id: string) {
    if (!confirm('Delete this client?')) return;
    try { await StorageService.deleteClient(id); showMsg('success', 'Client deleted'); await loadData(); }
    catch (error: any) { showMsg('error', error.message || 'Failed to delete client'); }
  }

  async function handleDeleteAssignment(id: number) {
    if (!confirm('Remove this assignment?')) return;
    try { await StorageService.deleteAssignment(id); showMsg('success', 'Assignment removed'); await loadData(); }
    catch (error: any) { showMsg('error', error.message || 'Failed to remove assignment'); }
  }

  async function handleUpdateAssignment() {
    if (!editingAssignment) return;
    try {
      await StorageService.updateAssignment(editingAssignment.id, { engineerId: editingAssignment.engineerId, clientId: editingAssignment.clientId });
      showMsg('success', 'Assignment updated'); setEditingAssignment(null); await loadData();
    } catch (error: any) { showMsg('error', error.message || 'Failed to update assignment'); }
  }

  async function handleUpdateUser() {
    if (!editingUser) return;
    try {
      await StorageService.updateUser(editingUser.id, { name: editingUser.name, email: editingUser.email, phone: editingUser.phone, role: editingUser.role, designation: editingUser.designation });
      showMsg('success', 'User updated'); setEditingUser(null); await loadData();
    } catch (error: any) { showMsg('error', error.message || 'Failed to update user'); }
  }

  async function handleUpdateClient() {
    if (!editingClient) return;
    try {
      await StorageService.updateClient(editingClient.id, { name: editingClient.name, contactPerson: editingClient.contactPerson, email: editingClient.email, phone: editingClient.phone });
      showMsg('success', 'Client updated'); setEditingClient(null); await loadData();
    } catch (error: any) { showMsg('error', error.message || 'Failed to update client'); }
  }

  const statCards = [
    { label: 'Total Staff',          value: stats.totalEngineers,      icon: Users,    accent: 'blue' },
    { label: 'Total Clients',         value: stats.totalClients,         icon: Building2, accent: 'emerald' },
    { label: 'Active Assignments',    value: stats.activeAssignments,    icon: UserCog,  accent: 'violet' },
    { label: "Today's Check-ins",     value: stats.todayCheckIns,        icon: Activity, accent: 'amber' },
  ];
  const accentMap: Record<string, string> = {
    blue:    'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    violet:  'bg-violet-50 text-violet-600 border-violet-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* PAGE HEADER */}
      <div className="bg-white border-b border-gray-100 sticky top-14 z-20">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-gray-900 flex items-center justify-center shadow-lg shadow-gray-200">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Admin Control Center</h1>
                <p className="text-gray-400 text-sm mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  System Operations Active
                </p>
              </div>
            </div>
            <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-6 space-y-6">

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 ${accentMap[s.accent]}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900 tracking-tight">{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* FLASH MESSAGE */}
        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-2.5 text-sm font-semibold border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* TABS PANEL */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-2 pt-2 flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">

            {/* OVERVIEW */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="font-bold text-gray-900 mb-5">Quick Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Add Engineer', sub: 'Create engineer account', icon: UserPlus, color: 'blue',   action: () => { setUserRole('engineer'); setShowAddUserModal(true); } },
                    { label: 'Add HR',       sub: 'Create HR account',       icon: UserPlus, color: 'emerald',action: () => { setUserRole('hr');       setShowAddUserModal(true); } },
                    { label: 'Add Client',   sub: 'Register new client',     icon: Building2,color: 'amber',  action: () => setShowAddClientModal(true) },
                    { label: 'Assign Engineer', sub: 'Deploy to client site', icon: UserCog, color: 'violet', action: () => setShowAssignModal(true) },
                    { label: 'Add Admin',    sub: 'Create admin account',    icon: UserPlus, color: 'red',    action: () => { setUserRole('admin');    setShowAddUserModal(true); } },
                  ].map(a => (
                    <button key={a.label} onClick={a.action}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                        a.color === 'blue'   ? 'border-blue-200 hover:bg-blue-50 hover:border-blue-300' :
                        a.color === 'emerald'? 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300' :
                        a.color === 'amber'  ? 'border-amber-200 hover:bg-amber-50 hover:border-amber-300' :
                        a.color === 'violet' ? 'border-violet-200 hover:bg-violet-50 hover:border-violet-300' :
                        'border-red-200 hover:bg-red-50 hover:border-red-300'
                      }`}>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                        a.color === 'blue'   ? 'bg-blue-100 text-blue-600' :
                        a.color === 'emerald'? 'bg-emerald-100 text-emerald-600' :
                        a.color === 'amber'  ? 'bg-amber-100 text-amber-600' :
                        a.color === 'violet' ? 'bg-violet-100 text-violet-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        <a.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{a.label}</p>
                        <p className="text-xs text-gray-500">{a.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* USERS */}
            {activeTab === 'users' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900">User Management</h3>
                  <div className="flex gap-2">
                    <button onClick={handleSyncZoho} disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                      <Activity className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Zoho'}
                    </button>
                    <button onClick={() => { setUserRole('engineer'); setShowAddUserModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                      <Plus className="w-4 h-4" />
                      Add User
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Name', "Today's Status", 'Role', 'Contact', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.map(user => {
                        const sessionsCount = user.todaySessions?.length || 0;
                        const latestSession = sessionsCount > 0 ? user.todaySessions[sessionsCount - 1] : null;
                        const isActive = latestSession ? !latestSession.todayCheckOut : (!user.todayCheckOut && user.todayCheckIn);
                        const isCheckedIn = latestSession || user.todayCheckIn || user.todayCheckOut;
                        return (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-sm shrink-0">
                                  {user.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                                  <p className="text-[11px] text-gray-400">{user.designation || 'Staff'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {isCheckedIn ? (
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                                  <div>
                                    <span className="text-xs font-semibold text-gray-700">{isActive ? 'Active' : 'Done'}</span>
                                    {user.todayCheckIn && <p className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />In: {new Date(user.todayCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Not checked in</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin'    ? 'bg-violet-100 text-violet-700 border border-violet-200' :
                                user.role === 'hr'       ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                user.role === 'engineer' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}>{user.role}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs text-gray-600">{user.email}</p>
                              <p className="text-[11px] text-gray-400">{user.phone}</p>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button onClick={() => setViewingItem({ type: 'user', data: user })} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingUser(user)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {userTotal > userLimit && (
                  <div className="flex items-center justify-between mt-4 px-2">
                    <span className="text-xs text-gray-400">Page {userPage} of {Math.ceil(userTotal / userLimit)}</span>
                    <div className="flex gap-2">
                      <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="p-2 border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                      <button disabled={userPage * userLimit >= userTotal} onClick={() => setUserPage(p => p + 1)} className="p-2 border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-gray-50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CLIENTS */}
            {activeTab === 'clients' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900">Clients</h3>
                  <button onClick={() => setShowAddClientModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Client
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {clients.map(client => (
                    <div key={client.id} className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-base shrink-0">
                          {client.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.contactPerson}</p>
                          <p className="text-[11px] text-gray-400">{client.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setViewingItem({ type: 'client', data: client })} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingClient(client)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDeleteClient(client.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  {clients.length === 0 && (
                    <div className="col-span-2 text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm font-medium">No clients yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ASSIGNMENTS */}
            {activeTab === 'assignments' && (
              <div>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-gray-900">Assignments</h3>
                  <button onClick={() => setShowAssignModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                    <Plus className="w-4 h-4" />
                    New Assignment
                  </button>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Engineer', 'Client', 'Date', 'Status', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {assignments.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-sm text-gray-900">{a.engineerName || a.engineerId}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{a.clientName || a.clientId}</td>
                          <td className="px-4 py-3 text-xs text-gray-400">{a.assignedDate ? new Date(a.assignedDate).toLocaleDateString() : 'N/A'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-emerald-200">Active</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setViewingItem({ type: 'assignment', data: a })} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingAssignment(a)} className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteAssignment(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {assignments.length === 0 && (
                    <div className="py-12 text-center text-gray-400 text-sm">No active assignments</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'muster'          && <MusterRoll />}
            {activeTab === 'company-profile' && <CompanyProfile />}
            {activeTab === 'settings' && (
              <div className="text-center py-12">
                <Settings className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-500 font-semibold">Settings panel coming soon</h3>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── MODALS ── */}

      {showAddUserModal && (
        <ModalWrap onClose={() => setShowAddUserModal(false)}>
          <ModalHeader title={`Add ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}`} subtitle="Create a new system account" icon={UserPlus} iconColor="bg-blue-100 text-blue-600" onClose={() => setShowAddUserModal(false)} />
          <div className="p-6 space-y-4">
            <div>
              <label className={LABEL_CLS}>Role</label>
              <div className="relative">
                <select value={userRole} onChange={e => setUserRole(e.target.value as any)} className={`${FIELD_CLS} appearance-none pr-10`}>
                  <option value="engineer">Engineer</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Full Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={FIELD_CLS} placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className={LABEL_CLS}>Email Address</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={FIELD_CLS} placeholder="name@company.com" />
            </div>
            <div>
              <label className={LABEL_CLS}>Password</label>
              <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className={FIELD_CLS} placeholder="••••••••" />
            </div>
            <div>
              <label className={LABEL_CLS}>Phone</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={FIELD_CLS} placeholder="+1 555 000-0000" />
            </div>
            <button onClick={handleAddUser} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm mt-2">
              Create Account
            </button>
          </div>
        </ModalWrap>
      )}

      {showAddClientModal && (
        <ModalWrap onClose={() => setShowAddClientModal(false)}>
          <ModalHeader title="Add Client" subtitle="Register a new partner client" icon={Building2} iconColor="bg-amber-100 text-amber-600" onClose={() => setShowAddClientModal(false)} />
          <div className="p-6 space-y-4">
            <div><label className={LABEL_CLS}>Organization Name</label><input type="text" value={clientFormData.name} onChange={e => setClientFormData({ ...clientFormData, name: e.target.value })} className={FIELD_CLS} placeholder="e.g. Acme Corp" /></div>
            <div><label className={LABEL_CLS}>Contact Person</label><input type="text" value={clientFormData.contactPerson} onChange={e => setClientFormData({ ...clientFormData, contactPerson: e.target.value })} className={FIELD_CLS} placeholder="Contact Name" /></div>
            <div><label className={LABEL_CLS}>Business Email</label><input type="email" value={clientFormData.email} onChange={e => setClientFormData({ ...clientFormData, email: e.target.value })} className={FIELD_CLS} placeholder="contact@company.com" /></div>
            <div><label className={LABEL_CLS}>Phone</label><input type="tel" value={clientFormData.phone} onChange={e => setClientFormData({ ...clientFormData, phone: e.target.value })} className={FIELD_CLS} placeholder="+1 555 000-0000" /></div>
            <button onClick={handleAddClient} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm mt-2">Register Client</button>
          </div>
        </ModalWrap>
      )}

      {showAssignModal && (
        <ModalWrap onClose={() => setShowAssignModal(false)}>
          <ModalHeader title="Assign Engineer" subtitle="Deploy resource to client site" icon={UserCog} iconColor="bg-violet-100 text-violet-600" onClose={() => setShowAssignModal(false)} />
          <div className="p-6 space-y-4">
            <div>
              <label className={LABEL_CLS}>Select Engineer</label>
              <div className="relative">
                <select value={assignFormData.engineerId} onChange={e => setAssignFormData({ ...assignFormData, engineerId: e.target.value })} className={`${FIELD_CLS} appearance-none pr-10`}>
                  <option value="">Choose an engineer...</option>
                  {engineers.map(eng => <option key={eng.id} value={eng.id}>{eng.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Target Client</label>
              <div className="relative">
                <select value={assignFormData.clientId} onChange={e => setAssignFormData({ ...assignFormData, clientId: e.target.value })} className={`${FIELD_CLS} appearance-none pr-10`}>
                  <option value="">Choose a client...</option>
                  {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <button onClick={handleAssignEngineer} disabled={!assignFormData.engineerId || !assignFormData.clientId}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              Confirm Assignment
            </button>
          </div>
        </ModalWrap>
      )}

      {editingUser && (
        <ModalWrap onClose={() => setEditingUser(null)}>
          <ModalHeader title="Edit User" subtitle="Update account information" icon={UserPlus} iconColor="bg-blue-100 text-blue-600" onClose={() => setEditingUser(null)} />
          <div className="p-6 space-y-4">
            <div><label className={LABEL_CLS}>Full Name</label><input type="text" value={editingUser.name} onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} className={FIELD_CLS} /></div>
            <div><label className={LABEL_CLS}>Email</label><input type="email" value={editingUser.email} onChange={e => setEditingUser({ ...editingUser, email: e.target.value })} className={FIELD_CLS} /></div>
            <div><label className={LABEL_CLS}>Phone</label><input type="tel" value={editingUser.phone || ''} onChange={e => setEditingUser({ ...editingUser, phone: e.target.value })} className={FIELD_CLS} /></div>
            <div>
              <label className={LABEL_CLS}>Role</label>
              <div className="relative">
                <select value={editingUser.role} onChange={(e: any) => setEditingUser({ ...editingUser, role: e.target.value })} className={`${FIELD_CLS} appearance-none pr-10`}>
                  <option value="engineer">Engineer</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <button onClick={handleUpdateUser} className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm mt-2">Save Changes</button>
          </div>
        </ModalWrap>
      )}

      {editingClient && (
        <ModalWrap onClose={() => setEditingClient(null)}>
          <ModalHeader title="Edit Client" subtitle="Update client information" icon={Building2} iconColor="bg-amber-100 text-amber-600" onClose={() => setEditingClient(null)} />
          <div className="p-6 space-y-4">
            <div><label className={LABEL_CLS}>Client Name</label><input type="text" value={editingClient.name} onChange={e => setEditingClient({ ...editingClient, name: e.target.value })} className={FIELD_CLS} /></div>
            <div><label className={LABEL_CLS}>Contact Person</label><input type="text" value={editingClient.contactPerson} onChange={e => setEditingClient({ ...editingClient, contactPerson: e.target.value })} className={FIELD_CLS} /></div>
            <div><label className={LABEL_CLS}>Email</label><input type="email" value={editingClient.email} onChange={e => setEditingClient({ ...editingClient, email: e.target.value })} className={FIELD_CLS} /></div>
            <button onClick={handleUpdateClient} className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm mt-2">Save Changes</button>
          </div>
        </ModalWrap>
      )}

      {editingAssignment && (
        <ModalWrap onClose={() => setEditingAssignment(null)}>
          <ModalHeader title="Edit Assignment" subtitle="Reassign engineer or client" icon={UserCog} iconColor="bg-violet-100 text-violet-600" onClose={() => setEditingAssignment(null)} />
          <div className="p-6 space-y-4">
            <div>
              <label className={LABEL_CLS}>Engineer</label>
              <div className="relative">
                <select value={editingAssignment.engineerId} onChange={e => setEditingAssignment({ ...editingAssignment, engineerId: e.target.value })} className={`${FIELD_CLS} appearance-none pr-10`}>
                  <option value="">Select Engineer</option>
                  {engineers.map(eng => <option key={eng.id} value={eng.id}>{eng.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Client</label>
              <div className="relative">
                <select value={editingAssignment.clientId} onChange={e => setEditingAssignment({ ...editingAssignment, clientId: e.target.value })} className={`${FIELD_CLS} appearance-none pr-10`}>
                  <option value="">Select Client</option>
                  {clients.map(cl => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <button onClick={handleUpdateAssignment} className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-semibold text-sm transition-colors shadow-sm mt-2">Save Changes</button>
          </div>
        </ModalWrap>
      )}

      {viewingItem && (
        <ModalWrap onClose={() => setViewingItem(null)}>
          <ModalHeader
            title={`${viewingItem.type.charAt(0).toUpperCase() + viewingItem.type.slice(1)} Details`}
            subtitle="View record information"
            icon={Eye}
            iconColor="bg-gray-100 text-gray-600"
            onClose={() => setViewingItem(null)}
          />
          <div className="p-6 space-y-4">
            {viewingItem.type === 'user' && <>
              <DetailRow label="Full Name" value={viewingItem.data.name} />
              <DetailRow label="Email" value={viewingItem.data.email} />
              <DetailRow label="Phone" value={viewingItem.data.phone || 'N/A'} />
              <DetailRow label="Role" value={viewingItem.data.role} />
              <DetailRow label="Designation" value={viewingItem.data.designation || 'N/A'} />
              <DetailRow label="Joined" value={viewingItem.data.createdAt ? new Date(viewingItem.data.createdAt).toLocaleDateString() : 'N/A'} />
              {viewingItem.data.todaySessions?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Today's Timeline</p>
                  <div className="space-y-2">
                    {viewingItem.data.todaySessions.map((s: any, i: number) => (
                      <div key={i} className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.todayCheckOut ? 'bg-gray-400' : 'bg-emerald-500 animate-pulse'}`} />
                          <span className="font-semibold text-gray-700">{s.todayCheckOut ? 'Checked Out' : 'Checked In'}</span>
                        </div>
                        {s.todayCheckIn && <p className="text-gray-500">In: {new Date(s.todayCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                        {s.todayCheckOut && <p className="text-gray-500">Out: {new Date(s.todayCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>}
            {viewingItem.type === 'client' && <>
              <DetailRow label="Client Name" value={viewingItem.data.name} />
              <DetailRow label="Contact Person" value={viewingItem.data.contactPerson} />
              <DetailRow label="Email" value={viewingItem.data.email} />
              <DetailRow label="Phone" value={viewingItem.data.phone || 'N/A'} />
            </>}
            {viewingItem.type === 'assignment' && <>
              <DetailRow label="Engineer" value={viewingItem.data.engineerName} />
              <DetailRow label="Client" value={viewingItem.data.clientName} />
              <DetailRow label="Assigned Date" value={viewingItem.data.assignedAt ? new Date(viewingItem.data.assignedAt).toLocaleDateString() : 'N/A'} />
              <DetailRow label="Status" value="Active" />
            </>}
            <button onClick={() => setViewingItem(null)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold text-sm transition-colors mt-2">
              Close
            </button>
          </div>
        </ModalWrap>
      )}

    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 last:border-0">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0">{label}</p>
      <p className="text-sm font-semibold text-gray-900 text-right">{value}</p>
    </div>
  );
}
