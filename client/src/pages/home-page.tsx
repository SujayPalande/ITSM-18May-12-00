import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Activity, Zap, Shield, AlertCircle, Clock, CheckCircle, ArrowRight, LifeBuoy, FileText, BarChart3, Settings } from "lucide-react";
import { DashboardStats, Faq, Ticket } from "@shared/schema";
// Recharts for data visualization
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function HomePage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const { user } = useAuth();

  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
    queryFn: async () => (await apiRequest("GET", "/api/dashboard")).json(),
    enabled: !!user,
  });

  const userRoles = user?.role?.split(',').map(r => r.trim()) || [];
  const isAdmin = userRoles.includes("admin");

  const { data: tickets, isLoading: isLoadingTickets } = useQuery<Ticket[]>({
    queryKey: ["/api/tickets"],
    queryFn: async () => (await apiRequest("GET", "/api/tickets")).json(),
    enabled: !!user,
  });

  const { data: faqs, isLoading: isLoadingFaqs } = useQuery<Faq[]>({
    queryKey: ["/api/faqs.php"],
    queryFn: async () => (await apiRequest("GET", "/api/faqs.php")).json(),
    enabled: !!user,
  });

  const getStatusBadgeClass = (status: string) => {
    const s = status.toLowerCase();
    if (s === "open" || s === "new") return "bg-rose-50 text-rose-600 border-rose-100";
    if (s === "in-progress" || s === "assigned") return "bg-amber-50 text-amber-600 border-amber-100";
    if (s === "resolved" || s === "closed") return "bg-emerald-50 text-emerald-600 border-emerald-100";
    return "bg-slate-50 text-slate-500 border-slate-100";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
    } catch { return 'Recent'; }
  };

  // Dynamic chart data from real tickets
  const trendData = useMemo(() => {
    const daysData = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date(now);
      dayDate.setDate(now.getDate() - i);
      const name = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
      // Format as YYYY-MM-DD using local time to avoid UTC mismatch
      const m = String(dayDate.getMonth() + 1).padStart(2, '0');
      const d = String(dayDate.getDate()).padStart(2, '0');
      const dayStr = `${dayDate.getFullYear()}-${m}-${d}`;
      const count = tickets?.filter(t => t.createdAt && t.createdAt.toString().startsWith(dayStr)).length || 0;
      daysData.push({ name, tickets: count });
    }
    return daysData;
  }, [tickets]);

  const statusData = useMemo(() => {
    const open = stats?.openTickets ?? 0;
    const inProgress = stats?.inProgressTickets ?? 0;
    const completed = (stats?.resolvedTickets ?? 0) + (stats?.closedTickets ?? 0);
    return [
      { name: 'Open', value: open, color: '#f43f5e' },
      { name: 'In Progress', value: inProgress, color: '#f59e0b' },
      { name: 'Completed', value: completed, color: '#10b981' },
    ];
  }, [stats]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Dashboard" />

        <main className="flex-1 overflow-y-auto p-4 md:px-6 md:pt-6 md:pb-0 scrollbar-thin">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1400px] mx-auto space-y-4">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
               <div>
                  <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
                    Welcome back, {user?.name?.split(' ')[0] || user?.username}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Here is what's happening with your projects today.</p>
               </div>
               <Link href="/tickets/new">
                 <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2">
                   <Plus className="h-4 w-4" /> Create Ticket
                 </Button>
               </Link>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Open Tickets", val: stats?.openTickets, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
                { title: "In Progress", val: stats?.inProgressTickets, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
                { title: "SLA Reliability", val: stats?.slaComplianceRate || "N/A", icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50" },
                { title: "Avg. Resolution", val: stats?.avgResponseTime || "N/A", icon: Zap, color: "text-blue-600", bg: "bg-blue-50" }
              ].map((s, i) => (
                <Card key={i} className="border border-slate-200 shadow-sm transition-shadow hover:shadow-md h-full">
                   <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                         <div>
                            <p className="text-sm font-medium text-slate-500">{s.title}</p>
                            <div className="mt-2 flex items-baseline gap-2">
                               {isLoadingStats ? <Skeleton className="h-8 w-16" /> : <h3 className="text-3xl font-bold text-slate-900">{s.val || 0}</h3>}
                            </div>
                         </div>
                         <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", s.bg, s.color)}>
                            <s.icon size={24} />
                         </div>
                      </div>
                   </CardContent>
                </Card>
              ))}
            </div>

            {/* Analysis & Activity Row */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Ticket Volume Chart - 8 cols */}
              <div className="lg:col-span-8">
                <Card className="border border-slate-200 shadow-sm h-full flex flex-col">
                  <CardHeader className="p-6 border-b border-slate-100 flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">Weekly Ticket Volume</CardTitle>
                      <CardDescription className="text-sm">Incoming issues over the last 7 days</CardDescription>
                    </div>
                    <BarChart3 className="h-5 w-5 text-slate-400" />
                  </CardHeader>
                  <CardContent className="p-4 flex-1 h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Status Breakdown - 4 cols */}
              <div className="lg:col-span-4">
                <Card className="border border-slate-200 shadow-sm h-full flex flex-col">
                  <CardHeader className="p-6 border-b border-slate-100">
                    <CardTitle className="text-lg font-semibold text-slate-900">Status Distribution</CardTitle>
                    <CardDescription className="text-sm">Current breakdown of active workload</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 flex flex-col justify-center items-center">
                     <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                        </PieChart>
                      </ResponsiveContainer>
                     </div>
                     <div className="flex gap-4 mt-6 justify-center w-full">
                       {statusData.map((s, i) => (
                         <div key={i} className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2">
                               <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                               <span className="text-xs font-medium text-slate-600">{s.name}</span>
                            </div>
                            <span className="text-lg font-semibold">{s.value}</span>
                         </div>
                       ))}
                     </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom Row - Mixed Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Recent Tickets */}
              <div className="lg:col-span-8">
                <Card className="border border-slate-200 shadow-sm h-full">
                  <CardHeader className="px-6 py-5 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-900">Recent Tickets</CardTitle>
                    <Link href={isAdmin ? "/all-tickets" : "/tickets"} className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">View All</Link>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoadingTickets ? (
                      <div className="p-4 space-y-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                      </div>
                    ) : tickets && tickets.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {tickets.slice(0, 4).map((ticket) => (
                          <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                            <div className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors cursor-pointer group group-hover:bg-slate-50">
                              <div className="flex items-center gap-4 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                   <FileText className="h-4 w-4 text-slate-500" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{ticket.title}</span>
                                  <span className="text-xs text-slate-500 mt-0.5">{formatDate(ticket.createdAt as unknown as string)} · #{ticket.id}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                 <Badge variant="outline" className={cn("text-xs font-medium px-2.5 py-0.5", getStatusBadgeClass(ticket.status))}>
                                    {ticket.status}
                                 </Badge>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-center px-4">
                        <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300">
                           <LifeBuoy className="h-6 w-6" />
                        </div>
                        <h4 className="text-base font-medium text-slate-900">No recent tickets</h4>
                        <p className="text-sm text-slate-500 mt-1">When you create or receive tickets, they'll appear here.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Useful Links / Resources */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Knowledge Base Teaser */}
                <Card className="border border-slate-200 shadow-sm">
                  <CardHeader className="px-6 py-5 border-b border-slate-100">
                    <CardTitle className="text-lg font-semibold text-slate-900">Quick Resources</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-1">
                    {isLoadingFaqs ? (
                       Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)
                    ) : faqs && faqs.length > 0 ? (
                      faqs.slice(0, 4).map((faq) => (
                        <Link key={faq.id} href={`/knowledge-base?faq=${faq.id}`}>
                          <div className="p-3 rounded-lg hover:bg-slate-50 flex items-start gap-3 cursor-pointer group">
                             <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></div>
                             <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 line-clamp-2 leading-tight">{faq.question}</p>
                          </div>
                        </Link>
                      ))
                    ) : <p className="text-center text-sm text-slate-500 py-6">No articles available.</p>}
                  </CardContent>
                  <div className="p-4 pt-0">
                     <Link href="/knowledge-base" className="block">
                        <Button variant="outline" className="w-full text-sm">View Knowledge Base</Button>
                     </Link>
                  </div>
                </Card>

                {/* Settings / Site Engg promo */}
                {user?.role === 'admin' && (
                  <Card className="bg-slate-900 text-white shadow-md border-none overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Settings size={80} />
                     </div>
                     <CardContent className="p-6 relative z-10">
                        <h3 className="text-lg font-semibold mb-2">Admin Configuration</h3>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">Access the operations center to configure advanced systems and tools.</p>
                        <Link href="/site-engg" className="block">
                           <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 text-sm font-medium">
                              Open Settings
                           </Button>
                        </Link>
                     </CardContent>
                  </Card>
                )}
                
              </div>
            </div>

          </motion.div>
        </main>
      </div>
    </div>
  );
}
