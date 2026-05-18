import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { hasRole, hasAnyRole } from "@/lib/role-utils";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Bug, Edit2, Trash2, Check, X, Camera, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

export default function BugReportsPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const { user: currentUser } = useAuth();

  // Allow bug report for all logged-in users (admin, agent, user) - support multi-role users like "admin,agent"
  const canSubmitBug = !!currentUser && hasAnyRole(currentUser?.role, ["admin", "agent", "user"]);

  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editComment, setEditComment] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'resolved' | 'not-resolved'>('all');
  const [screenshotModal, setScreenshotModal] = useState<string | null>(null);



  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return await res.json();
    },
    enabled: !!currentUser,
  });

  const { data: allBugReports = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/project-bug-reports"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/project-bug-reports.php");
      return await res.json();
    },
    // enabled: !!currentUser, // allow all roles to see
    enabled: true,
  });

  const getUserName = (id: number) => {
    const u = allUsers.find((x: any) => x.id === id);
    return u ? (u.name || u.username || u.fullName) : String(id);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg','image/jpg','image/png','image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF)');
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    const input = document.getElementById('screenshot-input') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  // Only show user's own bugs if user role, else show all
  let filteredReports = allBugReports;
  if (hasRole(currentUser?.role, 'user') && currentUser?.id) {
    filteredReports = allBugReports.filter((r: any) => r.created_by === currentUser.id);
  }
  const bugReports = filteredReports.filter((r: any) => {
    if (statusFilter === 'all') return true;
    return (r.resolution_status || 'not-resolved') === statusFilter;
  });

  // Summary stats
  const totalReports = allBugReports.length;
  const yourReports = allBugReports.filter((r: any) => r.created_by === currentUser?.id).length;
  const resolvedReports = allBugReports.filter((r: any) => (r.resolution_status || 'not-resolved') === 'resolved').length;

  const handleEdit = (id: number, comment: string) => {
    setEditingId(id);
    setEditComment(comment);
  };

  const handleEditSave = async (id: number) => {
    try {
      await apiRequest('POST', '/api/project-bug-reports.php', { id, comment: editComment, user_id: currentUser?.id });
      setEditingId(null);
      setEditComment('');
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiRequest('DELETE', '/api/project-bug-reports.php', { id, user_id: currentUser?.id });
      refetch();
    } catch (err) {
      console.error(err);
    }
    setDeletingId(null);
  };

  const handleToggleResolution = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === 'resolved' ? 'not-resolved' : 'resolved';
    try {
      await apiRequest('POST', '/api/project-bug-reports.php', { id, resolution_status: newStatus, user_id: currentUser?.id });
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || !currentUser?.id) return;
    setSubmitting(true);
    setSubmitSuccess(false);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append('comment', feedback);
        formData.append('created_by', String(currentUser.id));
        formData.append('resolutionStatus','not-resolved');
        formData.append('screenshot', selectedFile);
        await apiRequest('POST', '/api/project-bug-reports.php', formData);
      } else {
        await apiRequest('POST', '/api/project-bug-reports.php', { comment: feedback, created_by: currentUser.id, resolutionStatus: 'not-resolved' });
      }
      setSubmitSuccess(true);
      setFeedback('');
      removeSelectedFile();
      refetch();
    } catch (err) {
      console.error(err);
      setSubmitSuccess(false);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Bug Intelligence" />

        {/* Screenshot Lightbox Modal */}
        {screenshotModal && (
          <div
            className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setScreenshotModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={screenshotModal}
                alt="Screenshot"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl"
              />
              <button
                onClick={() => setScreenshotModal(null)}
                className="absolute top-3 right-3 h-9 w-9 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X size={18} />
              </button>
            </motion.div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-slate-50/10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto space-y-10">
            
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800 p-8 md:p-12 mb-2 shadow-2xl">
               <div className="absolute top-0 right-0 p-32 bg-blue-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 p-32 bg-emerald-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-4">
                    <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10 backdrop-blur-md">
                       <Bug size={12} className="mr-2" /> Bug Tracking
                    </Badge>
                     <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">Bug Reports</h2>
                     <p className="text-slate-300 text-sm md:text-lg max-w-lg font-medium opacity-90">Track, manage, and resolve system issues reported by users across all platforms.</p>
                  </div>
               </div>
            </div>

            {/* 📊 Intelligence Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="border border-slate-200 shadow-md rounded-[1.5rem] bg-white p-6 group relative overflow-hidden transition-all hover:shadow-xl hover:border-slate-300">
                  <div className="absolute -top-4 -right-4 p-6 bg-slate-50 rounded-full opacity-[0.4] group-hover:bg-blue-50 transition-colors">
                     <Bug size={64} className="text-blue-200" />
                  </div>
                  <div className="relative z-10">
                     <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">Total Reports</p>
                     <p className="text-4xl font-extrabold text-slate-900">{totalReports}</p>
                  </div>
               </Card>
               <Card className="border border-slate-200 shadow-md rounded-[1.5rem] bg-white p-6 group relative overflow-hidden transition-all hover:shadow-xl hover:border-slate-300">
                  <div className="absolute -top-4 -right-4 p-6 bg-emerald-50 rounded-full opacity-[0.4] group-hover:bg-emerald-100 transition-colors">
                     <Check size={64} className="text-emerald-200" />
                  </div>
                  <div className="relative z-10">
                     <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">Resolved Reports</p>
                     <p className="text-4xl font-extrabold text-slate-900">{resolvedReports}</p>
                  </div>
               </Card>
               <Card className="border border-slate-200 shadow-md rounded-[1.5rem] bg-white p-6 group relative overflow-hidden transition-all hover:shadow-xl hover:border-slate-300">
                  <div className="absolute -top-4 -right-4 p-6 bg-rose-50 rounded-full opacity-[0.4] group-hover:bg-rose-100 transition-colors">
                     <X size={64} className="text-rose-200" />
                  </div>
                  <div className="relative z-10">
                     <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wide">Active Issues</p>
                     <p className="text-4xl font-extrabold text-slate-900">{totalReports - resolvedReports}</p>
                  </div>
               </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
               {/* 📥 Registration Entry */}
               <div className="lg:col-span-12 xl:col-span-4 space-y-8">
                  {canSubmitBug && (
                    <Card className="border border-slate-200 shadow-sm rounded-xl bg-white text-slate-900 p-0">
                       <CardHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50">
                          <CardTitle className="text-lg font-semibold text-slate-900 tracking-tight">Report Bug</CardTitle>
                          <p className="text-slate-500 text-sm mt-1">Submit a technical issue for review</p>
                       </CardHeader>
                       <CardContent className="p-6 space-y-5">
                          <form onSubmit={handleSubmitFeedback} className="space-y-5">
                             <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Description</label>
                                <textarea 
                                  className="w-full bg-white border border-slate-200 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[120px] resize-none" 
                                  placeholder="Provide details about the issue..." 
                                  value={feedback} 
                                  onChange={e=>setFeedback(e.target.value)} 
                                  disabled={submitting} 
                                />
                             </div>

                             <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Screenshot (Optional)</label>
                                {!selectedFile ? (
                                  <div className="border border-dashed border-slate-300 rounded-md p-6 text-center hover:bg-slate-50 transition-all cursor-pointer relative">
                                    <input type="file" id="screenshot-input" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" disabled={submitting} />
                                    <Camera className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                                    <p className="text-xs font-medium text-slate-500">Upload Image</p>
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 relative group">
                                     <div className="flex items-center gap-3">
                                        {previewUrl && <img src={previewUrl} className="h-10 w-10 rounded object-cover border border-slate-200" alt="Preview" />}
                                        <div className="flex-1 overflow-hidden">
                                           <p className="text-xs font-medium truncate text-slate-800">{selectedFile.name}</p>
                                           <p className="text-[10px] text-slate-500">{(selectedFile.size/1024/1024).toFixed(2)} MB</p>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" onClick={removeSelectedFile} disabled={submitting} className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded">
                                           <X size={14} />
                                        </Button>
                                     </div>
                                  </div>
                                )}
                             </div>

                             <Button type="submit" disabled={submitting || !feedback.trim()} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm transition-all mt-2 shadow-sm">
                                {submitting ? 'Submitting...' : 'Submit Report'}
                             </Button>
                             {submitSuccess && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-emerald-600 text-sm font-medium text-center mt-2">Report submitted successfully</motion.p>}
                          </form>
                       </CardContent>
                    </Card>
                  )}
               </div>

               <div className="lg:col-span-12 xl:col-span-8">
                   <Card className="border border-slate-200 shadow-xl rounded-[2rem] bg-white overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/80 backdrop-blur-sm">
                         <div className="space-y-1">
                            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Issue Ledger</h3>
                         </div>
                         <div className="flex bg-white border border-slate-200 p-1 rounded-md gap-1">
                            <button onClick={()=>setStatusFilter('all')} className={cn("px-3 py-1 rounded text-xs font-medium transition-all", statusFilter === 'all' ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700")}>All</button>
                            <button onClick={()=>setStatusFilter('resolved')} className={cn("px-3 py-1 rounded text-xs font-medium transition-all", statusFilter === 'resolved' ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:text-slate-700")}>Resolved</button>
                            <button onClick={()=>setStatusFilter('not-resolved')} className={cn("px-3 py-1 rounded text-xs font-medium transition-all", statusFilter === 'not-resolved' ? "bg-rose-50 text-rose-700" : "text-slate-500 hover:text-slate-700")}>Active</button>
                         </div>
                      </div>

                      <div className="overflow-x-auto">
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-slate-50 border-b border-slate-200">
                                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Screenshot</th>
                                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {bugReports.length === 0 ? (
                                  <tr><td colSpan={5} className="py-16 text-center text-sm font-medium text-slate-500">No bugs found</td></tr>
                               ) : (
                                  bugReports.map((r: any) => (
                                     <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500 tabular-nums">#{r.id}</td>
                                        <td className="px-6 py-4 max-w-[350px]">
                                           {editingId === r.id ? (
                                              <textarea className="w-full bg-white border border-slate-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all resize-none" value={editComment} onChange={e=>setEditComment(e.target.value)} />
                                           ) : (
                                              <div className="text-sm font-medium text-slate-700 leading-relaxed line-clamp-2">{r.comment}</div>
                                           )}
                                           <div className="flex items-center gap-2 mt-2">
                                              <div className="h-5 w-5 bg-slate-100 rounded flex items-center justify-center text-xs font-semibold text-slate-600">{getUserName(r.created_by).toString().substring(0,1)}</div>
                                              <span className="text-xs font-medium text-slate-500">{getUserName(r.created_by)}</span>
                                           </div>
                                        </td>
                                        <td className="px-6 py-4">
                                           {r.screenshot_path ? (
                                             (() => {
                                               const rawPath = r.screenshot_path;
                                               const fullUrl = rawPath.startsWith('http')
                                                 ? rawPath
                                                 : rawPath.startsWith('uploads/')
                                                   ? `/${rawPath}`
                                                   : `/uploads/bug-screenshots/${rawPath}`;
                                               return (
                                                 <motion.button
                                                   whileHover={{ scale: 1.08 }}
                                                   onClick={() => setScreenshotModal(fullUrl)}
                                                   className="h-12 w-12 rounded-xl border border-slate-200 shadow-sm cursor-pointer relative overflow-hidden group/img bg-slate-50 flex items-center justify-center"
                                                 >
                                                   <img
                                                     src={fullUrl}
                                                     className="h-full w-full object-cover transition-transform group-hover/img:scale-110"
                                                     alt="Screenshot"
                                                     onError={(e) => {
                                                       const target = e.currentTarget;
                                                       target.style.display = 'none';
                                                       const parent = target.parentElement;
                                                       if (parent) {
                                                         parent.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>';
                                                       }
                                                     }}
                                                   />
                                                   <div className="absolute inset-0 bg-blue-600/0 group-hover/img:bg-blue-600/10 transition-colors flex items-center justify-center">
                                                     <Image size={14} className="text-white opacity-0 group-hover/img:opacity-100 drop-shadow-md transition-opacity" />
                                                   </div>
                                                 </motion.button>
                                               );
                                             })()
                                           ) : (
                                              <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center border border-dashed border-slate-200 text-slate-300">
                                                 <span className="text-[10px] font-medium">None</span>
                                              </div>
                                           )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                           <Badge variant="outline" className={cn("text-xs font-medium rounded px-2.5 py-0.5", r.resolution_status === 'resolved' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
                                              {r.resolution_status === 'resolved' ? 'Resolved' : 'Active'}
                                           </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                           {(hasRole(currentUser?.role, 'admin') || r.created_by === currentUser?.id) && (
                                              <div className="flex items-center justify-end gap-1">
                                                 {editingId === r.id ? (
                                                    <>
                                                       <Button size="sm" onClick={()=>handleEditSave(r.id)} className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded"><Check size={14} /></Button>
                                                       <Button size="sm" variant="ghost" onClick={()=>setEditingId(null)} className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded"><X size={14} /></Button>
                                                    </>
                                                 ) : (
                                                    <>
                                                       {hasRole(currentUser?.role, 'admin') && (
                                                          <Button size="sm" variant="ghost" className={cn("h-8 w-8 p-0 rounded", r.resolution_status === 'resolved' ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100" )} onClick={()=>handleToggleResolution(r.id, r.resolution_status || 'not-resolved')}>
                                                             <Check size={14} />
                                                          </Button>
                                                       )}
                                                       <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" onClick={()=>handleEdit(r.id, r.comment)}>
                                                          <Edit2 size={14} />
                                                       </Button>
                                                       <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded" onClick={()=>handleDelete(r.id)} disabled={deletingId===r.id}>
                                                          {deletingId===r.id ? <div className="h-3 w-3 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" /> : <Trash2 size={14} />}
                                                       </Button>
                                                    </>
                                                 )}
                                              </div>
                                           )}
                                        </td>
                                     </tr>
                                  ))
                               )}
                            </tbody>
                         </table>
                      </div>
                   </Card>
               </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>

  );
}
