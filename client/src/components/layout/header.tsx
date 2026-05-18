import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, Bell, Search, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import Chatbot from "@/components/chatbot/chatbot";

interface HeaderProps {
  toggleSidebar: () => void;
  title: string;
}

export default function Header({ toggleSidebar, title }: HeaderProps) {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: notifRes } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications.php", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: number | 'all') => {
      const res = await fetch("/api/notifications.php?action=mark_read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Mark read failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    }
  });

  const notifications = notifRes?.data || [];
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const handleNotificationClick = (n: any) => {
    if (!n.is_read) {
      markReadMutation.mutate(n.id);
    }
    if (n.target_url) {
      setLocation(n.target_url);
    } else if (n.target_id && n.type !== 'system') {
      // Default to tickets if not specified
      setLocation(`/tickets/${n.target_id}`);
    }
  };

  // Helper to determine page title from URL (if not provided)
  const getPageTitle = (): string => {
    if (title) return title;

    if (location === "/") return "Dashboard";
    if (location.startsWith("/tickets")) {
      if (location === "/tickets") return "My Tickets";
      if (location.includes("/new")) return "Create Ticket";
      return "Ticket Details";
    }
    if (location === "/knowledge-base") return "Knowledge Base";
    if (location === "/all-tickets") return "All Tickets";
    if (location === "/admin/users") return "User Management";
    if (location === "/admin/categories") return "Categories";
    if (location === "/admin/reports") return "Reports";
    if (location === "/admin/settings") return "Settings";

    return "IT Helpdesk";
  };

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
  };

  return (
    <>
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 h-16 flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { toggleSidebar(); }}
            className="text-slate-500 hover:bg-slate-100 rounded-xl h-10 w-10"
            aria-label="Toggle menu"
          >
            <Menu size={18} strokeWidth={2.5} />
          </Button>
          <div className="ml-4 flex flex-col">
            <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">{getPageTitle()}</h1>
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">System: Active</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="hidden lg:flex bg-slate-100/50 border border-slate-200/30 rounded-xl h-9 px-4 items-center group transition-all duration-300 w-56 xl:w-72">
            <Search size={14} className="text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-transparent border-none focus:ring-0 text-xs ml-2 w-full placeholder:text-slate-400 font-bold" 
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 relative hover:bg-slate-100 rounded-xl h-10 w-10 transition-all">
                <Bell size={18} strokeWidth={2.5} />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 bg-rose-500 border border-white rounded-full w-2 h-2"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 mt-2 p-0 rounded-2xl overflow-hidden shadow-lg border border-slate-100">
              <div className="flex items-center justify-between p-3 px-4 bg-slate-50/50 border-b border-slate-100">
                 <DropdownMenuLabel className="font-semibold text-slate-800 p-0 text-sm">Notifications</DropdownMenuLabel>
                 {unreadCount > 0 && (
                   <button onClick={() => markReadMutation.mutate('all')} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">Mark all read</button>
                 )}
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center">
                    <Bell className="h-8 w-8 text-slate-200 mb-2" />
                    You're all caught up!
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div 
                      key={n.id} 
                      onClick={() => handleNotificationClick(n)}
                      className={`flex flex-col items-start gap-1 p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className="flex justify-between w-full">
                        <span className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</span>
                        {!n.is_read && <span className="w-2 h-2 flex-shrink-0 bg-blue-500 rounded-full mt-1.5"></span>}
                      </div>
                      <span className="text-xs text-slate-500 leading-relaxed pr-2">{n.message}</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{n.time_ago}</span>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-100 rounded-xl h-10 w-10 transition-all">
                <MessageSquare size={18} strokeWidth={2.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 mt-2 p-6 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
               <div className="bg-blue-50 text-blue-600 p-3 rounded-xl mb-4">
                  <MessageSquare size={24} />
               </div>
               <h4 className="text-sm font-black text-slate-800 tracking-tight">AI Assistant Chat</h4>
               <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2 px-2 py-1 bg-slate-50 rounded-lg">Coming Soon</p>
               <p className="text-[11px] text-slate-400 font-medium mt-3 leading-relaxed">
                  Our advanced AI support feature will be enabled in a future update.
               </p>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6 mx-2 hidden md:block opacity-30" />
          
          <div className="hidden md:flex items-center space-x-2 pl-1">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-900 leading-none">Status</span>
                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter">Secure</span>
             </div>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm"></div>
          </div>
        </div>
      </header>

      {/* <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} /> */}
    </>
  );
}


