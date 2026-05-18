import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  BarChart,
} from 'recharts';
import {
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  TrendingUp,
  Zap,
  BarChart as BarChartIcon
} from "lucide-react";
import { DashboardStats, Ticket as TicketType } from "@shared/schema";

export default function DashboardPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();

  // Fetch dashboard stats - role-based access
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard");
      return await res.json();
    },
    enabled: !!user,
  });

  // Fetch recent tickets - role-based access
  const { data: tickets, isLoading: isLoadingTickets } = useQuery<TicketType[]>({
    queryKey: user?.role === "user" ? ["/api/tickets/my"] : ["/api/tickets"],
    queryFn: async () => {
      const endpoint = user?.role === "user" ? "/api/tickets/my" : "/api/tickets";
      const res = await apiRequest("GET", endpoint);
      return await res.json();
    },
    enabled: !!user,
  });

  // Get status color based on ticket status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Format date
  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar for larger screens, or as a slide-over for mobile */}
      {isMobile ? (
        <Sidebar isMobile isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      ) : (
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => isMobile ? setSidebarOpen(!sidebarOpen) : setSidebarCollapsed(!sidebarCollapsed)} title={(user?.role === "admin" ? "Admin" : user?.role === "agent" ? "Agent" : "User") + " Dashboard"} />

        {/* Main content scrollable area */}
                {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-slate-50/50">
          
          {/* Top Banner section */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#1976d2] to-[#64b5f6] rounded-3xl p-8 text-white shadow-2xl shadow-blue-200/50">
            <div className="relative z-10">
              <p className="text-blue-100 font-medium mb-1">Welcome back,</p>
              <h2 className="text-3xl font-bold mb-2">{user?.name || "Admin User"}</h2>
              <p className="text-blue-100/80">Here's what's happening with your support tickets today</p>
            </div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
                <Link href="/tickets/new">
                    <Button size="lg" className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-md rounded-xl px-6">
                        <Plus className="mr-2 h-5 w-5" />
                        New Ticket
                    </Button>
                </Link>
            </div>
            {/* Abstract shapes */}
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
          </div>

          {/* Stats Grid - DYNAMIC FROM REAL DATA */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Open Tickets</p>
                    <div className="text-3xl font-black text-slate-900">{isLoadingStats ? <Skeleton className="h-9 w-12" /> : stats?.openTickets ?? 0}</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">In Progress</p>
                    <div className="text-3xl font-black text-slate-900">{isLoadingStats ? <Skeleton className="h-9 w-12" /> : stats?.inProgressTickets ?? 0}</div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-2xl text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">SLA Reliability</p>
                    <div className="text-3xl font-black text-slate-900">{isLoadingStats ? <Skeleton className="h-9 w-12" /> : stats?.slaComplianceRate ?? 'N/A'}</div>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-slate-100 rounded-3xl overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold mb-1">Avg. Resolution</p>
                    <div className="text-3xl font-black text-slate-900">{isLoadingStats ? <Skeleton className="h-9 w-12" /> : stats?.avgResponseTime ?? 'N/A'}</div>
                  </div>
                  <div className="bg-cyan-50 p-3 rounded-2xl text-cyan-600 transition-colors group-hover:bg-cyan-600 group-hover:text-white">
                    <Zap className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Ticket Volume Area Chart - uses real ticket data */}
            <Card className="xl:col-span-2 border-none shadow-2xl shadow-slate-100 rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 pb-0">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-slate-800 flex items-center drop-shadow-sm">
                                <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                                Weekly Ticket Volume
                            </CardTitle>
                            <CardDescription className="text-slate-400 mt-1">Incoming issues over the last 7 days</CardDescription>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold"><BarChartIcon className="h-4 w-4"/></div>
                    </div>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(() => {
                              const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
                              const now = new Date();
                              return days.map((name, i) => {
                                const dayDate = new Date(now);
                                dayDate.setDate(now.getDate() - (6 - i));
                                const dayStr = dayDate.toISOString().slice(0,10);
                                const count = tickets?.filter(t => t.createdAt && t.createdAt.toString().startsWith(dayStr)).length || 0;
                                return { name, tickets: count };
                              });
                            })()}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                                <RechartsTooltip 
                                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                />
                                <Area type="monotone" dataKey="tickets" stroke="#1976d2" strokeWidth={3} fill="#1976d233" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Status Distribution Pie Chart - uses real stats */}
            <Card className="border-none shadow-2xl shadow-slate-100 rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 pb-0">
                    <CardTitle className="text-slate-800 flex items-center">
                        <Zap className="h-5 w-5 mr-2 text-primary" />
                        Status Distribution
                    </CardTitle>
                    <CardDescription className="text-slate-400 mt-1">Current breakdown of active workload</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Open', value: stats?.openTickets || 0 },
                                        { name: 'In Progress', value: stats?.inProgressTickets || 0 },
                                        { name: 'Completed', value: (stats?.resolvedTickets || 0) + (stats?.closedTickets || 0) },
                                    ].filter(d => d.value > 0)}
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {['#ef4444','#f59e0b','#10b981'].map((color, index) => (
                                        <Cell key={index} fill={color} stroke="none" />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>Open<span className="ml-1 text-slate-900">{stats?.openTickets || 0}</span></div>
                        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>In Progress<span className="ml-1 text-slate-900">{stats?.inProgressTickets || 0}</span></div>
                        <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>Completed<span className="ml-1 text-slate-900">{(stats?.resolvedTickets || 0) + (stats?.closedTickets || 0)}</span></div>
                    </div>
                </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Recent Tickets Table */}
              <Card className="xl:col-span-2 border-none shadow-2xl shadow-slate-100 rounded-[2rem] overflow-hidden">
                <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-slate-800 font-black">Recent Tickets</CardTitle>
                    <Link href={user?.role === "user" ? "/my-tickets" : "/all-tickets"} className="text-xs font-bold text-blue-600 hover:underline flex items-center">View All <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </CardHeader>
                <CardContent className="px-8 pb-8">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] uppercase tracking-widest text-slate-400 font-bold border-b border-slate-50">
                                <tr>
                                    <th className="pb-4 pt-0">ID</th>
                                    <th className="pb-4 pt-0">Title</th>
                                    <th className="pb-4 pt-0">Status</th>
                                    <th className="pb-4 pt-0">Priority</th>
                                    <th className="pb-4 pt-0">Created</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {isLoadingTickets ? (
                                    <tr><td colSpan={5} className="py-8"><Skeleton className="w-full h-20" /></td></tr>
                                ) : tickets && tickets.length > 0 ? (
                                    tickets.slice(0, 5).map((t) => (
                                        <tr key={t.id} className="border-b border-slate-50/50 group/row hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 font-bold text-slate-400 text-xs">TKT-{t.id.toString().padStart(4, '0')}</td>
                                            <td className="py-4 font-semibold text-slate-700 group-hover/row:text-primary transition-colors cursor-pointer truncate max-w-[200px]">
                                                <Link href={`/tickets/${t.id}`}>{t.title}</Link>
                                            </td>
                                            <td className="py-4">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter",
                                                    t.status === 'open' ? 'bg-red-50 text-red-600' : 
                                                    t.status === 'in_progress' ? 'bg-amber-50 text-amber-600' : 
                                                    'bg-slate-100 text-slate-500'
                                                )}>
                                                    {t.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="py-4">
                                                <span className="text-[11px] font-bold text-slate-500 capitalize">{t.priority || 'Medium'}</span>
                                            </td>
                                            <td className="py-4 text-slate-400 text-xs font-medium">{(t.createdAt ? new Date(t.createdAt).toLocaleString() : "N/A")}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={5} className="py-20 text-center"><p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No tickets yet. Create your first one!</p><Link href="/tickets/new"><Button className="mt-4 bg-primary px-8 rounded-xl shadow-lg shadow-primary/20"><Plus className="mr-2" />Create Ticket</Button></Link></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
              </Card>

              <div className="space-y-8">
                  {/* SLA Compliance - dynamic */}
                  <Card className="border-none shadow-2xl shadow-slate-100 rounded-[2rem] overflow-hidden bg-white">
                      <CardHeader className="p-8 pb-4">
                          <CardTitle className="text-slate-800 flex items-center justify-between text-base">
                              <div className="flex items-center"><BarChartIcon className="h-4 w-4 mr-2 text-emerald-500" /> Quick Resources</div>
                          </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 pt-4 grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 text-center">
                              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total</div>
                              <div className="text-sm font-black text-slate-700">{stats?.totalTickets ?? 0}</div>
                              <div className="text-[9px] text-emerald-600 font-bold">tickets</div>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100 text-center">
                              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Resolution</div>
                              <div className="text-sm font-black text-slate-700">{stats?.avgResponseTime ?? 'N/A'}</div>
                              <div className="text-[9px] text-amber-600 font-bold">avg time</div>
                          </div>
                      </CardContent>
                  </Card>

                  {/* FAQs */}
                  <Card className="border-none shadow-2xl shadow-slate-100 rounded-[2rem] overflow-hidden">
                      <CardHeader className="p-8 pb-4">
                          <CardTitle className="text-slate-800 text-sm font-bold uppercase tracking-widest">Popular FAQs</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 pt-0 space-y-4">
                          {[
                            "How do I reset my password?",
                            "How do I access company VPN?",
                            "How do I connect to system Wi-Fi?"
                          ].map((faq, i) => (
                            <div key={i} className="group cursor-pointer">
                                <p className="text-xs font-bold text-slate-700 group-hover:text-primary transition-colors line-clamp-1">{faq}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Category #{i+1}</p>
                            </div>
                          ))}
                          <div className="pt-4 text-center">
                              <Link href="/knowledge-base" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary">View knowledge base <ArrowRight className="inline h-3 w-3 ml-1" /></Link>
                          </div>
                      </CardContent>
                  </Card>
              </div>
          </div>
        </main>
      </div>
    </div>
  );
}






