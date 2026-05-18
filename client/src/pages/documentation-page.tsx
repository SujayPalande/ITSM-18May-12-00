import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Clock, CheckCircle, Users, Target, Sparkles, BookOpen, Zap, ArrowRight, Mail, Link, MessageCircle, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DocumentationPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportPDF = () => {
    const style = document.createElement('style');
    style.id = 'print-style';
    style.innerHTML = `
      @media print {
        body > * { display: none !important; }
        body > #root > * { display: none !important; }
        .print-zone { display: block !important; }
        @page { margin: 1.5cm; size: A4; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById('print-style')?.remove(), 1000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareOptions = [
    {
      label: "WhatsApp",
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
      color: "hover:bg-green-50",
      action: () => window.open(`https://wa.me/?text=${encodeURIComponent('Check out this IT Helpdesk Documentation: ' + window.location.href)}`, '_blank')
    },
    {
      label: "Gmail",
      icon: <svg width="18" height="18" viewBox="0 0 24 24"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/></svg>,
      color: "hover:bg-red-50",
      action: () => window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent('IT Helpdesk Documentation')}&body=${encodeURIComponent('Check out this documentation: ' + window.location.href)}`, '_blank')
    },
    {
      label: "Outlook",
      icon: <svg width="18" height="18" viewBox="0 0 24 24"><path d="M24 7.387v10.478c0 .23-.08.424-.238.576a.806.806 0 01-.588.234h-8.402v-6.28l1.85 1.345a.421.421 0 00.49 0l6.888-5.002V7.387zm0-1.39c0 .036-.058.245-.174.627-.116.383-.37.683-.764.9l-7.09 5.146-1.2-.873V5.348h8.402c.235 0 .43.078.588.234.158.157.238.345.238.564v-.15zM14.772 5.348v6.804l-1.2.873-7.09-5.146c-.394-.217-.648-.517-.764-.9C5.602 6.597 5.544 6.388 5.544 6.352v-.15c0-.22.08-.407.238-.564.158-.156.353-.234.588-.234h8.402v-.056zM5.544 8.738l6.888 5.002a.421.421 0 00.49 0l1.85-1.345v6.28H6.37a.806.806 0 01-.588-.234.785.785 0 01-.238-.576V8.738zM0 9.16l5.544-2.85v12.25L0 15.04V9.16zm0-.15V4.44l5.544 2.85L0 9.01zm5.544 9.55v3.51L0 19.22l5.544-.66zm5.228-4.38L5.544 18v-3.51l5.228-3.81z" fill="#0078D4"/></svg>,
      color: "hover:bg-blue-50",
      action: () => window.open(`https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent('IT Helpdesk Documentation')}&body=${encodeURIComponent('Check out this documentation: ' + window.location.href)}`, '_blank')
    },
    {
      label: "Teams",
      icon: <svg width="18" height="18" viewBox="0 0 24 24"><path d="M20.625 8.5h-3.75c-.207 0-.375.168-.375.375v6.75a3.375 3.375 0 01-3.375 3.375H9.75a.375.375 0 00-.375.375v.75c0 .621.504 1.125 1.125 1.125h7.5l3 2.25v-2.25h.75c.621 0 1.125-.504 1.125-1.125v-9.75c0-.621-.504-1.125-1.125-1.125h-.125z" fill="#5059C9"/><circle cx="19.5" cy="5.5" r="2.5" fill="#5059C9"/><path d="M15 4.5c0 2.485-2.015 4.5-4.5 4.5S6 6.985 6 4.5 8.015 0 10.5 0 15 2.015 15 4.5z" fill="#7B83EB"/><path d="M16.5 8H4.5C3.672 8 3 8.672 3 9.5v7c0 2.485 2.015 4.5 4.5 4.5h6c2.485 0 4.5-2.015 4.5-4.5v-7c0-.828-.672-1.5-1.5-1.5z" fill="#7B83EB"/></svg>,
      color: "hover:bg-indigo-50",
      action: () => window.open(`https://teams.microsoft.com/share?href=${encodeURIComponent(window.location.href)}&msgText=${encodeURIComponent('IT Helpdesk Documentation')}`, '_blank')
    },
    {
      label: copiedLink ? "Copied!" : "Copy Link",
      icon: <Copy size={16} className="text-slate-500" />,
      color: "hover:bg-slate-50",
      action: handleCopyLink
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Documentation" />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-slate-50/10">
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="max-w-[1200px] mx-auto space-y-10"
          >
            {/* Stunning Hero Section */}
            <div className="relative rounded-[2.5rem] bg-slate-900 border border-slate-800 p-8 md:p-14 mb-10 shadow-2xl">
               <div className="absolute top-0 right-0 p-32 bg-indigo-600/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
               <div className="absolute bottom-0 left-0 p-32 bg-blue-600/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
               
               <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-6 text-center md:text-left max-w-2xl">
                    <Badge variant="outline" className="text-blue-400 border-blue-400/30 bg-blue-400/10 mb-4 backdrop-blur-md">
                       <BookOpen size={12} className="mr-2" /> Documentation Center
                    </Badge>
                    <h1 className="text-3xl md:text-6xl font-semibold text-white tracking-tight leading-tight">
                       User Journey <br/><span className="text-blue-400">Documentation</span>
                    </h1>
                    <p className="text-slate-400 text-sm md:text-xl font-medium opacity-90 max-w-lg">
                       Master every feature of the IT Helpdesk Portal with our comprehensive, step-by-step guides and resource library.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <Button onClick={handleExportPDF} className="h-12 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Save as PDF
                    </Button>
                    <div className="relative" ref={shareRef}>
                      <Button
                        onClick={() => setShowShareMenu(prev => !prev)}
                        variant="outline"
                        className="w-full h-12 border-slate-700 bg-slate-800/20 text-slate-200 hover:text-white hover:bg-slate-700/50 font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"
                      >
                        <ExternalLink size={16} className="text-slate-400" />
                        Share Document
                      </Button>
                      <AnimatePresence>
                        {showShareMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full mt-2 right-0 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[60]"
                          >
                            <div className="p-2 space-y-0.5">
                              {shareOptions.map((opt) => (
                                <button
                                  key={opt.label}
                                  onClick={() => { opt.action(); if (opt.label !== 'Copy Link' && opt.label !== 'Copied!') setShowShareMenu(false); }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 transition-colors ${opt.color}`}
                                >
                                  {opt.icon}
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
               </div>
            </div>

            {/* Quick Navigation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-4 lg:sticky top-6 h-fit space-y-6">
                  <Card className="border border-slate-200 shadow-xl rounded-[2rem] bg-white overflow-hidden">
                    <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
                      <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                        <BookOpen className="h-8 w-8 text-blue-600 drop-shadow-[0_0_15px_rgba(37,99,235,0.3)]" />
                        Quick Navigation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-1">
                        {[
                          { id: "executive-summary", label: "Executive Summary", icon: <Target size={14}/> },
                          { id: "getting-started", label: "Getting Started", icon: <Zap size={14}/> },
                          { id: "user-journey", label: "User Journey", icon: <ArrowRight size={14}/> },
                          { id: "support-resources", label: "Support Resources", icon: <Sparkles size={14}/> }
                        ].map((item) => (
                          <a 
                            key={item.id}
                            href={`#${item.id}`} 
                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-blue-50 text-slate-600 hover:text-blue-700 font-semibold transition-all group"
                          >
                            <span className="text-slate-400 group-hover:text-blue-500">{item.icon}</span>
                            {item.label}
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
               </div>

               <div className="lg:col-span-8 space-y-12">
                  {/* Executive Summary */}
                  <section id="executive-summary" className="scroll-mt-24">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">1</div>
                       <h2 className="text-3xl font-semibold text-slate-900 tracking-tight">Executive Summary</h2>
                    </div>
                    
                    <Card className="border border-slate-200 shadow-md rounded-[2rem] bg-white overflow-hidden mb-8">
                      <CardContent className="p-8">
                        <p className="text-slate-700 leading-relaxed text-lg font-medium">
                          The IT Helpdesk Portal is a comprehensive technical support management system designed to streamline 
                          IT support workflows and enhance user experience. It provides a centralized platform for ticket management, 
                          knowledge sharing, and automated assistance.
                        </p>
                      </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6">
                      <Card className="border border-slate-100 bg-slate-50/50 rounded-[1.5rem] shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg font-bold text-slate-900">Key Benefits</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-3">
                            {["Streamlined Support Process", "Self-Service Capabilities", "AI-Powered Assistance", "Role-Based Access", "Real-Time Analytics"].map((benefit) => (
                              <li key={benefit} className="flex items-center gap-3">
                                <div className="h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                  <CheckCircle size={12} />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-100 bg-slate-50/50 rounded-[1.5rem] shadow-sm">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg font-bold text-slate-900">Target Audience</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[
                              { role: "End Users", desc: "Employees seeking IT support" },
                              { role: "IT Agents", desc: "Technical staff managing tickets" },
                              { role: "Administrators", desc: "System managers" }
                            ].map((item) => (
                              <div key={item.role} className="flex flex-col">
                                <Badge variant="outline" className="w-fit bg-white border-slate-200 text-slate-700 font-bold mb-1 px-2.5 py-0.5 rounded-full">{item.role}</Badge>
                                <span className="text-xs text-slate-500 font-medium pl-1">{item.desc}</span>
                              </div>
                            ))}
                        </CardContent>
                      </Card>
                    </div>
                  </section>

                  {/* Getting Started */}
                  <section id="getting-started" className="scroll-mt-24">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">2</div>
                       <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Getting Started</h2>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <Card className="border border-slate-200 shadow-md rounded-[2rem] bg-white text-slate-900">
                        <CardHeader>
                          <CardTitle className="text-xl font-bold">System Requirements</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-4">
                            {[
                              { label: "Browser", value: "Chrome 90+, Firefox 88+, Safari 14+" },
                              { label: "Internet", value: "Stable broadband connection" },
                              { label: "Device", value: "Desktop or Tablet (320px+ width)" },
                              { label: "JavaScript", value: "Must be enabled" }
                            ].map((req) => (
                              <div key={req.label} className="border-b border-slate-100 pb-2">
                                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">{req.label}</p>
                                <p className="text-sm font-bold text-slate-700">{req.value}</p>
                              </div>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-200 shadow-md rounded-[2rem] bg-slate-900 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-16 bg-blue-500/10 blur-[60px] rounded-full"></div>
                        <CardHeader className="relative z-10">
                          <CardTitle className="text-xl font-bold">Auth Credentials</CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 space-y-4">
                          {[
                            { role: "Admin", cred: "admin / admin123" },
                            { role: "Agent", cred: "agent / agent123" },
                            { role: "User", cred: "user / user123" }
                          ].map((c) => (
                            <div key={c.role} className="bg-white/5 rounded-xl p-3 border border-white/10 backdrop-blur-sm">
                              <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest">{c.role}</p>
                              <p className="font-mono text-xs font-bold mt-0.5">{c.cred}</p>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                  </section>

                  {/* User Journey Steps */}
                  <section id="user-journey" className="scroll-mt-24">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="h-10 w-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">3</div>
                       <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Step-by-Step Journeys</h2>
                    </div>
                    
                    <div className="space-y-8">
                      <Card className="border border-slate-200 shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
                        <CardHeader className="p-10 pb-4">
                          <div className="flex items-center justify-between mb-4">
                            <Badge className="bg-blue-600 text-white rounded-full px-4 py-1">JOURNEY 01</Badge>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
                              <Clock className="h-4 w-4" />
                              3-5 mins
                            </div>
                          </div>
                          <CardTitle className="text-2xl font-extrabold text-slate-900">Creating a Support Ticket</CardTitle>
                          <CardDescription className="text-slate-500 font-medium">Submit a new IT support request through the integrated ticketing system</CardDescription>
                        </CardHeader>
                        <CardContent className="p-10 pt-6 space-y-10">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                             <div className="space-y-6">
                                {[
                                  { s: 1, title: "Access Creation Form", desc: "Click 'Create Ticket' button from main dashboard." },
                                  { s: 2, title: "Info Input", desc: "Enter title, and select appropriate category." },
                                  { s: 3, title: "Detail Description", desc: "Describe issue comprehensively for faster resolution." },
                                  { s: 4, title: "Submit", desc: "Review your information and click 'Submit Ticket'." }
                                ].map((step) => (
                                  <div key={step.s} className="flex gap-5 relative">
                                    {step.s < 4 && <div className="absolute left-6 top-10 bottom-0 w-0.5 bg-slate-100"></div>}
                                    <div className="bg-blue-600 text-white rounded-2xl w-12 h-12 flex items-center justify-center text-lg font-black shadow-lg shadow-blue-500/20 shrink-0">
                                      {step.s}
                                    </div>
                                    <div className="pt-1">
                                      <h5 className="font-bold text-slate-900">{step.title}</h5>
                                      <p className="text-slate-500 text-sm font-medium mt-1">{step.desc}</p>
                                    </div>
                                  </div>
                                ))}
                             </div>
                             <div className="bg-blue-50/50 rounded-[2rem] p-8 md:p-10 border border-blue-100/50 h-fit">
                                <h4 className="font-extrabold text-blue-900 text-xl mb-6">Expected Outcomes</h4>
                                <ul className="space-y-5">
                                  {["Ticket created with unique ID reference", "Visual confirmation displayed in UI", "Ticket appears in 'My Tickets' instantly"].map((outcome) => (
                                    <li key={outcome} className="flex items-start gap-4">
                                      <div className="h-6 w-6 bg-blue-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle className="text-blue-700" size={14} />
                                      </div>
                                      <span className="text-sm font-bold text-blue-800 leading-tight">{outcome}</span>
                                    </li>
                                  ))}
                                </ul>
                             </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </section>
               </div>
            </div>

            {/* Support and Resources */}
            <div id="support-resources" className="scroll-mt-24 pt-10">
              <div className="flex items-center gap-4 mb-8">
                 <div className="h-10 w-10 bg-rose-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-rose-500/20">4</div>
                 <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Support Resources</h2>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card className="border border-slate-200 shadow-lg rounded-[2rem] bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
                    <CardTitle className="text-xl font-bold">Frequently Asked</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <h5 className="font-black text-[10px] text-blue-500 uppercase tracking-widest mb-1">Password?</h5>
                      <p className="text-slate-700 text-sm font-bold">Self-service reset is enabled via the login page.</p>
                    </div>
                    <div>
                      <h5 className="font-black text-[10px] text-blue-500 uppercase tracking-widest mb-1">Duration?</h5>
                      <p className="text-slate-700 text-sm font-bold">Average response time is 1-4 hours based on priority.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-slate-200 shadow-lg rounded-[2rem] bg-white overflow-hidden lg:col-span-2">
                   <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-full p-10 flex flex-col justify-center relative overflow-hidden">
                      <div className="absolute -bottom-20 -right-20 p-40 bg-white/10 blur-[80px] rounded-full pointer-events-none"></div>
                      <div className="relative z-10 space-y-4">
                        <h3 className="text-2xl font-black text-white">Need Urgent Assistance?</h3>
                        <p className="text-blue-100 font-medium">If your issue is mission-critical, technical support is available 24/7 through our priority ticketing channel.</p>
                        <Button className="bg-white text-blue-700 hover:bg-blue-50 font-black px-8 py-6 rounded-2xl shadow-xl transition-all">
                           Open High-Priority Ticket
                        </Button>
                      </div>
                   </div>
                </Card>
              </div>
            </div>

            {/* Footer */}
            <Separator className="my-10" />
            <div className="text-center pb-20">
              <div className="flex items-center justify-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
                <span>V 1.0.4</span>
                <span>•</span>
                <span>Stable Release</span>
              </div>
              <p className="text-slate-400 text-sm font-medium">IT Helpdesk Portal Documentation. All rights reserved.</p>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
