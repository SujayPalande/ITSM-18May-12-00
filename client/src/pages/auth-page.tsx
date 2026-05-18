import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, Mail, KeyRound, ChevronRight, Shield, Cpu, Globe, Building2, MapPin, Phone, Briefcase, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "agent", "user"], {
    required_error: "Please select a role",
  }),
  companyName: z.string().min(1, "Company Name is required"),
  department: z.string().min(1, "Department is required"),
  contactNumber: z.string().min(1, "Contact Number is required"),
  designation: z.string().min(1, "Designation is required"),
  location: z.string().min(1, "Location is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation, isLoading } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const resetToken = params.get("reset");

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (user && !resetToken) {
      navigate("/");
    }
  }, [user, navigate, resetToken]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "user" as any,
      companyName: "",
      department: "",
      contactNumber: "",
      designation: "",
      location: "",
    },
  });

  const onLoginSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail || !forgotEmail.includes("@")) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setForgotLoading(true);
    try {
      const res = await apiRequest("POST", "/api/forgot-password", { email: forgotEmail });
      const data = await res.json();
      setForgotSent(true);
      toast({ title: "Check your email", description: data.message });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send reset email", variant: "destructive" });
    } finally {
      setForgotLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white selection:bg-blue-100">
      {/* 🔮 Left Side - Visual Narrative */}
      <div className="hidden lg:flex relative flex-col items-center justify-center p-16 bg-[#0a2540] overflow-hidden">
        {/* Cinematic Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] left-[-20%] w-[70%] h-[70%] bg-indigo-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 w-full max-w-lg"
        >
             <div className="mb-12">
               <h2 className="text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Modern Service <span className="text-blue-400">Desk Management.</span>
               </h2>
               <p className="mt-6 text-lg text-slate-400 font-medium leading-relaxed">
                  Enterprise-grade ITSM solution designed for seamless collaboration and rapid incident resolution.
               </p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, label: "Secure Access" },
                  { icon: Cpu, label: "AI Powered" },
                  { icon: Globe, label: "Cloud Sync" },
                  { icon: Users, label: "Team Ready" }
                ].map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                        <item.icon size={20} className="text-blue-400 mb-2" />
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{item.label}</span>
                    </div>
                ))}
             </div>
        </motion.div>
      </div>

      {/* 🔐 Right Side - Auth Hub */}
      <div className="flex flex-col items-center justify-center p-6 md:p-12 relative">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
        >
          <div className="mb-10 text-center">
             <img src="/logo1.png" alt="Cybaem Logo" className="h-12 w-auto mx-auto mb-6" />
             <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
             <p className="text-slate-500 text-sm mt-1">Enter your credentials to access the portal</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-50 rounded-xl mb-8">
              <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Username</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Enter username"
                                {...field}
                                className="h-12 pl-12 bg-slate-50 border-slate-100 rounded-xl font-medium text-slate-900"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between ml-1">
                          <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</FormLabel>
                          <Button
                            variant="link"
                            className="p-0 h-auto text-[10px] text-blue-600 font-bold uppercase tracking-widest"
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                          >
                            Forgot?
                          </Button>
                        </div>
                        <FormControl>
                           <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                type="password"
                                placeholder="••••••••"
                                {...field}
                                className="h-12 pl-12 bg-slate-50 border-slate-100 rounded-xl font-medium text-slate-900"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full h-12 bg-[#0a2540] hover:bg-blue-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-900/10 transition-all"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register" className="max-h-[450px] overflow-y-auto pr-2 scrollbar-thin">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6 py-2">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField control={registerForm.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Name</FormLabel><FormControl><Input placeholder="Full Name" {...field} className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={registerForm.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Email</FormLabel><FormControl><Input placeholder="email@example.com" {...field} className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={registerForm.control} name="username" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Username</FormLabel><FormControl><Input placeholder="Username" {...field} className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium" /></FormControl></FormItem>
                      )} />
                      <FormField control={registerForm.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Password</FormLabel><FormControl><Input type="password" placeholder="••••••" {...field} className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium" /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={registerForm.control} name="role" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium"><SelectValue placeholder="Role" /></SelectTrigger></FormControl><SelectContent className="rounded-xl"><SelectItem value="user">User</SelectItem><SelectItem value="agent">Agent</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select>
                        </FormItem>
                      )} />
                      <FormField control={registerForm.control} name="companyName" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Company</FormLabel><FormControl><Input placeholder="Company" {...field} className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium" /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={registerForm.control} name="department" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Department</FormLabel><FormControl><Input placeholder="Department" {...field} className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium" /></FormControl></FormItem>
                      )} />
                      <FormField control={registerForm.control} name="designation" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Designation</FormLabel><FormControl><Input placeholder="Designation" {...field} className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium" /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={registerForm.control} name="contactNumber" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contact</FormLabel><FormControl><Input placeholder="+1..." {...field} className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium" /></FormControl></FormItem>
                      )} />
                      <FormField control={registerForm.control} name="location" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Location</FormLabel><FormControl><Input placeholder="Location" {...field} className="h-11 bg-slate-50 border-slate-100 rounded-xl font-medium" /></FormControl></FormItem>
                      )} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-12 bg-[#0a2540] hover:bg-blue-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-900/10" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? <Loader2 className="animate-spin mx-auto h-5 w-5" /> : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" 
            onClick={() => setShowForgotPassword(false)}
          >
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8" onClick={e => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <Mail className="mx-auto w-10 h-10 text-blue-600 mb-4" />
                <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
                <p className="text-slate-500 text-xs mt-1">Enter your email to receive recovery link</p>
              </div>

              {forgotSent ? (
                <div className="text-center space-y-4">
                   <div className="p-3 bg-emerald-50 rounded-lg text-emerald-700 text-xs font-medium">Link sent successfully! Check your inbox.</div>
                   <Button className="w-full h-11 rounded-lg bg-[#0a2540]" onClick={() => setShowForgotPassword(false)}>Close</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Input type="email" placeholder="email@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="h-11 bg-slate-50 rounded-lg text-center font-medium" />
                  <Button className="w-full h-11 bg-[#0a2540] rounded-lg font-bold text-xs tracking-widest" onClick={handleForgotPassword} disabled={forgotLoading}>
                    {forgotLoading ? <Loader2 className="animate-spin mx-auto h-5 w-5" /> : "Send Link"}
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
