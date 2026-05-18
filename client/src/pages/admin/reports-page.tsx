import { useState, useRef, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasAnyRole } from "@/lib/role-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { PaginationControls } from "@/components/common/pagination-controls";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Upload, AlertCircle, CheckCircle, BarChart2, TrendingUp, PieChart as PieIcon, Users as UsersIcon, Calendar, Filter, Clock, Shield, Zap, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ImportDialog } from "@/components/ui/import-dialog";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Define types locally instead of importing from schema
type PriorityStat = {
  priority: string;
  slaRate: number;
};

type DashboardStats = {
  summary?: {
    total?: number;
    open?: number;
    closed?: number;
    inProgress?: number;
  };
  avgResponseTime?: string;
  slaComplianceRate?: string;
  priorityStats?: PriorityStat[];
};

type Category = {
  id: number;
  name: string;
  parent_id?: number;
};

function exportToCSV(data: any[], filename = 'report.csv') {
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [Object.keys(data[0]).join(','), ...data.map(row => Object.values(row).join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#ec4899', '#84cc16', '#0ea5e9'];

export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [agentPerformancePage, setAgentPerformancePage] = useState(1);
  const AGENT_PERFORMANCE_ITEMS_PER_PAGE = 5;
  const [dateRange, setDateRange] = useState("30days");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [agentFilter, setAgentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assignedToFilter, setAssignedToFilter] = useState("all");
  const [createdByFilter, setCreatedByFilter] = useState("all");
  const [createdDateFrom, setCreatedDateFrom] = useState("");
  const [createdDateTo, setCreatedDateTo] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = window.innerWidth < 768;

  // Build filter object for API calls
  const buildFilters = () => {
    const filters: any = {};
    if (dateRange && dateRange !== "all") filters.dateRange = dateRange;
    if (statusFilter && statusFilter !== "all") filters.status = statusFilter;
    if (priorityFilter && priorityFilter !== "all") filters.priority = priorityFilter;
    if (categoryFilter && categoryFilter !== "all") filters.categoryId = parseInt(categoryFilter);
    return filters;
  };

  // Fetch comprehensive dashboard stats with filters
  const { data: stats, isLoading: isLoadingStats } = useQuery<DashboardStats>({
    queryKey: [
      "/api/reports",
      dateRange,
      categoryFilter,
      statusFilter,
      priorityFilter,
      assignedToFilter,
      createdByFilter,
      createdDateFrom,
      createdDateTo,
      dueDateFrom,
      dueDateTo,
    ],
    queryFn: async () => {
      // Build query string from filters
      const params = new URLSearchParams();
      if (dateRange && dateRange !== "all") params.append("dateRange", dateRange);
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter && priorityFilter !== "all") params.append("priority", priorityFilter);
      if (assignedToFilter && assignedToFilter !== "all") params.append("assignedTo", assignedToFilter);
      if (createdByFilter && createdByFilter !== "all") params.append("createdBy", createdByFilter);
      if (createdDateFrom) params.append("createdDateFrom", createdDateFrom);
      if (createdDateTo) params.append("createdDateTo", createdDateTo);
      if (dueDateFrom) params.append("dueDateFrom", dueDateFrom);
      if (dueDateTo) params.append("dueDateTo", dueDateTo);

      const res = await apiRequest("GET", `/api/reports?${params.toString()}`);
      return await res.json();
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch ticket volume trend data
  const { data: ticketVolumeData, isLoading: isLoadingVolume } = useQuery({
    queryKey: [
      "/api/reports/volume",
      dateRange,
      categoryFilter,
      statusFilter,
      priorityFilter,
      agentFilter,
      createdByFilter,
      assignedToFilter,
      createdDateFrom,
      createdDateTo,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("type", "volume");
      if (dateRange && dateRange !== "all") params.append("dateRange", dateRange);
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter && priorityFilter !== "all") params.append("priority", priorityFilter);
      if (agentFilter && agentFilter !== "all") params.append("agent", agentFilter);
      if (createdByFilter && createdByFilter !== "all") params.append("createdBy", createdByFilter);
      if (assignedToFilter && assignedToFilter !== "all") params.append("assignedTo", assignedToFilter);
      if (createdDateFrom) params.append("createdDateFrom", createdDateFrom);
      if (createdDateTo) params.append("createdDateTo", createdDateTo);

      const res = await apiRequest("GET", `/api/reports?${params.toString()}`);
      return await res.json();
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
    refetchInterval: 30000,
  });

  // Fetch resolution time data
  const { data: resolutionTimeData, isLoading: isLoadingResolution } = useQuery({
    queryKey: [
      "/api/reports/resolution",
      dateRange,
      categoryFilter,
      statusFilter,
      priorityFilter,
      agentFilter,
      createdByFilter,
      assignedToFilter,
      createdDateFrom,
      createdDateTo,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("type", "resolution");
      if (dateRange && dateRange !== "all") params.append("dateRange", dateRange);
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter && priorityFilter !== "all") params.append("priority", priorityFilter);
      if (agentFilter && agentFilter !== "all") params.append("agent", agentFilter);
      if (createdByFilter && createdByFilter !== "all") params.append("createdBy", createdByFilter);
      if (assignedToFilter && assignedToFilter !== "all") params.append("assignedTo", assignedToFilter);
      if (createdDateFrom) params.append("createdDateFrom", createdDateFrom);
      if (createdDateTo) params.append("createdDateTo", createdDateTo);

      const res = await apiRequest("GET", `/api/reports?${params.toString()}`);
      return await res.json();
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
    refetchInterval: 30000,
  });

  // Fetch category distribution data
  const { data: categoryData, isLoading: isLoadingCategories } = useQuery({
    queryKey: [
      "/api/reports/categories",
      dateRange,
      statusFilter,
      priorityFilter,
      agentFilter,
      createdByFilter,
      assignedToFilter,
      createdDateFrom,
      createdDateTo,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("type", "categories");
      if (dateRange && dateRange !== "all") params.append("dateRange", dateRange);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter && priorityFilter !== "all") params.append("priority", priorityFilter);
      if (agentFilter && agentFilter !== "all") params.append("agent", agentFilter);
      if (createdByFilter && createdByFilter !== "all") params.append("createdBy", createdByFilter);
      if (assignedToFilter && assignedToFilter !== "all") params.append("assignedTo", assignedToFilter);
      if (createdDateFrom) params.append("createdDateFrom", createdDateFrom);
      if (createdDateTo) params.append("createdDateTo", createdDateTo);

      const res = await apiRequest("GET", `/api/reports?${params.toString()}`);
      return await res.json();
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
    refetchInterval: 30000,
  });

  // Fetch SLA compliance data
  const { data: slaComplianceData, isLoading: isLoadingSLA } = useQuery({
    queryKey: [
      "/api/reports/sla",
      dateRange,
      categoryFilter,
      priorityFilter,
      agentFilter,
      createdByFilter,
      assignedToFilter,
      createdDateFrom,
      createdDateTo,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("type", "sla");
      if (dateRange && dateRange !== "all") params.append("dateRange", dateRange);
      if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
      if (priorityFilter && priorityFilter !== "all") params.append("priority", priorityFilter);
      if (agentFilter && agentFilter !== "all") params.append("agent", agentFilter);
      if (createdByFilter && createdByFilter !== "all") params.append("createdBy", createdByFilter);
      if (assignedToFilter && assignedToFilter !== "all") params.append("assignedTo", assignedToFilter);
      if (createdDateFrom) params.append("createdDateFrom", createdDateFrom);
      if (createdDateTo) params.append("createdDateTo", createdDateTo);

      const res = await apiRequest("GET", `/api/reports?${params.toString()}`);
      return await res.json();
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
    refetchInterval: 30000,
  });

  // Fetch users for filters - Updated to get agents/admins only
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ["/api/users", "simple"],
    queryFn: async () => {
      try {
        console.log("Fetching agents from /api/users...");
        const res = await apiRequest("GET", "/api/users?simple=true");

        if (!res.ok) {
          console.error("Users API failed:", res.status, res.statusText);
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log("Simple users API response:", data);

        if (!Array.isArray(data)) {
          console.error("Users API returned non-array:", data);
          return [];
        }

        // Filter to only agents and admins
        const filteredUsers = data.filter((user: any) =>
          hasAnyRole(user.role, ['admin', 'agent'])
        );
        console.log("Filtered agents/admins:", filteredUsers);
        return filteredUsers;
      } catch (error) {
        console.error("Users query error:", error);
        return [];
      }
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
    retry: 1,
  });

  // Separate query for all users (for Created By filter)
  const { data: allUsers } = useQuery({
    queryKey: ["/api/users", "all"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
  });

  // Add categories query for filter dropdowns
  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/categories");
      return await res.json();
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
  });

  // Enhanced agent performance query with better error handling
  const { data: agentPerformanceData, isLoading: isLoadingAgents, error: agentError } = useQuery({
    queryKey: [
      "agent-performance",
      dateRange,
      categoryFilter,
      agentFilter,
      statusFilter,
      priorityFilter,
      assignedToFilter,
      createdByFilter,
      createdDateFrom,
      createdDateTo
    ],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.append("type", "performance");

        // Add all filter parameters
        if (dateRange && dateRange !== "all") params.append("dateRange", dateRange);
        if (categoryFilter && categoryFilter !== "all") params.append("category", categoryFilter);
        if (agentFilter && agentFilter !== "all") params.append("agent", agentFilter);
        if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
        if (priorityFilter && priorityFilter !== "all") params.append("priority", priorityFilter);
        if (assignedToFilter && assignedToFilter !== "all") params.append("assignedTo", assignedToFilter);
        if (createdByFilter && createdByFilter !== "all") params.append("createdBy", createdByFilter);
        if (createdDateFrom) params.append("createdDateFrom", createdDateFrom);
        if (createdDateTo) params.append("createdDateTo", createdDateTo);

        const url = `/api/reports?${params.toString()}`;
        console.log("Agent Performance API URL:", url);

        const res = await apiRequest("GET", url);
        console.log("Agent Performance Response Status:", res.status, res.statusText);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("Agent Performance API Error Response:", errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const data = await res.json();
        console.log("Agent Performance Data:", data);

        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Agent Performance Query Error:", error);
        throw error;
      }
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]),
    retry: 1,
  });

  // Add detailed error logging
  console.log("Agent Performance Debug:", {
    isLoading: isLoadingAgents,
    error: agentError,
    errorMessage: agentError?.message,
    data: agentPerformanceData,
    hasData: agentPerformanceData && Array.isArray(agentPerformanceData) && agentPerformanceData.length > 0
  });

  console.log("Users Query Status:", {
    isLoading: isLoadingUsers,
    error: usersError,
    users: users,
    usersCount: users?.length || 0
  });

  // Simulate date range filtering (last N months) - FIX: Add null checks
  const rangeMap = {
    "7days": 3,
    "30days": 5,
    "90days": 7,
  };

  // FIX: Add proper null/undefined checks for all data arrays - MOVED INSIDE COMPONENT
  // IMPORTANT: Define safe data arrays BEFORE using them in calculations
  const safeTicketVolumeData = Array.isArray(ticketVolumeData) ? ticketVolumeData : [];
  const safeResolutionTimeData = Array.isArray(resolutionTimeData) ? resolutionTimeData : [];
  const safeCategoryData = Array.isArray(categoryData) ? categoryData : [];
  const safeAgentPerformanceData = Array.isArray(agentPerformanceData) ? agentPerformanceData : [];

  const filteredTicketVolumeData = Array.isArray(ticketVolumeData)
    ? ticketVolumeData.slice(-((rangeMap as any)[dateRange] || 6))
    : [];

  // Agent Performance Pagination
  const agentPerformanceTotalPages = Math.ceil((safeAgentPerformanceData?.length || 0) / AGENT_PERFORMANCE_ITEMS_PER_PAGE);
  const agentPerformanceStartIndex = (agentPerformancePage - 1) * AGENT_PERFORMANCE_ITEMS_PER_PAGE;
  const agentPerformanceEndIndex = agentPerformanceStartIndex + AGENT_PERFORMANCE_ITEMS_PER_PAGE;
  const paginatedAgentPerformanceData = safeAgentPerformanceData?.slice(agentPerformanceStartIndex, agentPerformanceEndIndex) || [];

  // Fix category filtering logic - FIX: Add null checks - MOVED INSIDE COMPONENT
  const filteredCategoryData = Array.isArray(categoryData)
    ? (categoryFilter === "all"
      ? categoryData
      : categoryData.filter((item: { name: any; }) => {
        const categoryMap = {
          "network": "Network Issues",
          "hardware": "Hardware",
          "email": "Email Services"
        };
        return item.name === (categoryMap as any)[categoryFilter];
      }))
    : [];

  // Filter other data based on category - FIX: Add null checks - MOVED INSIDE COMPONENT
  const filteredResolutionTimeData = Array.isArray(resolutionTimeData)
    ? (categoryFilter === "all"
      ? resolutionTimeData
      : resolutionTimeData.filter((item: { name: any; }) => {
        const categoryMap = {
          "network": "Network",
          "hardware": "Hardware",
          "email": "Email"
        };
        return item.name === (categoryMap as any)[categoryFilter];
      }))
    : [];

  // Import functionality - Handle file upload
  const handleImportFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiRequest("POST", "/api/reports?action=import", formData);

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Import Successful",
          description: `${result.imported || 0} tickets imported successfully`,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
        setShowImportDialog(false);
      } else {
        const errorData = await response.json();
        toast({
          title: "Import Failed",
          description: errorData.message || "Failed to import tickets",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Error",
        description: "An error occurred while importing tickets",
        variant: "destructive"
      });
    }
  };

  // Export functionality - Updated to use correct API endpoint
  const handleExportReport = async () => {
    try {
      // Set responseType to 'blob' for file downloads
      const response = await apiRequest("GET", "/api/reports?action=export&format=csv", null, true);

      if (response.ok) {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Extract filename from response headers or use default
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `tickets_export_${new Date().toISOString().split('T')[0]}.csv`;

        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: "Tickets have been exported successfully",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Export Failed",
          description: errorData.message || "Failed to export tickets",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Error",
        description: "An error occurred while exporting tickets",
        variant: "destructive"
      });
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setDateRange("30days");
    setCompanyFilter("all");
    setAgentFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setAssignedToFilter("all");
    setCreatedByFilter("all");
    setCategoryFilter("all");
    setCreatedDateFrom("");
    setCreatedDateTo("");
    setDueDateFrom("");
    setDueDateTo("");
  };

  // Rest of your component JSX remains the same...
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar for larger screens, or as a slide-over for mobile */}
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Reports" />

        {/* Main content scrollable area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/30">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">
                    {hasAnyRole(user?.role, ["admin"]) ? "Admin" : "Agent"} Analytics
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">
                    Detailed system performance and support trends
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                 <Button variant="outline" onClick={() => setShowImportDialog(true)} className="rounded-xl border-slate-200 shadow-sm hover:bg-slate-50">
                   <Upload className="mr-2 h-4 w-4" /> Import
                 </Button>
                 <Button onClick={handleExportReport} className="bg-slate-900 hover:bg-black text-white rounded-xl shadow-lg shadow-slate-200">
                   <Download className="mr-2 h-4 w-4" /> Export Report
                 </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { title: "Total Tickets", val: stats?.summary?.total, icon: BarChart2, color: "text-blue-600", bg: "bg-blue-50" },
              { title: "Open Tickets", val: stats?.summary?.open, icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50" },
              { title: "Avg. Resolution", val: stats?.avgResponseTime || "-", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
              { title: "SLA Reliability", val: stats?.slaComplianceRate || "-", icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50" }
            ].map((s, i) => (
              <Card key={i} className="border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 rounded-2xl overflow-hidden">
                 <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                       <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{s.title}</p>
                          <div className="mt-2 flex items-baseline gap-2">
                             {isLoadingStats ? <Skeleton className="h-8 w-16" /> : <h3 className="text-2xl font-bold text-slate-900">{s.val || 0}</h3>}
                          </div>
                       </div>
                       <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", s.bg, s.color)}>
                          <s.icon size={22} />
                       </div>
                    </div>
                 </CardContent>
              </Card>
            ))}
          </div>

          {/* Role-based access check */}
          {(!user || !hasAnyRole(user?.role, ["admin", "agent"])) && (
            <Card className="mb-6">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-500">Reports are only available for admins and agents.</p>
              </CardContent>
            </Card>
          )}

          {user && hasAnyRole(user?.role, ["admin", "agent"]) && (
            <>
              <Card className="mb-8 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                   <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wider">Report Filters</CardTitle>
                   </div>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Timeframe
                      </label>
                      <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 rounded-xl h-11">
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="all">All Time</SelectItem>
                          <SelectItem value="7days">Last 7 Days</SelectItem>
                          <SelectItem value="30days">Last 30 Days</SelectItem>
                          <SelectItem value="90days">Last 90 Days</SelectItem>
                          <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Filter className="h-3 w-3" />
                        Company
                      </label>
                      <Select value={companyFilter} onValueChange={setCompanyFilter}>
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 rounded-xl h-11">
                          <SelectValue placeholder="All Companies" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="all">All Companies</SelectItem>
                          <SelectItem value="company1">Tech Corp</SelectItem>
                          <SelectItem value="company2">Business Inc</SelectItem>
                          <SelectItem value="company3">Startup Ltd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <UsersIcon className="h-3 w-3" />
                        Agent
                      </label>
                      <Select value={agentFilter} onValueChange={setAgentFilter}>
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 rounded-xl h-11">
                          <SelectValue placeholder="All Agents" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="all">All Agents</SelectItem>
                          {users && Array.isArray(users) && users.length > 0 ? (
                            users.map((agent: any) => (
                              <SelectItem key={`agent-${agent.id}`} value={agent.id.toString()}>
                                {agent.name.split(' ')[0]}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No agents</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        Status
                      </label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 rounded-xl h-11">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Shield className="h-3 w-3" />
                        Priority
                      </label>
                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 rounded-xl h-11">
                          <SelectValue placeholder="All Priority" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="all">All Priority</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <UsersIcon className="h-3 w-3" />
                        Assigned To
                      </label>
                      <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 rounded-xl h-11">
                          <SelectValue placeholder="All Assignees" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="all">All Assignees</SelectItem>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users && Array.isArray(users) && users.length > 0 ? (
                            users.map((agent: any) => (
                              <SelectItem key={`assigned-${agent.id}`} value={agent.id.toString()}>
                                {agent.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No assignees</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <UsersIcon className="h-3 w-3" />
                        Created By
                      </label>
                      <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 rounded-xl h-11">
                          <SelectValue placeholder="All Creators" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="all">All Creators</SelectItem>
                          {allUsers && Array.isArray(allUsers) && allUsers.length > 0 ? (
                            allUsers.slice(0, 10).map((user: any) => (
                              <SelectItem key={`creator-${user.id}`} value={user.id.toString()}>
                                {user.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="loading" disabled>Loading...</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Filter className="h-3 w-3" />
                        Category
                      </label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full bg-slate-50/50 border-slate-200 rounded-xl h-11">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200">
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories && Array.isArray(categories) && categories.length > 0 ? (
                            categories
                              .filter((cat) => !cat.parent_id)
                              .map((category) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))
                          ) : (
                            <SelectItem value="none" disabled>No categories</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {dateRange === 'custom' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-slate-100 mt-6 pt-6 overflow-hidden"
                    >
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Custom Date Selection</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-2">Created From</label>
                          <Input
                            type="date"
                            value={createdDateFrom}
                            onChange={(e) => setCreatedDateFrom(e.target.value)}
                            className="bg-slate-50 border-slate-200 rounded-xl h-11 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-2">Created To</label>
                          <Input
                            type="date"
                            value={createdDateTo}
                            onChange={(e) => setCreatedDateTo(e.target.value)}
                            className="bg-slate-50 border-slate-200 rounded-xl h-11 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-2">Due Date From</label>
                          <Input
                            type="date"
                            value={dueDateFrom}
                            onChange={(e) => setDueDateFrom(e.target.value)}
                            className="bg-slate-50 border-slate-200 rounded-xl h-11 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-2">Due Date To</label>
                          <Input
                            type="date"
                            value={dueDateTo}
                            onChange={(e) => setDueDateTo(e.target.value)}
                            className="bg-slate-50 border-slate-200 rounded-xl h-11 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex justify-between items-center mt-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        Use filters above to customize your report data
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={resetFilters}>
                        Reset Filters
                      </Button>

                      <Button variant="outline" onClick={() => setShowImportDialog(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Data
                      </Button>

                      <Button onClick={handleExportReport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Overview Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-slate-100 p-6">
                    <CardTitle className="text-lg flex items-center gap-2 font-semibold text-slate-800">
                       <TrendingUp className="h-5 w-5 text-blue-500" />
                       Ticket Volume Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-80">
                      {isLoadingVolume ? (
                        <div className="flex items-center justify-center h-full">
                          <Skeleton className="h-full w-full rounded-xl" />
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={filteredTicketVolumeData || []}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="tickets"
                              stroke="#2563eb"
                              strokeWidth={3}
                              dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                              activeDot={{ r: 6, strokeWidth: 0 }}
                              name="Tickets"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-slate-100 p-6">
                    <CardTitle className="text-lg flex items-center gap-2 font-semibold text-slate-800">
                       <BarChart2 className="h-5 w-5 text-indigo-500" />
                       Resolution Time by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-80">
                      {isLoadingResolution ? (
                        <div className="flex items-center justify-center h-full">
                          <Skeleton className="h-full w-full rounded-xl" />
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={filteredResolutionTimeData || []}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar
                              dataKey="avgTime"
                              fill="#6366f1"
                              radius={[6, 6, 0, 0]}
                              name="Avg Hours"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category Distribution and Team Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Category Distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                       <PieIcon className="h-4 w-4 text-emerald-500" />
                       Ticket Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="h-64 flex items-center justify-center relative">
                      {isLoadingCategories ? (
                        <Skeleton className="h-48 w-48 rounded-full" />
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={filteredCategoryData || []}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={2}
                                dataKey="count"
                                stroke="none"
                              >
                                {(filteredCategoryData || []).map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontWeight: 600 }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Center Text */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                            <span className="text-3xl font-bold text-slate-800">
                              {(filteredCategoryData || []).reduce((acc: number, item: any) => acc + (item.count || 0), 0)}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Total</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-4 max-h-[160px] overflow-y-auto pr-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
                      {(filteredCategoryData || []).map((item: any, index: number) => {
                        const total = (filteredCategoryData || []).reduce((acc: number, curr: any) => acc + (curr.count || 0), 0) || 1;
                        const percentage = Math.round((item.count / total) * 100);
                        return (
                          <div key={item.name} className="group">
                            <div className="flex justify-between items-center mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]" title={item.name}>{item.name}</span>
                              </div>
                              <span className="text-xs font-bold text-slate-900">
                                {item.count} <span className="text-slate-400 font-medium ml-1">({percentage}%)</span>
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{
                                  backgroundColor: COLORS[index % COLORS.length],
                                  width: `${percentage}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Agent Performance - Keep existing implementation */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                       <UsersIcon className="h-4 w-4 text-orange-500" />
                       Agent Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Time</th>
                            <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SLA Met</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoadingAgents ? (
                            // Loading skeleton rows
                            Array.from({ length: 3 }).map((_, index) => (
                              <tr key={`skeleton-${index}`} className="border-b border-gray-100">
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <Skeleton className="w-8 h-8 rounded-full mr-2" />
                                    <Skeleton className="h-4 w-24" />
                                  </div>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <Skeleton className="h-4 w-8" />
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <Skeleton className="h-4 w-12" />
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <Skeleton className="h-4 w-10" />
                                </td>
                              </tr>
                            ))
                          ) : safeAgentPerformanceData && safeAgentPerformanceData.length > 0 ? (
                            // Real agent data - using paginated data
                            paginatedAgentPerformanceData.map((agent: any) => (
                              <tr key={agent.id} className="border-b border-gray-100">
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center text-blue-600 mr-2">
                                      {agent.name?.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{agent.name}</div>
                                      {agent.department && (
                                        <div className="text-xs text-gray-500">{agent.department}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-sm">
                                  <div>
                                    <div className="font-medium">{agent.tickets}</div>
                                    <div className="text-xs text-gray-500">
                                      {agent.activeTickets} active
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-sm">
                                  {agent.avgTime > 0 ? `${agent.avgTime}h` : 'N/A'}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-sm">
                                  <span className={agent.slaMet >= 95 ? "text-green-600" : agent.slaMet >= 90 ? "text-yellow-600" : "text-red-600"}>
                                    {agent.slaMet}%
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-gray-500">
                                {agentError ? 'Error loading agent data' : 'No agent performance data available for selected filters.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {agentPerformanceTotalPages > 1 && (
                        <div className="border-t border-gray-200 p-4 bg-gray-50">
                          <PaginationControls
                            currentPage={agentPerformancePage}
                            totalPages={agentPerformanceTotalPages}
                            onPageChange={setAgentPerformancePage}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* SLA Compliance */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                     <CheckCircle className="h-4 w-4 text-blue-600" />
                     SLA Compliance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-52">
                    {isLoadingSLA ? (
                      <div className="flex items-center justify-center h-full">
                        <Skeleton className="h-48 w-full" />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={Array.isArray(slaComplianceData) ? slaComplianceData : []}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} minTickGap={30} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontWeight: 600, color: '#10b981' }}
                            formatter={(value: any) => [`${value}%`, 'SLA Met']}
                          />
                          <Area
                            type="monotone"
                            dataKey="compliance"
                            stroke="#10b981"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorCompliance)"
                            activeDot={{ r: 6, fill: '#10b981', strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="mt-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-gray-500 text-sm">High Priority</p>
                        <p className="text-xl font-semibold text-green-600">
                          {stats?.priorityStats?.find((p) => p.priority === 'high')?.slaRate || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Medium Priority</p>
                        <p className="text-xl font-semibold text-green-600">
                          {stats?.priorityStats?.find((p) => p.priority === 'medium')?.slaRate || 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-sm">Low Priority</p>
                        <p className="text-xl font-semibold text-green-600">
                          {stats?.priorityStats?.find((p) => p.priority === 'low')?.slaRate || 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Import Dialog */}
              <ImportDialog
                open={showImportDialog}
                onOpenChange={setShowImportDialog}
                onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/reports"] })}
              />
            </>
          )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
