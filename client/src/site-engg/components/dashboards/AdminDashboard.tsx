import { useState, useEffect } from 'react';
import { Users, Building2, UserCog, Activity, Plus, UserPlus, X, Shield, Settings, TrendingUp, ChevronDown, ChevronLeft, ChevronRight, Eye, Clock } from 'lucide-react';
import { User, Client, Assignment } from '../../types';
import { StorageService } from '../../lib/storage';
import CompanyProfile from '../CompanyProfile';
import MusterRoll from '../MusterRoll';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'clients' | 'assignments' | 'muster' | 'reports' | 'company-profile' | 'settings'>('overview');
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

  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const userLimit = 20;

  useEffect(() => {
    loadData();
  }, [activeTab, userPage]);

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

      const activeAssignments = allAssignments.filter(a => a.status === 'active' || (a as any).isActive === 1 || (a as any).is_active === 1);
      const allEngineers = fetchedUsers.filter(u => u.role === 'engineer');

      const today = new Date().toISOString().split('T')[0];
      const todayCheckInsCount = allCheckIns.filter(c => c.date === today).length;

      setUsers(fetchedUsers);
      setUserTotal(totalUsersCount);
      setClients(allClients);
      setAssignments(activeAssignments);
      setEngineers(allEngineers);
      setStats({
        totalEngineers: totalUsersCount, // Using total count from API
        totalClients: allClients.length,
        activeAssignments: activeAssignments.length,
        todayCheckIns: todayCheckInsCount
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleAddUser() {
    try {
      await StorageService.addUser({
        id: Math.random().toString(36).substr(2, 9),
        email: formData.email,
        name: formData.name,
        role: userRole,
        phone: formData.phone,
        createdAt: new Date().toISOString()
      });

      setMessage({ type: 'success', text: `${userRole.toUpperCase()} added successfully!` });
      setShowAddUserModal(false);
      setFormData({ name: '', email: '', phone: '', password: '' });
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add user' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleAddClient() {
    try {
      await StorageService.createClient({
        name: clientFormData.name,
        contactPerson: clientFormData.contactPerson,
        email: clientFormData.email,
        phone: clientFormData.phone,
        userId: ''
      });

      setMessage({ type: 'success', text: 'Client added successfully!' });
      setShowAddClientModal(false);
      setClientFormData({ name: '', contactPerson: '', email: '', phone: '' });
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to add client' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleAssignEngineer() {
    try {
      await StorageService.createAssignment({
        engineerId: assignFormData.engineerId,
        clientId: assignFormData.clientId,
        assignedDate: new Date().toISOString().split('T')[0],
        status: 'active',
        siteId: ''
      });

      setMessage({ type: 'success', text: 'Engineer assigned successfully!' });
      setShowAssignModal(false);
      setAssignFormData({ engineerId: '', clientId: '' });
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to assign engineer' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await StorageService.deleteUser(id);
      setMessage({ type: 'success', text: 'User deleted successfully!' });
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete user' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleDeleteClient(id: string) {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await StorageService.deleteClient(id);
      setMessage({ type: 'success', text: 'Client deleted successfully!' });
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete client' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleDeleteAssignment(id: number) {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await StorageService.deleteAssignment(id);
      setMessage({ type: 'success', text: 'Assignment removed successfully!' });
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove assignment' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleUpdateAssignment() {
    if (!editingAssignment) return;
    try {
      await StorageService.updateAssignment(editingAssignment.id, {
        engineerId: editingAssignment.engineerId,
        clientId: editingAssignment.clientId,
      });
      setMessage({ type: 'success', text: 'Assignment updated successfully!' });
      setEditingAssignment(null);
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update assignment' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleUpdateUser() {
    if (!editingUser) return;
    try {
      await StorageService.updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone,
        role: editingUser.role,
        designation: editingUser.designation
      });
      setMessage({ type: 'success', text: 'User updated successfully!' });
      setEditingUser(null);
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update user' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleUpdateClient() {
    if (!editingClient) return;
    try {
      await StorageService.updateClient(editingClient.id, {
        name: editingClient.name,
        contactPerson: editingClient.contactPerson,
        email: editingClient.email,
        phone: editingClient.phone
      });
      setMessage({ type: 'success', text: 'Client updated successfully!' });
      setEditingClient(null);
      await loadData();
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update client' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'clients', label: 'Clients', icon: Building2 },
    { id: 'assignments', label: 'Assignments', icon: UserCog },
    { id: 'muster', label: 'Muster Roll', icon: TrendingUp },
    { id: 'company-profile', label: 'Company', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans selection:bg-blue-100 selection:text-blue-900 font-feature-default">
      {/* ─── 2026 Neo-Minimalist Header ─── */}
      <div className="bg-white border-b border-slate-200/60 sticky top-0 z-30 shadow-sm/30 backdrop-blur-xl">
        <div className="max-w-[85rem] mx-auto px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 flex items-center justify-center rounded-[1rem] shadow-sm">
                <Shield className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <h1 className="text-[1.35rem] leading-tight font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
                  Admin Control Center
                  <span className="px-2 py-0.5 bg-blue-50/80 text-blue-600 rounded-lg text-[10px] font-semibold tracking-wide border border-blue-100/50">v3.0</span>
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  System Operations Active
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[85rem] mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <StatCard icon={Users} label="Total Staff" value={stats.totalEngineers} color="blue" />
          <StatCard icon={Building2} label="Total Clients" value={stats.totalClients} color="green" />
          <StatCard icon={UserCog} label="Active Assignments" value={stats.activeAssignments} color="orange" />
          <StatCard icon={TrendingUp} label="Today's Check-ins" value={stats.todayCheckIns} color="purple" />
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-2 shadow-sm ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-100/50 text-emerald-800' : 'bg-red-50 border border-red-100/50 text-red-800'}`}>
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <div className="border border-slate-200/70 bg-white/60 backdrop-blur-md rounded-[1.25rem] shadow-sm overflow-hidden mt-2">
          <div className="border-b border-slate-200/60 bg-white/80">
            <nav className="flex px-3 overflow-x-auto scrollbar-hide pt-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 px-5 flex items-center gap-2.5 border-b-[2px] font-medium text-[13px] transition-all whitespace-nowrap relative rounded-t-xl mb-[-1px] ${
                    activeTab === tab.id
                      ? 'border-slate-900 text-slate-900 bg-slate-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-slate-900 rounded-t-full"></div>}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <button
                    onClick={() => { setUserRole('engineer'); setShowAddUserModal(true); }}
                    className="flex items-center gap-3 p-4 border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all text-left group"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <UserPlus className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Add Engineer</p>
                      <p className="text-xs text-slate-600">Create new engineer account</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setUserRole('hr'); setShowAddUserModal(true); }}
                    className="flex items-center gap-3 p-4 border-2 border-green-200 rounded-xl hover:bg-green-50 hover:border-green-300 transition-all text-left group"
                  >
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <UserPlus className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Add HR</p>
                      <p className="text-xs text-slate-600">Create new HR account</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowAddClientModal(true)}
                    className="flex items-center gap-3 p-4 border-2 border-orange-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 transition-all text-left group"
                  >
                    <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <Building2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Add Client</p>
                      <p className="text-xs text-slate-600">Create new client</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex items-center gap-3 p-4 border-2 border-purple-200 rounded-xl hover:bg-purple-50 hover:border-purple-300 transition-all text-left group"
                  >
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <UserCog className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Assign Engineer</p>
                      <p className="text-xs text-slate-600">Assign engineer to client</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setUserRole('admin'); setShowAddUserModal(true); }}
                    className="flex items-center gap-3 p-4 border-2 border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-all text-left group"
                  >
                    <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                      <UserPlus className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Add Admin</p>
                      <p className="text-xs text-slate-600">Create new admin account</p>
                    </div>
                  </button>
                </div>
                <div className="text-center py-8 border-t border-slate-200">
                  <Activity className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="text-base font-medium text-slate-900 mb-1">System Overview</h3>
                  <p className="text-sm text-slate-600">Use quick actions above or navigate through tabs to manage system</p>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-800">User Management (v2.1)</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSyncZoho}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-100 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors text-[13px] font-medium shadow-sm disabled:opacity-50"
                    >
                      <Activity className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'Syncing...' : 'Sync Zoho'}
                    </button>
                    <button
                      onClick={() => { setUserRole('engineer'); setShowAddUserModal(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] text-slate-800 rounded-lg hover:bg-[#1E293B] transition-colors text-[13px] font-medium shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add User
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                    <table className="w-full">
                    <thead className="border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Today's Status</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Email/Phone</th>
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {users.map(user => {
                        const sessionsCount = user.todaySessions?.length || 0;
                        const latestSession = sessionsCount > 0 ? user.todaySessions[sessionsCount - 1] : null;
                        const isActive = latestSession ? !latestSession.todayCheckOut : (!user.todayCheckOut && user.todayCheckIn);
                        const isCheckedIn = latestSession || user.todayCheckIn || user.todayCheckOut;

                        return (
                        <tr key={user.id} onClick={() => setViewingItem({ type: 'user', data: user })} className="hover:bg-blue-50/50 transition-colors cursor-pointer group">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {user.name}
                            <div className="text-[10px] text-slate-500 font-normal">{user.designation || 'Staff'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {isCheckedIn ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full ${!isActive ? 'bg-orange-400' : 'bg-green-500 animate-pulse'}`}></span>
                                  <span className="font-bold text-slate-700">{!isActive ? 'Checked Out' : 'Active Now'}</span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  {user.todayCheckIn && (
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      In: {new Date(user.todayCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}
                                  {user.todayCheckOut && (
                                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      Out: {new Date(user.todayCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}
                                </div>
                                <div className="text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                  Click for details
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Not Checked In</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-red-100 text-red-700' :
                              user.role === 'engineer' ? 'bg-blue-100 text-blue-700' :
                                user.role === 'hr' ? 'bg-green-100 text-green-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <div className="font-medium text-slate-700">{user.email}</div>
                            <div className="text-[10px]">{user.phone || '-'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex justify-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); setViewingItem({ type: 'user', data: user }); }} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all z-10" title="View">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingUser(user); }} className="p-1.5 hover:bg-white border border-transparent hover:border-blue-200 rounded-lg text-slate-400 hover:text-blue-600 transition-all z-10" title="Edit">
                                <Settings className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }} className="p-1.5 hover:bg-white border border-transparent hover:border-red-200 rounded-lg text-slate-400 hover:text-red-600 transition-all z-10" title="Delete">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>

                {userTotal > userLimit && (
                  <div className="mt-6 flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Showing {((userPage - 1) * userLimit) + 1} - {Math.min(userPage * userLimit, userTotal)} of {userTotal} Users
                    </span>
                    <div className="flex gap-2">
                       <button 
                        disabled={userPage === 1}
                        onClick={() => setUserPage(p => p - 1)}
                        className="p-2 border rounded-xl disabled:opacity-30 bg-white hover:bg-slate-100 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                      </button>
                      <button 
                        disabled={userPage * userLimit >= userTotal}
                        onClick={() => setUserPage(p => p + 1)}
                        className="p-2 border rounded-xl disabled:opacity-30 bg-white hover:bg-slate-100 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'clients' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-800">Client Management</h2>
                  <button
                    onClick={() => setShowAddClientModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] text-slate-800 rounded-lg hover:bg-[#1E293B] transition-colors text-[13px] font-medium shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Client
                  </button>
                </div>
                <div className="grid gap-4">
                  {clients.map(client => (
                    <div key={client.id} className="border border-slate-100 rounded-xl p-5 hover:border-slate-200 transition-all bg-white group shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-orange-600" />
                          {client.name}
                        </h3>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setViewingItem({ type: 'client', data: client })} className="p-1.5 bg-white border rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingClient(client)} className="p-1.5 bg-white border rounded-lg text-blue-600 hover:bg-blue-50 transition-colors shadow-sm">
                            <Settings className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteClient(client.id)} className="p-1.5 bg-white border rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500">Email:</span>
                          <span className="ml-2 text-slate-900">{client.email}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Phone:</span>
                          <span className="ml-2 text-slate-900">{client.phone || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Contact:</span>
                          <span className="ml-2 text-slate-900">{client.contactPerson || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'muster' && (
              <MusterRoll />
            )}

            {activeTab === 'assignments' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold text-slate-800">Engineer Assignments</h2>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#F8FAFC] text-slate-800 rounded-lg hover:bg-[#1E293B] transition-colors text-[13px] font-medium shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Assign Engineer
                  </button>
                </div>
                <div className="space-y-4">
                  {assignments.map(assignment => {
                    const engineer = engineers.find(e => e.id === assignment.engineerId);
                    const client = clients.find(c => c.id === assignment.clientId);
                    return (
                      <div key={assignment.id} className="border border-slate-100 rounded-xl p-5 flex justify-between items-center hover:border-slate-200 transition-all bg-white shadow-sm">
                        <div>
                          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            {engineer?.name || 'Unknown Engineer'}
                          </h3>
                          <p className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                            <Building2 className="w-3 h-3" />
                            Assigned to: {client?.name || 'Unknown Client'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewingItem({ 
                            type: 'assignment', 
                            data: { ...assignment, engineerName: engineer?.name, clientName: client?.name } 
                          })} className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingAssignment(assignment)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors shadow-sm" title="Edit">
                            <Settings className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteAssignment(assignment.id)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors shadow-sm" title="Remove">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {assignments.length === 0 && (
                    <p className="text-center py-8 text-slate-500">No active assignments</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'company-profile' && (
              <CompanyProfile />
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-6">System Settings</h2>
                <div className="space-y-4">
                  <div className="p-5 border border-slate-100 rounded-xl bg-white shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2 text-[13px]">
                      <Settings className="w-4 h-4 text-slate-500" />
                      System Information
                    </h3>
                    <div className="space-y-2 text-[13px] text-slate-600 font-medium">
                      <p>Version: 1.0.0</p>
                      <p>Environment: Production</p>
                      <p>Database: Managed Service</p>
                    </div>
                  </div>
                  <div className="p-5 border border-slate-100 rounded-xl bg-white shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-2 text-[13px]">Admin Actions</h3>
                    <p className="text-[12px] text-slate-500 mb-5">Manage system-wide configurations and settings</p>
                    <div className="flex gap-3">
                      <button className="px-4 py-2 border border-slate-100 text-slate-600 rounded-lg hover:bg-white/[0.015] transition-colors duration-200 text-[13px] font-medium">
                        View Logs
                      </button>
                      <button className="px-4 py-2 border border-slate-100 text-slate-600 rounded-lg hover:bg-white/[0.015] transition-colors duration-200 text-[13px] font-medium">
                        System Reports
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md border border-white/20 transform animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">Add {userRole.toUpperCase()}</h2>
                  <p className="text-sm font-medium text-slate-500">Create a new system account</p>
                </div>
              </div>
              <button onClick={() => setShowAddUserModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:font-medium"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:font-medium"
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Secure Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:font-medium"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:font-medium"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <button
                onClick={handleAddUser}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-slate-800 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:from-blue-700 hover:to-indigo-800 transition-all shadow-xl shadow-blue-200 active:scale-[0.98]"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddClientModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md border border-white/20 transform animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">Add Client</h2>
                  <p className="text-sm font-medium text-slate-500">Register a new partner client</p>
                </div>
              </div>
              <button onClick={() => setShowAddClientModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Organization Name</label>
                <input
                  type="text"
                  value={clientFormData.name}
                  onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:font-medium"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Key Contact Person</label>
                <input
                  type="text"
                  value={clientFormData.contactPerson}
                  onChange={(e) => setClientFormData({ ...clientFormData, contactPerson: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:font-medium"
                  placeholder="Contact Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Business Email</label>
                <input
                  type="email"
                  value={clientFormData.email}
                  onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:font-medium"
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Office Phone</label>
                <input
                  type="tel"
                  value={clientFormData.phone}
                  onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 focus:bg-white outline-none transition-all text-sm font-bold placeholder:font-medium"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <button
                onClick={handleAddClient}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-700 text-slate-800 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:from-orange-700 hover:to-amber-800 transition-all shadow-xl shadow-orange-200 active:scale-[0.98]"
              >
                Register Client
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md border border-white/20 transform animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
                  <UserCog className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">Assign Engineer</h2>
                  <p className="text-sm font-medium text-slate-500">Deploy resource to client site</p>
                </div>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Select Field Engineer</label>
                <div className="relative">
                  <select
                    value={assignFormData.engineerId}
                    onChange={(e) => setAssignFormData({ ...assignFormData, engineerId: e.target.value })}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 focus:bg-white outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Choose an engineer...</option>
                    {engineers.map(eng => (
                      <option key={eng.id} value={eng.id}>{eng.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Target Client</label>
                <div className="relative">
                  <select
                    value={assignFormData.clientId}
                    onChange={(e) => setAssignFormData({ ...assignFormData, clientId: e.target.value })}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 focus:bg-white outline-none transition-all text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Choose a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>
              <button
                onClick={handleAssignEngineer}
                disabled={!assignFormData.engineerId || !assignFormData.clientId}
                className="w-full bg-gradient-to-r from-purple-600 to-violet-800 text-slate-800 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs hover:from-purple-700 hover:to-violet-900 transition-all shadow-xl shadow-purple-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">Edit User</h2>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone</label>
                <input
                  type="tel"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Role</label>
                <select
                   value={editingUser.role}
                   onChange={(e:any) => setEditingUser({ ...editingUser, role: e.target.value })}
                   className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:border-blue-500 outline-none transition-all text-sm font-bold"
                >
                  <option value="engineer">Engineer</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                </select>
              </div>
              <button
                onClick={handleUpdateUser}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-slate-800 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-[0.98]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 leading-tight">Edit Client</h2>
              <button onClick={() => setEditingClient(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Client Name</label>
                <input
                  type="text"
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:border-orange-500 outline-none transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Contact Person</label>
                <input
                  type="text"
                  value={editingClient.contactPerson}
                  onChange={(e) => setEditingClient({ ...editingClient, contactPerson: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:border-orange-500 outline-none transition-all text-sm font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Email</label>
                <input
                  type="email"
                  value={editingClient.email}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:border-orange-500 outline-none transition-all text-sm font-bold"
                />
              </div>
              <button
                onClick={handleUpdateClient}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-700 text-slate-800 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-[0.98]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      {viewingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 max-h-[90vh] overflow-y-auto w-full max-w-md border border-white/20 scrollbar-hide">
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/90 backdrop-blur-sm pb-4 z-20 border-b border-slate-100/50">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {viewingItem.type} Details
              </h2>
              <button 
                onClick={() => setViewingItem(null)} 
                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="space-y-6">
              {viewingItem.type === 'user' && (
                <>
                  <DetailRow label="Full Name" value={viewingItem.data.name} />
                  <DetailRow label="Email Address" value={viewingItem.data.email} />
                  <DetailRow label="Phone Number" value={viewingItem.data.phone || 'N/A'} />
                  <DetailRow label="Account Role" value={viewingItem.data.role} />
                  <DetailRow label="Designation" value={viewingItem.data.designation || 'N/A'} />
                  <DetailRow label="Joined Date" value={viewingItem.data.createdAt ? new Date(viewingItem.data.createdAt).toLocaleDateString() : 'N/A'} />
                  
                  {viewingItem.data.todaySessions && viewingItem.data.todaySessions.length > 0 && (
                    <div className="mt-8 mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Today's Timeline</p>
                      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                        {viewingItem.data.todaySessions.map((session: any, idx: number) => (
                          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors">
                            </div>
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] bg-white p-3 rounded shadow-sm border border-slate-100">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${session.todayCheckOut ? 'bg-orange-400' : 'bg-emerald-500 animate-pulse'}`}></span>
                                  <span className="font-bold text-slate-700 text-xs">{session.todayCheckOut ? 'Checked Out' : 'Checked In'}</span>
                                </div>
                              </div>
                              <div className="text-slate-500 text-[10px] flex flex-col gap-1">
                                {session.todayCheckIn && <span><strong className="text-slate-700">In:</strong> {new Date(session.todayCheckIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                                {session.todayCheckOut && <span><strong className="text-slate-700">Out:</strong> {new Date(session.todayCheckOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                              </div>
                              {session.todayLocation && <div className="text-blue-600 font-medium truncate max-w-full text-[10px] mt-1">{session.todayLocation}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!viewingItem.data.todaySessions || viewingItem.data.todaySessions.length === 0) && (
                    <div className="mt-8 mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Today's Timeline</p>
                      <div className="text-slate-400 text-xs italic bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">No attendance records for today.</div>
                    </div>
                  )}
                </>
              )}
              {viewingItem.type === 'client' && (
                <>
                  <DetailRow label="Client Name" value={viewingItem.data.name} />
                  <DetailRow label="Contact Person" value={viewingItem.data.contactPerson} />
                  <DetailRow label="Email Address" value={viewingItem.data.email} />
                  <DetailRow label="Phone Number" value={viewingItem.data.phone || 'N/A'} />
                  <DetailRow label="Address" value={viewingItem.data.address || 'N/A'} />
                </>
              )}
              {viewingItem.type === 'assignment' && (
                <>
                  <DetailRow label="Engineer" value={viewingItem.data.engineerName} />
                  <DetailRow label="Assigned Client" value={viewingItem.data.clientName} />
                  <DetailRow label="Assigned Date" value={viewingItem.data.assignedAt ? new Date(viewingItem.data.assignedAt).toLocaleDateString() : 'N/A'} />
                  <DetailRow label="Status" value="Active" />
                </>
              )}
              <button
                onClick={() => setViewingItem(null)}
                className="w-full bg-slate-900 text-slate-800 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-[0.98]"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAssignment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 w-full max-w-md border border-white/20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                Edit Assignment
              </h2>
              <button 
                onClick={() => setEditingAssignment(null)} 
                className="p-3 hover:bg-slate-100 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Engineer</label>
                <select
                  value={editingAssignment.engineerId}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, engineerId: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:border-purple-500 outline-none transition-all text-sm font-bold"
                >
                  <option value="">Select Engineer</option>
                  {engineers.map(eng => (
                    <option key={eng.id} value={eng.id}>{eng.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Client</label>
                <select
                  value={editingAssignment.clientId}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, clientId: e.target.value })}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-lg focus:border-purple-500 outline-none transition-all text-sm font-bold"
                >
                  <option value="">Select Client</option>
                  {clients.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleUpdateAssignment}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-slate-800 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-[0.98]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="pb-4 border-b border-slate-100/50 last:border-0 last:pb-0">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[15px] font-medium text-slate-900">{value}</p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: 'blue' | 'green' | 'orange' | 'purple' }) {
  const iconColors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50/50 border-blue-100/50',
    green: 'text-emerald-600 bg-emerald-50/50 border-emerald-100/50',
    orange: 'text-orange-600 bg-orange-50/50 border-orange-100/50',
    purple: 'text-indigo-600 bg-indigo-50/50 border-indigo-100/50',
  };

  return (
    <div className="bg-white/80 backdrop-blur-md p-6 rounded-[1.25rem] border border-slate-200/60 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl border transition-colors ${iconColors[color]} group-hover:scale-105 duration-300 flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-semibold text-slate-900 tracking-tight">{value}</p>
        <p className="text-[13px] font-medium text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
