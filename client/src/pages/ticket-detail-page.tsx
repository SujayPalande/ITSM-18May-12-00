import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasRole, hasAnyRole } from "@/lib/role-utils";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getBasePath } from "@/lib/get-base-path";
import { formatDistanceToNow } from "date-fns";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import CommentThread from "@/components/tickets/comment-thread";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Tag,
  User,
  Clock,
  CheckCircle,
  ExternalLink,
  Paperclip,
  Download,
  Building,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  MessageSquare,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { TicketWithRelations } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function TicketDetailPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [commentText, setCommentText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const basePath = getBasePath();

  // Extract ticket ID from URL
  const ticketId = location.split("/").pop();

  // Get the referrer path from sessionStorage
  const referrer = sessionStorage.getItem('ticketReferrer') || '/tickets';

  // Fetch ticket details with relations
  const {
    data: ticket,
    isLoading: isLoadingTicket,
    error
  } = useQuery<TicketWithRelations>({
    queryKey: [`/api/tickets`, ticketId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/tickets/${ticketId}`);
      return await res.json();
    },
    enabled: !!user && !!ticketId,
  });

  // Fetch users for assignment dropdown
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      return await res.json();
    },
    enabled: !!user,
  });

  // Mutation for updating ticket status
  const updateTicketMutation = useMutation({
    mutationFn: async ({ status, assignedToId, priority }: { status?: string; assignedToId?: number | null; priority?: string }) => {
      const res = await apiRequest("PUT", `/api/tickets/${ticketId}`, {
        status,
        assignedToId,
        priority
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets`, ticketId] });
      toast({
        title: "Ticket updated",
        description: "The ticket has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update ticket",
        description: error.message || "An error occurred while updating the ticket.",
        variant: "destructive",
      });
    },
  });

  // Mutation for adding a comment
  const addCommentMutation = useMutation({
    mutationFn: async ({ ticketId, content, isInternal }: { ticketId: number; content: string; isInternal: boolean }) => {
      const res = await apiRequest("POST", `/api/tickets/${ticketId}/comments`, {
        content,
        isInternal: isInternal || false
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to add comment');
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/tickets`, ticketId] });
      setCommentText("");
      setIsInternalNote(false);
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add comment",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (status: string) => updateTicketMutation.mutate({ status });
  const handlePriorityChange = (priority: string) => updateTicketMutation.mutate({ priority });
  const handleAssignmentChange = (agentId: string) => {
    updateTicketMutation.mutate({
      assignedToId: agentId === "unassigned" ? null : parseInt(agentId)
    });
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !ticket) return;
    await addCommentMutation.mutateAsync({
      ticketId: ticket.id,
      content: commentText.trim(),
      isInternal: isInternalNote
    });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    return dateObj.toLocaleString();
  };

  useEffect(() => {
    if (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to load ticket", variant: "destructive" });
      if (location.includes('not-found')) navigate(referrer);
    }
  }, [error, navigate, toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-rose-50 text-rose-700 border-rose-100";
      case "in_progress": return "bg-amber-50 text-amber-700 border-amber-100";
      case "closed": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-rose-600 font-bold";
      case "medium": return "text-amber-600 font-bold";
      case "low": return "text-emerald-600 font-bold";
      default: return "text-slate-600 font-bold";
    }
  };

  const hasAgentOrAdminComment = () => {
    if (!ticket?.comments) return false;
    return ticket.comments.some(comment => 
      hasAnyRole(comment.user.role, ["admin", "agent"])
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Ticket Details" />

        <main className="flex-1 overflow-y-auto p-4 md:px-8 md:pt-6 md:pb-0 bg-transparent">
          <div className="max-w-[1400px] mx-auto space-y-4">
            
            {/* 🏷️ Breadcrumb & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-50" 
                  onClick={() => navigate(referrer)}
                >
                  <ArrowLeft className="h-4 w-4 text-slate-600" />
                </Button>
                <div>
                   <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-semibold rounded-md tracking-wider">
                         TKT-{ticket?.id.toString().padStart(4, '0')}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", getStatusColor(ticket?.status || ""))}>
                        {ticket?.status === "in_progress" ? "In Progress" : ticket?.status}
                      </Badge>
                   </div>
                   <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                      {isLoadingTicket ? <Skeleton className="h-7 w-64" /> : ticket?.title}
                   </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                 <Button variant="outline" size="sm" onClick={() => navigate(`/tickets/${ticketId}/edit`)} className="h-9 px-4 rounded-xl font-medium text-xs bg-white border-slate-200 shadow-sm">
                   Edit Ticket
                 </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 📝 Main Content (Left) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Description Card */}
                <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                  <div className="p-1 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0"></div>
                  <CardContent className="p-6">
                    {isLoadingTicket ? (
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50">
                           <Avatar className="h-12 w-12 border-2 border-slate-100">
                              <AvatarFallback className="bg-slate-900 text-white font-black text-sm">
                                 {ticket?.createdBy.name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                           </Avatar>
                           <div>
                              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Reported By</p>
                              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                 {ticket?.createdBy.name}
                                 <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                 <span className="text-xs text-slate-400">{formatDate(ticket?.createdAt || "")}</span>
                              </h3>
                           </div>
                        </div>

                        <div className="prose prose-slate max-w-none">
                           <p className="text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">{ticket?.description}</p>
                        </div>

                        {ticket?.attachmentUrl && (
                          <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                             <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                                   <Paperclip size={18} className="text-blue-600" />
                                </div>
                                <div>
                                   <p className="text-xs font-semibold text-slate-800 line-clamp-1">{ticket.attachmentName}</p>
                                   <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Attachment</p>
                                </div>
                             </div>
                             <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">
                                <a href={ticket.attachmentUrl} download={ticket.attachmentName || 'attachment'}>
                                   <Download size={18} />
                                </a>
                             </Button>
                          </div>
                        )}

                        <div className="mt-8 flex flex-wrap gap-2">
                           <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg">
                              {ticket?.category.name}
                           </Badge>
                           {ticket?.subcategory && (
                             <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-lg">
                                {ticket.subcategory.name}
                             </Badge>
                           )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Comments Section */}
                <div className="space-y-6">
                   <div className="flex items-center gap-4 px-2">
                      <MessageSquare size={20} className="text-slate-400" />
                      <h2 className="text-base font-semibold text-slate-900">Comments</h2>
                      <div className="h-px flex-1 bg-slate-100"></div>
                   </div>

                   {isLoadingTicket ? (
                     <div className="space-y-6">
                       <Skeleton className="h-32 w-full rounded-2xl" />
                       <Skeleton className="h-32 w-full rounded-2xl" />
                     </div>
                   ) : ticket?.comments && ticket.comments.length > 0 ? (
                     <CommentThread
                       comments={ticket.comments}
                       currentUserRole={user?.role || "user"}
                     />
                   ) : (
                     <div className="py-12 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <MessageSquare size={32} className="mb-2 opacity-20" />
                        <p className="text-sm text-slate-400">No comments yet</p>
                     </div>
                   )}

                   {/* Add Comment Card */}
                   <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                           <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                           </div>
                           <h4 className="text-xs font-medium text-slate-500">Add a Comment</h4>
                        </div>
                        <form onSubmit={handleSubmitComment}>
                           <Textarea
                             rows={4}
                             placeholder="Type your message here..."
                             value={commentText}
                             onChange={(e) => setCommentText(e.target.value)}
                             className="bg-slate-50 border-slate-100 rounded-xl text-sm focus:ring-blue-500/20 p-4 transition-all mb-4 resize-none"
                           />

                           <div className="flex items-center justify-between">
                             <div>
                                {hasAnyRole(user?.role, ["admin", "agent"]) && (
                                  <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                    <Checkbox
                                      id="internal-note"
                                      checked={isInternalNote}
                                      onCheckedChange={(c) => setIsInternalNote(c === true)}
                                      className="border-slate-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                    />
                                    <label htmlFor="internal-note" className="text-xs font-medium text-slate-500 cursor-pointer">
                                      Internal Note
                                    </label>
                                  </div>
                                )}
                             </div>
                             <Button 
                               type="submit" 
                               disabled={!commentText.trim() || addCommentMutation.isPending}
                               className="px-6 rounded-xl bg-blue-600 border-none font-medium text-sm h-10 shadow-sm hover:bg-blue-700 transition-all"
                             >
                               {addCommentMutation.isPending ? "Sending..." : "Send Comment"}
                             </Button>
                           </div>
                        </form>
                      </CardContent>
                   </Card>
                </div>
              </div>

              {/* 📊 Sidebar Metadata (Right) */}
              <div className="space-y-6">
                
                {/* Status & Controls Panel */}
                <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                    <div className="p-1 bg-gradient-to-r from-indigo-600 to-slate-900"></div>
                    <CardContent className="p-8 space-y-6">
                       <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                          <h4 className="text-xs font-medium text-slate-500">Ticket Status</h4>
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                       </div>

                       <div className="space-y-5">
                          <div className="space-y-2">
                             <div className="flex items-center gap-2 ml-1">
                                <CheckCircle size={14} className="text-blue-600" />
                                <span className="text-xs font-medium text-slate-500">Current Status</span>
                             </div>
                             {hasRole(user?.role, "user") && !hasAnyRole(user?.role, ["admin", "agent"]) ? (
                               <div className="w-full h-10 flex items-center px-4 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800 text-sm">
                                  {ticket?.status?.replace('_', ' ').toUpperCase()}
                               </div>
                             ) : (
                               <Select value={ticket?.status || "open"} onValueChange={handleStatusChange}>
                                 <SelectTrigger className="h-10 bg-slate-50 border-slate-100 rounded-xl font-medium text-slate-900 px-4 focus:ring-blue-500/20">
                                   <SelectValue />
                                 </SelectTrigger>
                                 <SelectContent className="rounded-xl shadow-lg p-1">
                                   <SelectItem value="open">Open</SelectItem>
                                   <SelectItem value="in_progress">In Progress</SelectItem>
                                   <SelectItem value="closed" disabled={!hasAgentOrAdminComment()}>Closed</SelectItem>
                                 </SelectContent>
                               </Select>
                             )}
                          </div>

                          <div className="space-y-2">
                             <div className="flex items-center gap-2 ml-1">
                                <Tag size={14} className="text-amber-600" />
                                <span className="text-xs font-medium text-slate-500">Priority</span>
                             </div>
                             <Select value={ticket?.priority || "medium"} onValueChange={handlePriorityChange}>
                                <SelectTrigger className="h-10 bg-slate-50 border-slate-100 rounded-xl font-medium text-slate-900 px-4 focus:ring-blue-500/20">
                                   <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-lg p-1">
                                   <SelectItem value="low" className="text-emerald-600">Low</SelectItem>
                                   <SelectItem value="medium" className="text-amber-600">Medium</SelectItem>
                                   <SelectItem value="high" className="text-rose-600">High</SelectItem>
                                </SelectContent>
                             </Select>
                          </div>

                          {hasRole(user?.role, "admin") && (
                            <div className="space-y-2 pt-2 border-t border-slate-50 mt-4">
                               <div className="flex items-center justify-between ml-1 mb-2">
                                 <div className="flex items-center gap-2">
                                    <User size={14} className="text-indigo-600" />
                                    <span className="text-xs font-medium text-slate-500">Assigned To</span>
                                 </div>
                                 <button type="button" onClick={() => handleAssignmentChange(user?.id?.toString() || "unassigned")} className="text-xs text-blue-600 font-medium hover:underline">
                                   Assign to me
                                 </button>
                               </div>
                               <Select value={ticket?.assignedToId?.toString() || "unassigned"} onValueChange={handleAssignmentChange}>
                                 <SelectTrigger className="h-10 bg-slate-50 border-slate-100 rounded-xl font-medium text-slate-900 px-4 focus:ring-blue-500/20">
                                   <SelectValue placeholder="UNASSIGNED" />
                                 </SelectTrigger>
                                 <SelectContent className="rounded-xl shadow-lg p-1">
                                   <SelectItem value="unassigned" className="text-rose-500">Unassigned</SelectItem>
                                   {users?.filter(u => hasAnyRole(u.role, ["agent", "admin"])).map((u) => (
                                     <SelectItem key={u.id} value={u.id.toString()}>
                                       {u.name || u.username}
                                     </SelectItem>
                                   ))}
                                 </SelectContent>
                               </Select>
                            </div>
                          )}
                       </div>
                    </CardContent>
                </Card>

                {/* Details Panel */}
                <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                   <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex-row items-center justify-between">
                       <CardTitle className="text-xs font-medium text-slate-500">Details</CardTitle>
                       <Clock size={14} className="text-slate-300" />
                   </CardHeader>
                   <CardContent className="p-8 space-y-6">
                      <div className="space-y-5">
                         {[
                           { label: "Created", icon: Calendar, val: formatDate(ticket?.createdAt || "") },
                           { label: "Company Name", icon: Building, val: ticket?.companyName || "N/A" },
                           { label: "Location", icon: MapPin, val: ticket?.location || "N/A" },
                           { label: "Category", icon: Tag, val: ticket?.category.name },
                         ].map((item, id) => (
                           <div key={id} className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                 <item.icon size={12} className="text-slate-400" />
                                 <span className="text-xs font-medium text-slate-400">{item.label}</span>
                              </div>
                              <p className="text-sm text-slate-800 ml-5">{item.val}</p>
                           </div>
                         ))}

                         {ticket?.subcategory && (
                           <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                 <Tag size={12} className="text-slate-400" />
                                 <span className="text-xs font-medium text-slate-400">Subcategory</span>
                              </div>
                              <p className="text-sm text-slate-800 ml-5">{ticket.subcategory.name}</p>
                           </div>
                         )}

                         <div className="flex flex-col gap-1 pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-2">
                               <RefreshCw size={12} className="text-blue-400" />
                               <span className="text-xs font-medium text-slate-400">Last Updated</span>
                            </div>
                            <p className="text-sm text-slate-800 ml-5">
                              {ticket?.comments && ticket.comments.length > 0
                                ? formatDate(ticket.comments[ticket.comments.length - 1].createdAt)
                                : formatDate(ticket?.updatedAt || "")}
                            </p>
                         </div>
                      </div>

                      {/* Unified Info Card for Contact/Agent */}
                      <div className="space-y-4 pt-4 border-t border-slate-100">
                         {/* User Details (Visible to Admin/Agent) */}
                         {hasAnyRole(user?.role, ["admin", "agent"]) && (
                           <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                              <p className="text-xs font-medium text-slate-500 mb-2">Requester Info</p>
                              <div className="flex items-center gap-2">
                                 <User size={14} className="text-slate-400" />
                                 <span className="text-xs font-bold text-slate-700">{ticket?.contactName || "None"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Mail size={14} className="text-slate-400" />
                                 <span className="text-xs font-bold text-slate-700 truncate">{ticket?.contactEmail || "None"}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Phone size={14} className="text-slate-400" />
                                 <span className="text-xs font-bold text-slate-700">{ticket?.contactPhone || "None"}</span>
                              </div>
                           </div>
                         )}

                         {/* Agent Details (Visible to Admin/Agent or the owner user) */}
                         {ticket?.assignedTo && (
                           <div className={cn("p-4 rounded-2xl space-y-3 shadow-sm", hasAnyRole(user?.role, ["admin", "agent"]) ? "bg-indigo-50 border border-indigo-100" : "bg-blue-50 border border-blue-100")}>
                              <p className={cn("text-xs font-medium mb-2", hasAnyRole(user?.role, ["admin", "agent"]) ? "text-indigo-500" : "text-blue-500")}>Assigned Agent</p>
                              <div className="flex items-center gap-2">
                                 <Briefcase size={14} className={hasAnyRole(user?.role, ["admin", "agent"]) ? "text-indigo-400" : "text-blue-400"} />
                                 <span className="text-xs font-bold text-slate-800">{ticket.assignedTo.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Mail size={14} className={hasAnyRole(user?.role, ["admin", "agent"]) ? "text-indigo-400" : "text-blue-400"} />
                                 <span className="text-xs font-bold text-slate-800 truncate">{ticket.assignedTo.email}</span>
                              </div>
                              {ticket.assignedTo.contactNumber && (
                                <div className="flex items-center gap-2">
                                   <Phone size={14} className={hasAnyRole(user?.role, ["admin", "agent"]) ? "text-indigo-400" : "text-blue-400"} />
                                   <span className="text-xs font-bold text-slate-800">{ticket.assignedTo.contactNumber}</span>
                                </div>
                              )}
                           </div>
                         )}
                      </div>
                   </CardContent>
                </Card>

                {/* Related Articles */}
                <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-slate-500">Related Articles</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {isLoadingTicket ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : (
                      <ul className="space-y-3">
                        {ticket?.category.name === "Network Issues" && (
                          <li>
                            <Link href={`${basePath}/knowledge-base?q=wifi`} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-2 underline underline-offset-4 decoration-blue-100">
                              <ExternalLink className="h-3 w-3" /> Troubleshooting WiFi connectivity
                            </Link>
                          </li>
                        )}
                        {ticket?.category.name === "Email Services" && (
                          <li>
                            <Link href={`${basePath}/knowledge-base?q=outlook`} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-2 underline underline-offset-4 decoration-blue-100">
                              <ExternalLink className="h-3 w-3" /> Common Outlook syncing problems
                            </Link>
                          </li>
                        )}
                        {ticket?.category.name === "Hardware" && ticket?.subcategory?.name === "Printer" && (
                          <li>
                            <Link href={`${basePath}/knowledge-base?q=printer`} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-2 underline underline-offset-4 decoration-blue-100">
                              <ExternalLink className="h-3 w-3" /> Resolving printer error messages
                            </Link>
                          </li>
                        )}
                        {!((ticket?.category.name === "Network Issues") ||
                          (ticket?.category.name === "Email Services") ||
                          (ticket?.category.name === "Hardware" && ticket?.subcategory?.name === "Printer")) && (
                            <li className="text-slate-400 text-xs font-bold flex items-center gap-2">
                               <AlertCircle size={14} className="opacity-50" /> No related guidance found
                            </li>
                          )}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

