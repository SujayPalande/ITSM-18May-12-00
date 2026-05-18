import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { cn } from "@/lib/utils";
import { PaginationControls } from "@/components/common/pagination-controls";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  MessageSquare,
  RefreshCw,
  Filter,
  List
} from "lucide-react";
import { Category } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface TicketFilters {
  status?: string;
  priority?: string;
  categoryId?: number;
}

export default function TicketsPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: tickets, isLoading: isLoadingTickets, refetch } = useQuery<any[]>({
    queryKey: ["/api/tickets/my"],
    queryFn: async () => (await apiRequest("GET", "/api/tickets/my")).json(),
    enabled: !!user,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => (await apiRequest("GET", "/api/categories")).json(),
    enabled: !!user,
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
      case "new": return "bg-rose-50 text-rose-700 border-rose-100";
      case "in-progress":
      case "assigned": return "bg-amber-50 text-amber-700 border-amber-100";
      case "resolved":
      case "closed": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high": return "text-rose-600";
      case "medium": return "text-amber-600";
      case "low": return "text-emerald-600";
      default: return "text-slate-600";
    }
  };

  const filteredTickets = tickets?.filter(ticket => {
    const matchesSearch = () => {
      if (!searchQuery) return true;
      const search = searchQuery.toLowerCase();
      return (
        ticket.title?.toLowerCase().includes(search) || 
        `TKT-${ticket.id.toString().padStart(4, '0')}`.includes(search)
      );
    };
    
    if (!matchesSearch()) return false;
    if (filters.status && ticket.status !== filters.status) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (filters.categoryId && ticket.categoryId !== filters.categoryId) return false;
    return true;
  });

  const totalPages = Math.ceil((filteredTickets?.length || 0) / ITEMS_PER_PAGE);
  const paginatedTickets = filteredTickets?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) || [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="My Tickets" />

        <main className="flex-1 overflow-y-auto p-4 md:px-8 md:pt-8 md:pb-0 bg-transparent">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto space-y-10">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">My Tickets</h2>
                <p className="text-sm text-slate-500">View and manage your personal tickets</p>
              </div>
              
              <div className="flex items-center gap-3">
                 <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => refetch()} 
                   className="h-10 px-4 rounded-md border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-medium text-sm transition-all"
                 >
                    <RefreshCw size={14} className={cn("mr-2", isLoadingTickets && "animate-spin")} /> 
                    Refresh
                 </Button>
                 <Link href="/tickets/new">
                   <Button size="sm" className="h-10 px-6 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm transition-all shadow-sm">
                     <Plus size={16} className="mr-2" /> New Ticket
                   </Button>
                 </Link>
              </div>
            </div>

            {/* 📊 Personal Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="border border-slate-200 shadow-sm rounded-xl bg-white p-6 group">
                  <p className="text-sm font-medium text-slate-500 mb-1">Total Tickets</p>
                  <p className="text-3xl font-bold text-slate-900">{tickets?.length || 0}</p>
               </Card>
               <Card className="border border-slate-200 shadow-sm rounded-xl bg-white p-6 group">
                  <p className="text-sm font-medium text-slate-500 mb-1">Active Tickets</p>
                  <p className="text-3xl font-bold text-slate-900">
                     {tickets?.filter(t => ["new", "open", "in-progress"].includes(t.status.toLowerCase())).length || 0}
                  </p>
               </Card>
               <Card className="border border-slate-200 shadow-sm rounded-xl bg-white p-6 group">
                  <p className="text-sm font-medium text-slate-500 mb-1">Resolved Tickets</p>
                  <p className="text-3xl font-bold text-slate-900">
                     {tickets?.filter(t => ["resolved", "closed"].includes(t.status.toLowerCase())).length || 0}
                  </p>
               </Card>
            </div>

            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                       <div className="relative group min-w-[250px]">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                          <Input 
                             placeholder="Search tickets..." 
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                             className="pl-11 h-10 bg-white border-slate-200 rounded-lg text-sm shadow-sm"
                          />
                       </div>
                       
                       <div className="flex items-center gap-2">
                          <Select value={filters.status || "all"} onValueChange={(v) => setFilters({...filters, status: v === "all" ? undefined : v})}>
                             <SelectTrigger className="h-10 w-[140px] rounded-lg bg-white border-slate-200 text-sm font-medium shadow-sm">
                                <SelectValue placeholder="Status" />
                             </SelectTrigger>
                             <SelectContent className="rounded-md border-slate-200 shadow-md">
                               <SelectItem value="all">All Statuses</SelectItem>
                               <SelectItem value="new">New</SelectItem>
                               <SelectItem value="open">Open</SelectItem>
                               <SelectItem value="in-progress">In Progress</SelectItem>
                               <SelectItem value="closed">Closed</SelectItem>
                             </SelectContent>
                          </Select>

                          <Select value={filters.priority || "all"} onValueChange={(v) => setFilters({...filters, priority: v === "all" ? undefined : v})}>
                             <SelectTrigger className="h-10 w-[140px] rounded-lg bg-white border-slate-200 text-sm font-medium shadow-sm">
                                <SelectValue placeholder="Priority" />
                             </SelectTrigger>
                             <SelectContent className="rounded-md border-slate-200 shadow-md">
                               <SelectItem value="all">All Priorities</SelectItem>
                               <SelectItem value="high">High</SelectItem>
                               <SelectItem value="medium">Medium</SelectItem>
                               <SelectItem value="low">Low</SelectItem>
                             </SelectContent>
                          </Select>
                       </div>
                    </div>
                    
                    <div className="hidden xl:flex items-center gap-2 text-sm text-slate-500 font-medium">
                       Filtered: <span className="text-slate-900">{filteredTickets?.length || 0}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ticket ID</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Priority</th>
                          <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {isLoadingTickets ? (
                          [...Array(5)].map((_, i) => (
                            <tr key={i}><td colSpan={5} className="px-6 py-4"><Skeleton className="h-8 w-full rounded-md" /></td></tr>
                          ))
                        ) : paginatedTickets.length > 0 ? (
                          paginatedTickets.map((ticket) => (
                            <tr key={ticket.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-6 py-4 text-xs font-medium text-slate-500">TKT-{ticket.id.toString().padStart(4, '0')}</td>
                              <td className="px-6 py-4">
                                <Link href={`/tickets/${ticket.id}`} className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1">{ticket.title}</Link>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Badge variant="outline" className={cn("text-xs font-medium py-0.5 px-2.5", getStatusColor(ticket.status))}>{ticket.status.replace("-", " ")}</Badge>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={cn("text-xs font-medium px-2.5 py-0.5 bg-slate-50 rounded-md", getPriorityColor(ticket.priority))}>{ticket.priority}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Link href={`/tickets/${ticket.id}`}>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md hover:bg-slate-200">
                                    <Eye size={16} className="text-slate-500" />
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={5} className="py-16 text-center">
                             <div className="flex flex-col items-center gap-2">
                                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center">
                                   <Filter size={24} className="text-slate-400" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900">No tickets found</h3>
                                <p className="text-sm text-slate-500">Try adjusting your filters or search query.</p>
                             </div>
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 bg-white">
                       <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                  )}
                </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </div>

  );
}
