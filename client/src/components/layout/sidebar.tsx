import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { hasRole, hasAnyRole } from "@/lib/role-utils";
import { Button } from "@/components/ui/button";
import { 
  Headset, 
  Home, 
  TicketCheck, 
  Book, 
  FileText,
  ListChecks, 
  Users, 
  Tags, 
  BarChart, 
  Bug,
  Settings, 
  Menu, 
  X,
  Building2
} from "lucide-react";

interface SidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ 
  isMobile = false, 
  isOpen = true, 
  onClose,
  collapsed = false,
}: SidebarProps) {
  const [location] = useLocation();
  const [showLogoFallback, setShowLogoFallback] = useState(false);
  const { user, logoutMutation } = useAuth();
  const [isMobileInternal, setIsMobileInternal] = useState(false);

  useEffect(() => {
    const check = () => setIsMobileInternal(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  useEffect(() => {
    if (isMobileInternal && isOpen && onClose) {
      onClose();
    }
  }, [location, isMobileInternal, isOpen, onClose]);

  const isRouteActive = (route: string) => {
    if (route === "/") return location === "/";
    return location.startsWith(route);
  };

  // Determine effective collapse/open state
  // On mobile, isOpen controls translate-x
  // On desktop, isOpen controls width (collapsed vs expanded)
  const effectiveCollapsed = !isMobileInternal && !isOpen;
  const effectiveOpen = isMobileInternal ? isOpen : true;

  return (
    <div className={cn(
        "bg-[#0a2540] h-full fixed inset-y-0 left-0 z-30 shadow-2xl flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-white/5",
        isMobileInternal ? (effectiveOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full") : (effectiveCollapsed ? "w-20" : "w-64"),
        !isMobileInternal && "md:relative md:translate-x-0"
    )}>
      {/* 🏙️ Logo & Branding */}
      <div className={cn(
        "px-6 py-6 flex flex-col items-center justify-center relative overflow-hidden",
        effectiveCollapsed ? "px-2" : "px-6"
      )}>
        {/* Abstract Background Glow */}
        <div className="absolute -top-24 -left-20 w-48 h-48 bg-blue-500/5 rounded-full blur-[100px]"></div>
        
        <Link href="/" className="flex items-center flex-col w-full relative z-10 group">
          {!showLogoFallback ? (
            <div className={cn(
              "bg-white rounded-xl shadow-lg transition-all duration-500 flex items-center justify-center overflow-hidden", 
              effectiveCollapsed ? "p-1 h-10 w-10" : "p-1.5 h-auto w-auto"
            )}>
              <img
                src={effectiveCollapsed ? "/favicon.png" : "/logo1.png"}
                alt="Logo"
                className={cn("transition-all object-contain", effectiveCollapsed ? "h-full w-full" : "h-9 w-auto")}
                onError={() => setShowLogoFallback(true)}
              />
            </div>
          ) : (
            <div className="bg-white/10 rounded-xl p-2 mb-0 backdrop-blur-md border border-white/20 shadow-inner">
              <Headset size={effectiveCollapsed ? 18 : 24} className="text-blue-400" />
            </div>
          )}
        </Link>
        {isMobileInternal && (
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <X size={18} />
          </Button>
        )}
      </div>

      {/* 👤 User Profile Card */}
      <div className={cn("px-4 mb-4", effectiveCollapsed ? "px-2" : "px-4")}>
        <div className={cn(
          "flex items-center p-2 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm transition-all hover:bg-white/10", 
          effectiveCollapsed && "bg-transparent border-none justify-center p-0"
        )}>
          <div className="flex-shrink-0 relative group">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-9 h-9 rounded-lg flex items-center justify-center border border-white/10 shadow-lg transition-transform group-hover:scale-105">
              <span className="text-white font-bold text-xs">{user?.name?.charAt(0).toUpperCase() || "U"}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0a2540] rounded-full shadow-sm"></div>
          </div>
          {!effectiveCollapsed && (
            <div className="ml-3 min-w-0">
              <p className="font-bold text-[13px] truncate text-white/90">{user?.name || "Member"}</p>
              <div className="flex items-center">
                 <span className="text-[9px] text-blue-400 font-black uppercase tracking-wider truncate">{user?.role || "Inquirer"}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🧭 Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-none">
        {!effectiveCollapsed && <div className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em] px-4 py-2">Main</div>}
        <SidebarLink href="/" active={isRouteActive("/")} icon={<Home size={18} />} label="Dashboard" collapsed={effectiveCollapsed} />
        <SidebarLink href="/tickets" active={isRouteActive("/tickets")} icon={<TicketCheck size={18} />} label="My Tickets" collapsed={effectiveCollapsed} />
        {hasRole(user?.role, "admin") && <SidebarLink href="/all-tickets" active={isRouteActive("/all-tickets")} icon={<ListChecks size={20} />} label="All Tickets" collapsed={effectiveCollapsed} />}
        
        {!effectiveCollapsed && <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-4 pb-2 pt-6">Resources</div>}
        <SidebarLink href="/knowledge-base" active={isRouteActive("/knowledge-base")} icon={<Book size={18} />} label="Knowledge Base" collapsed={effectiveCollapsed} />
        <SidebarLink href="/documentation" active={isRouteActive("/documentation")} icon={<FileText size={18} />} label="Documentation" collapsed={effectiveCollapsed} />
        <SidebarLink href="/site-engg" active={isRouteActive("/site-engg")} icon={<Building2 size={18} />} label="Site Engineering" collapsed={effectiveCollapsed} />

        {hasAnyRole(user?.role, ["admin", "agent"]) && (
          <>
            {!effectiveCollapsed && <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-4 pb-2 pt-6">Admin</div>}
            <SidebarLink href="/admin/users" active={isRouteActive("/admin/users")} icon={<Users size={18} />} label="Users" collapsed={effectiveCollapsed} />
            {hasRole(user?.role, "admin") && (
              <>
                <SidebarLink href="/admin/categories" active={isRouteActive("/admin/categories")} icon={<Tags size={18} />} label="Categories" collapsed={effectiveCollapsed} />
                <SidebarLink href="/admin/reports" active={isRouteActive("/admin/reports")} icon={<BarChart size={18} />} label="Reports" collapsed={effectiveCollapsed} />
              </>
            )}
          </>
        )}
        {!effectiveCollapsed && <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] px-4 pb-2 pt-6">Support</div>}
        <SidebarLink href="/bug-reports" active={isRouteActive("/bug-reports")} icon={<Bug size={18} />} label="Bug Reports" collapsed={effectiveCollapsed} />
      </nav>

      {/* ⚙️ Footer Actions */}
      <div className={cn("p-4 mt-auto border-t border-white/5 bg-black/5", effectiveCollapsed ? "p-2" : "p-4")}>
        <SidebarLink href="/settings" active={isRouteActive("/settings")} icon={<Settings size={18} />} label="Settings" collapsed={effectiveCollapsed} />
        <Button 
          variant="ghost" 
          className={cn(
            "w-full transition-all mt-2 font-bold text-xs text-white/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl", 
            effectiveCollapsed ? "p-0 h-12 w-12 mx-auto justify-center" : "justify-start px-4 py-3"
          )} 
          onClick={handleLogout} 
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rose-500"></div>
          ) : (
            <>
              <X size={20} className={cn(effectiveCollapsed ? "" : "mr-4")} />
              {!effectiveCollapsed && "Sign Out"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SidebarLink({ href, label, icon, active, collapsed }: { href: string, label: string, icon: React.ReactNode, active: boolean, collapsed?: boolean }) {
  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center px-4 py-2.5 text-[13px] font-bold rounded-xl mb-1 transition-all duration-300 cursor-pointer group relative", 
        active 
          ? "bg-blue-600/15 text-white border border-blue-500/20" 
          : "text-white/50 hover:text-white hover:bg-white/5", 
        collapsed ? "justify-center p-2.5" : ""
      )} title={collapsed ? label : ""}>
        {active && <div className="absolute left-0 w-0.5 h-4 bg-blue-500 rounded-r-full"></div>}
        <span className={cn("transition-transform duration-300", collapsed ? "mr-0" : "mr-3", active ? "text-blue-400" : "")}>{icon}</span>
        {!collapsed && <span className="truncate tracking-tight">{label}</span>}
      </div>
    </Link>

  );
}


