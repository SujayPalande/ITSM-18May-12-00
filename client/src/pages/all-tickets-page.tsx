import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTicketPolling } from "@/hooks/use-ticket-polling";
import { hasAnyRole } from "@/lib/role-utils";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import TicketList from "@/components/tickets/ticket-list";
import TicketFilters from "@/components/tickets/ticket-filters";
import { PaginationControls } from "@/components/common/pagination-controls";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  RefreshCw, 
  Filter,
  Ticket as TicketIcon,
  Box,
  LayoutGrid,
  AlertCircle,
  Clock,
  CheckCircle,
  Activity
} from "lucide-react";
import { Category, User } from "@shared/schema";

interface FilterState {
  status?: string;
  priority?: string;
  categoryId?: number;
  assignedToId?: number;
  companyName?: string;
}

export default function AllTicketsPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const [filters, setFilters] = useState<FilterState>({ assignedToId: 0 });

  const { user } = useAuth();

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.categoryId !== undefined && filters.categoryId !== null) params.append('categoryId', filters.categoryId.toString());
    if (typeof filters.assignedToId !== 'undefined' && filters.assignedToId !== null) {
      params.append('assignedToId', filters.assignedToId.toString());
    }
    if (filters.companyName) params.append('companyName', filters.companyName);
    return params.toString();
  };

  const {
    tickets,
    changedTicketIds,
    isLoading: isLoadingTickets,
    statusCounts,
    refetch
  } = useTicketPolling(
    buildQueryParams() ? `/api/tickets?${buildQueryParams()}` : '/api/tickets',
    5000, 
    !!user 
  );

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => (await apiRequest("GET", "/api/categories")).json(),
    enabled: !!user,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => (await apiRequest("GET", "/api/users")).json(),
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
  });

  const handleFilterChange = (newFilters: FilterState) => {
    // Only reset to page 1 if the filters actually changed from their previous values
    const filtersChanged = JSON.stringify(filters) !== JSON.stringify(newFilters);
    if (filtersChanged) {
        setFilters(newFilters);
        setCurrentPage(1);
    }
  };

  const totalPages = Math.ceil((tickets?.length || 0) / ITEMS_PER_PAGE);



  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTickets = tickets?.slice(startIndex, endIndex) || [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="All Tickets" />

        <main className="flex-1 overflow-y-auto p-4 md:px-6 md:pt-6 md:pb-0 bg-transparent scrollbar-thin">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1700px] mx-auto space-y-8">
            
            {/* 🏷️ Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">All Tickets</h1>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 rounded-full">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">Live</span>
                   </div>
                   <p className="text-xs text-slate-400">Real-time ticket monitoring</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative group w-[320px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input
                    placeholder="Search by ID or keyword..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-11 h-10 bg-white border-slate-200 rounded-xl text-sm shadow-sm transition-all focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  className="h-10 px-4 gap-2 rounded-xl bg-white border-slate-200 font-medium text-xs shadow-sm hover:bg-slate-50"
                >
                  <RefreshCw size={16} className={isLoadingTickets ? "animate-spin" : ""} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* 📊 High-End Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {[
                 { label: "Total Tickets", val: tickets?.length || 0, color: "blue", icon: <Box className="h-5 w-5" /> },
                 { label: "Open", val: statusCounts?.open || 0, color: "rose", icon: <AlertCircle className="h-5 w-5" /> },
                 { label: "In Progress", val: statusCounts?.inProgress || statusCounts?.['in-progress'] || 0, color: "amber", icon: <RefreshCw size={18} /> },
                 { label: "Closed", val: statusCounts?.closed || 0, color: "emerald", icon: <CheckCircle className="h-5 w-5" /> },
               ].map((stat, i) => (
                 <motion.div 
                   key={i}
                   whileHover={{ y: -4, scale: 1.02 }}
                   transition={{ type: "spring", stiffness: 400, damping: 25 }}
                   className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between group overflow-hidden relative"
                 >
                   <div className={cn("absolute -right-4 -bottom-4 h-24 w-24 rounded-full opacity-5 group-hover:scale-150 transition-transform duration-700", {
                      "bg-blue-500": stat.color === "blue",
                      "bg-rose-500": stat.color === "rose",
                      "bg-amber-500": stat.color === "amber",
                      "bg-emerald-500": stat.color === "emerald",
                   })} />
                   
                   <div className="space-y-1 relative z-10">
                     <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                     <p className="text-2xl font-bold text-slate-900 tabular-nums">{stat.val}</p>
                   </div>
                   
                   <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center relative z-10", {
                      "bg-blue-50 text-blue-600": stat.color === "blue",
                      "bg-rose-50 text-rose-600": stat.color === "rose",
                      "bg-amber-50 text-amber-600": stat.color === "amber",
                      "bg-emerald-50 text-emerald-600": stat.color === "emerald",
                   })}>
                      {stat.icon}
                   </div>
                 </motion.div>
               ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* 🛠️ Dynamic Filters */}
              <div className="w-full lg:w-[350px] shrink-0 sticky top-6">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                  <div className="px-6 py-5 flex items-center justify-between border-b border-slate-50">
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 bg-blue-600 rounded-xl flex items-center justify-center">
                            <Filter className="h-4 w-4 text-white" />
                         </div>
                         <span className="text-xs font-semibold text-slate-700">Filters</span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setFilters({ assignedToId: 0 })}
                        className="h-8 text-xs font-medium text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg px-2"
                      >
                        Reset
                      </Button>
                  </div>
                  <CardContent className="p-6">
                    <TicketFilters
                      categories={categories || []}
                      users={users || []}
                      tickets={tickets || []}
                      showAssigneeFilter={true}
                      initialFilters={filters}
                      onFilterChange={handleFilterChange}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* 📑 Content Board */}
              <div className="flex-1 min-w-0">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                  <div className="bg-slate-50/40 py-5 px-8 flex items-center justify-between border-b border-slate-100/50 backdrop-blur-sm sticky top-0 z-10">
                     <div className="flex items-center gap-4">
                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                        <span className="text-xs font-semibold text-slate-700">Ticket List</span>
                     </div>
                     <Badge className="bg-slate-100 text-slate-600 border-none rounded-full px-3 py-1 font-medium text-xs tabular-nums">
                        {tickets?.length || 0} total
                     </Badge>
                  </div>

                  <CardContent className="p-0">
                    {isLoadingTickets ? (
                      <div className="p-12 space-y-6">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex gap-6">
                             <Skeleton className="h-16 w-16 rounded-2xl bg-slate-50" />
                             <div className="flex-1 space-y-3">
                                <Skeleton className="h-4 w-1/3 bg-slate-50" />
                                <Skeleton className="h-3 w-full bg-slate-50" />
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : tickets && tickets.length > 0 ? (
                      <div>
                        <TicketList
                          tickets={paginatedTickets as any}
                          showCreatedBy={true}
                          showAssignedTo={true}
                          changedTicketIds={changedTicketIds}
                        />
                        
                        {/* 🔘 Enhanced Pagination */}
                        <div className="px-10 py-8 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                            <div className="hidden md:block">
                               <p className="text-xs text-slate-500">
                                  Showing <span className="font-medium text-slate-700">{Math.min(startIndex + 1, tickets.length)}</span> to <span className="font-medium text-slate-700">{Math.min(endIndex, tickets.length)}</span> of {tickets.length}
                               </p>
                            </div>
                            <PaginationControls
                               currentPage={currentPage}
                               totalPages={totalPages}
                               onPageChange={setCurrentPage}
                            />
                        </div>
                      </div>
                    ) : (
                      <div className="py-40 text-center flex flex-col items-center">
                        <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                           <TicketIcon size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">No tickets found</h3>
                        <p className="text-sm text-slate-400 mt-2">Try adjusting your filters or search terms.</p>
                        <Button 
                          variant="outline" 
                          onClick={() => setFilters({ assignedToId: 0 })}
                          className="mt-6 rounded-xl font-medium text-xs h-9 px-5 border-slate-200 bg-white shadow-sm"
                        >
                           Clear Filters
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>

        </main>
      </div>
    </div>

  );
}
