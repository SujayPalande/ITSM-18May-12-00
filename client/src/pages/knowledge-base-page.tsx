import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/common/pagination-controls";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { 
  Search, 
  BookOpen, 
  Mail, 
  Lock, 
  Wifi, 
  Monitor, 
  ChevronRight, 
  Box, 
  RefreshCw, 
  LayoutGrid,
  Zap,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Star,
  FileText
} from "lucide-react";
import { Category, Faq } from "@shared/schema";

export default function KnowledgeBasePage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  const { user } = useAuth();

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => (await apiRequest("GET", "/api/categories")).json(),
  });

  const { data: faqs, isLoading: isLoadingFaqs } = useQuery<Faq[]>({
    queryKey: ["/api/faqs"],
    queryFn: async () => (await apiRequest("GET", "/api/faqs")).json(),
  });

  const filteredFaqs = faqs?.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? faq.categoryId === selectedCategory : true;
    return matchesSearch && matchesCategory;
  }) || [];

  // Reset to page 1 whenever search query or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const totalPages = Math.ceil(filteredFaqs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedFaqs = filteredFaqs.slice(startIndex, endIndex);

  const getCategoryNameById = (id: number | null) => {
    if (!id) return "General Intelligence";
    const category = categories?.find(c => c.id === id);
    return category ? category.name : "Unknown Vector";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Knowledge Ecosystem" />

        <main className="flex-1 overflow-y-auto bg-slate-50/30">
          <div className="max-w-[1600px] mx-auto p-4 md:p-8 lg:p-12">
            {/* Ultra-Modern Hero Header */}
            <div className="relative overflow-hidden rounded-[3rem] bg-gradient-to-br from-slate-900 to-[#0a2540] p-10 md:p-16 mb-12 shadow-3xl">
               <div className="absolute top-0 right-0 p-48 bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 p-48 bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
               
               <div className="relative z-10 space-y-8">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10 px-4 py-1.5 backdrop-blur-md font-black uppercase tracking-widest text-[10px]">
                       <Sparkles size={12} className="mr-2" /> Central Intelligence
                    </Badge>
                  </div>
                  
                  <div className="max-w-3xl space-y-4 text-center md:text-left">
                    <h1 className="text-3xl md:text-6xl font-semibold text-white tracking-tight leading-tight">
                       Enterprise <span className="text-blue-400">Knowledge</span> Base
                    </h1>
                    <p className="text-slate-400 text-sm md:text-xl font-medium opacity-90 max-w-2xl">
                       Access our centralized intelligence ecosystem to resolve complex technical hurdles and master system operations.
                    </p>
                  </div>

                  <div className="relative group max-w-2xl mt-10">
                     <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-700"></div>
                     <div className="relative flex items-center">
                        <Search className="absolute left-7 h-6 w-6 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                        <Input
                          placeholder="Search intelligence vectors..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-16 pr-8 h-18 w-full bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[1.8rem] text-white text-lg shadow-2xl transition-all focus:ring-0 focus:border-blue-500/50 placeholder:text-slate-600 font-bold"
                        />
                        <div className="absolute right-3 px-4 py-2 bg-blue-600 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest cursor-default shadow-lg shadow-blue-500/20">
                          Search
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Horizontal Scrollable Categories Container */}
            <div className="mb-12 relative">
               <div className="flex overflow-x-auto pb-2 gap-3 scrollbar-none snap-x -mx-1 px-1 scroll-smooth">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      "snap-start shrink-0 px-5 py-2.5 rounded-full font-bold text-[12px] tracking-wide transition-all duration-300 flex items-center gap-2 border whitespace-nowrap",
                      selectedCategory === null 
                        ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20 scale-105" 
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", selectedCategory === null ? "bg-white" : "bg-slate-400")} />
                    All Vectors
                    <span className={cn("ml-0.5 text-[10px] font-black", selectedCategory === null ? "text-slate-300" : "text-slate-400")}>{faqs?.length || 0}</span>
                  </button>
                  {categories?.map((cat, idx) => {
                    const colors = [
                      { active: "bg-blue-600 text-white border-blue-600 shadow-blue-200", dot: "bg-white", inactive: "text-blue-700 border-blue-100 bg-blue-50 hover:bg-blue-100" },
                      { active: "bg-violet-600 text-white border-violet-600 shadow-violet-200", dot: "bg-white", inactive: "text-violet-700 border-violet-100 bg-violet-50 hover:bg-violet-100" },
                      { active: "bg-emerald-600 text-white border-emerald-600 shadow-emerald-200", dot: "bg-white", inactive: "text-emerald-700 border-emerald-100 bg-emerald-50 hover:bg-emerald-100" },
                      { active: "bg-orange-500 text-white border-orange-500 shadow-orange-200", dot: "bg-white", inactive: "text-orange-700 border-orange-100 bg-orange-50 hover:bg-orange-100" },
                      { active: "bg-rose-600 text-white border-rose-600 shadow-rose-200", dot: "bg-white", inactive: "text-rose-700 border-rose-100 bg-rose-50 hover:bg-rose-100" },
                      { active: "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200", dot: "bg-white", inactive: "text-indigo-700 border-indigo-100 bg-indigo-50 hover:bg-indigo-100" },
                      { active: "bg-teal-600 text-white border-teal-600 shadow-teal-200", dot: "bg-white", inactive: "text-teal-700 border-teal-100 bg-teal-50 hover:bg-teal-100" },
                    ];
                    const c = colors[idx % colors.length];
                    const isActive = selectedCategory === cat.id;
                    const catCount = faqs?.filter(f => f.categoryId === cat.id).length || 0;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          "snap-start shrink-0 px-5 py-2.5 rounded-full font-bold text-[12px] tracking-wide transition-all duration-300 flex items-center gap-2 border whitespace-nowrap",
                          isActive ? `${c.active} shadow-lg scale-105` : `${c.inactive}`
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", isActive ? c.dot : "opacity-60 " + c.dot)} style={{ background: isActive ? 'white' : undefined }} />
                        {cat.name}
                        <span className="ml-0.5 text-[10px] font-black opacity-70">{catCount}</span>
                      </button>
                    );
                  })}
               </div>
            </div>

            <div className="space-y-8">

                 <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                       <h2 className="text-2xl font-black text-slate-900 tracking-tight italic">
                          {getCategoryNameById(selectedCategory)}
                       </h2>
                       <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                       <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{filteredFaqs.length} Protocols</span>
                    </div>
                 </div>

                 <div className="min-h-[400px]">
                    {isLoadingFaqs ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[...Array(6)].map((_, i) => (
                          <Skeleton key={i} className="h-32 w-full rounded-[2rem] bg-white border border-slate-100 shadow-sm" />
                        ))}
                      </div>
                    ) : paginatedFaqs && paginatedFaqs.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <AnimatePresence mode="popLayout">
                            {paginatedFaqs.map((faq, index) => (
                              <motion.div
                                key={faq.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                              >
                                <FAQItem 
                                  faq={faq} 
                                  categoryName={getCategoryNameById(faq.categoryId)}
                                />
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                        
                        {totalPages > 1 && (
                          <div className="pt-16 pb-8 flex justify-center">
                            <PaginationControls
                              currentPage={currentPage}
                              totalPages={totalPages}
                              onPageChange={setCurrentPage}
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-40 text-center flex flex-col items-center bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-slate-200/50">
                        <div className="h-24 w-24 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mb-8">
                           <Search size={32} className="text-slate-200" />
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Not Found</h3>
                        <p className="text-slate-500 mt-3 font-bold uppercase tracking-widest text-xs">No matching protocols in current vector</p>
                        <Button variant="ghost" className="mt-8 font-black text-blue-600" onClick={() => {setSearchQuery(""); setSelectedCategory(null)}}>Reset Intelligence Search</Button>
                      </div>
                    )}
                 </div>
              </div>
            </div>
        </main>
      </div>
    </div>
  );
}

function FAQItem({ faq, categoryName }: { faq: Faq; categoryName: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="border border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white hover:border-blue-200 hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-6 cursor-pointer flex-1 flex flex-col items-start gap-4"
      >
        <div className="flex items-center justify-between w-full">
           <Badge variant="outline" className="text-xs font-bold text-blue-600 border-blue-100 bg-blue-50/50 px-3 py-1 rounded-full">
             {categoryName}
           </Badge>
           <div className={cn(
             "h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-300",
             isOpen ? "bg-blue-600 text-white rotate-180" : "bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600"
           )}>
              <ChevronDown size={18} />
           </div>
        </div>
        <div>
           <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
             {faq.question}
           </h3>
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 pt-0">
               <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 shadow-inner">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {faq.answer}
                  </p>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
