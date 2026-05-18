import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasAnyRole } from "@/lib/role-utils";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserSelection } from "@/components/ticket/user-selection";
import { CategorySelection } from "@/components/ticket/category-selection";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { Category, User } from "@shared/schema";
import { motion } from "framer-motion";

const createTicketSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(100, "Title cannot exceed 100 characters"),
  description: z.string().optional().default(""),
  categoryId: z.string().min(1, "Please select a category"),
  subcategoryId: z.string().optional().default(""),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  supportType: z.enum(["remote", "telephonic", "onsite_visit", "other"]).default("remote"),
  assignedToId: z.string().optional().default(""),
  contactId: z.string().optional().default(""),
  contactEmail: z.string().optional().default(""),
  contactName: z.string().optional().default(""),
  contactPhone: z.string().optional().default(""),
  contactDepartment: z.string().optional().default(""),
  companyName: z.string().optional().default(""),
  location: z.string().optional().default(""),
  dueDate: z.string().optional().default("")
});

type CreateTicketFormValues = z.infer<typeof createTicketSchema>;

export default function TicketCreatePage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: fetchedCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => (await apiRequest("GET", "/api/categories")).json(),
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => (await apiRequest("GET", "/api/users")).json(),
    enabled: !!user,
  });

  const agentOptions = allUsers?.filter(u => hasAnyRole(u.role, ["agent", "admin"])) || [];
  const contactOptions = allUsers?.filter(u => u.role === "user") || [];

  const memoizedCategories = fetchedCategories || [];
  const localCategories = memoizedCategories.filter(c => !c.parentId);
  const subcategories = memoizedCategories.filter(c => c.parentId?.toString() === selectedCategoryId);

  const form = useForm<CreateTicketFormValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      subcategoryId: "",
      priority: "medium",
      supportType: "remote",
      assignedToId: "",
      contactId: "",
      contactEmail: "",
      contactName: "",
      contactPhone: "",
      contactDepartment: "",
      companyName: "",
      location: "",
      dueDate: ""
    },
  });

  // Auto-fill contact details from user's profile
  useEffect(() => {
    if (user) {
      const currentValues = form.getValues();
      // Only autofill if the fields are empty (not yet manually set)
      if (!currentValues.contactName && user.name) {
        form.setValue("contactName", user.name);
      }
      if (!currentValues.contactEmail && user.email) {
        form.setValue("contactEmail", user.email);
      }
      if (!currentValues.contactPhone && (user as any).contactNumber) {
        form.setValue("contactPhone", (user as any).contactNumber);
      }
      if (!currentValues.companyName && (user as any).companyName) {
        form.setValue("companyName", (user as any).companyName);
      }
      if (!currentValues.location && (user as any).location) {
        form.setValue("location", (user as any).location);
      }
      if (!currentValues.contactDepartment && (user as any).department) {
        form.setValue("contactDepartment", (user as any).department);
      }
    }
  }, [user, form]);

  const handleContactSelection = (id: string) => {
    const selected = contactOptions.find(c => c.id.toString() === id);
    if (selected) {
      form.setValue("contactEmail", selected.email);
      form.setValue("contactName", selected.name);
      form.setValue("contactPhone", selected.contactNumber || "");
      form.setValue("contactDepartment", selected.department || "");
      form.setValue("companyName", selected.companyName || "");
      form.setValue("location", selected.location || "");
      form.setValue("contactId", selected.id.toString());
    }
  };

  const createTicketMutation = useMutation({
    mutationFn: async (data: CreateTicketFormValues) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value && value !== "0") formData.append(key, value as string);
      });
      if (file) formData.append('attachment', file);
      formData.append('status', 'open');
      
      const res = await apiRequest("POST", "/api/tickets", formData);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (res) => {
      toast({ title: "Success", description: "Ticket created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      navigate(`/tickets/${res.id}`);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const onSubmit = (data: CreateTicketFormValues) => createTicketMutation.mutate(data);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="New Ticket" />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 bg-slate-50/10">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto space-y-10">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                   <Button variant="ghost" size="icon" onClick={() => navigate("/tickets")} className="h-10 w-10 rounded-xl hover:bg-white shadow-sm border border-slate-100">
                      <ArrowLeft size={16} className="text-slate-600" />
                   </Button>
                   <h2 className="text-2xl font-bold text-slate-900 tracking-tight">New Ticket</h2>
                </div>
                <div className="flex items-center gap-2 pl-14">
                   <p className="text-sm text-slate-500">Create a new support ticket</p>
                </div>
              </div>
            </div>

            <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden p-2">
              <CardHeader className="p-8 pb-0">
                <CardTitle className="text-xl font-semibold text-slate-900">Ticket Details</CardTitle>
                <p className="text-slate-500 text-sm mt-1">Provide information about the issue</p>
              </CardHeader>
              
              <CardContent className="p-8 pt-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
                    
                    {/* 📍 Core Identification */}
                    <div className="space-y-8">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-700">Subject *</FormLabel>
                            <FormControl>
                              <Input placeholder="Brief description of the issue" className="rounded-xl border-slate-200 h-11 shadow-sm focus:ring-2 focus:ring-blue-600/20 transition-all" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <FormField
                           control={form.control}
                           name="categoryId"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel className="text-sm font-medium text-slate-700">Category *</FormLabel>
                               <FormControl>
                                 <CategorySelection 
                                   type="category" 
                                   onSelect={(v) => { field.onChange(v); setSelectedCategoryId(v); }} 
                                   categories={memoizedCategories.map(c => ({...c, id: String(c.id)}))}
                                   selectedValue={field.value}
                                 />
                               </FormControl>
                               <FormMessage />
                             </FormItem>
                           )}
                         />

                         <FormField
                           control={form.control}
                           name="subcategoryId"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel className="text-sm font-medium text-slate-700">Subcategory</FormLabel>
                               <FormControl>
                                 <CategorySelection 
                                   type="subcategory" 
                                   onSelect={field.onChange} 
                                   categories={memoizedCategories.map(c => ({...c, id: String(c.id)}))}
                                   parentCategoryId={selectedCategoryId}
                                   selectedValue={field.value}
                                 />
                               </FormControl>
                             </FormItem>
                           )}
                         />

                         <FormField
                           control={form.control}
                           name="priority"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel className="text-sm font-medium text-slate-700">Priority *</FormLabel>
                               <Select onValueChange={field.onChange} value={field.value}>
                                 <FormControl>
                                   <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm"><SelectValue /></SelectTrigger>
                                 </FormControl>
                                 <SelectContent className="rounded-xl shadow-lg border-slate-100">
                                   <SelectItem value="low">Low</SelectItem>
                                   <SelectItem value="medium">Medium</SelectItem>
                                   <SelectItem value="high">High</SelectItem>
                                 </SelectContent>
                               </Select>
                             </FormItem>
                           )}
                         />

                         <FormField
                           control={form.control}
                           name="supportType"
                           render={({ field }) => (
                             <FormItem>
                               <FormLabel className="text-sm font-medium text-slate-700">Support Type</FormLabel>
                               <Select onValueChange={field.onChange} value={field.value}>
                                 <FormControl>
                                   <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm"><SelectValue /></SelectTrigger>
                                 </FormControl>
                                 <SelectContent className="rounded-xl shadow-lg border-slate-100">
                                   <SelectItem value="remote">Remote</SelectItem>
                                   <SelectItem value="telephonic">Telephonic</SelectItem>
                                   <SelectItem value="onsite_visit">Onsite Visit</SelectItem>
                                   <SelectItem value="other">Other</SelectItem>
                                 </SelectContent>
                               </Select>
                             </FormItem>
                           )}
                         />
                      </div>
                    </div>

                    {hasAnyRole(user?.role, ["admin", "agent"]) && (
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6">
                          <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                             Agent Assignment
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <FormField
                                control={form.control}
                                name="assignedToId"
                                render={({ field }) => (
                                  <FormItem>
                                    <div className="flex items-center justify-between mb-2">
                                      <FormLabel className="text-sm font-medium text-slate-700">Assign To</FormLabel>
                                      <button type="button" onClick={() => form.setValue("assignedToId", user?.id?.toString() || "0")} className="text-xs text-blue-600 font-medium hover:underline">
                                        Assign to me
                                      </button>
                                    </div>
                                    <FormControl>
                                      <UserSelection 
                                        type="agent" 
                                        onSelect={field.onChange} 
                                        users={agentOptions.map(u => ({ 
                                          id: String(u.id), 
                                          username: u.name || u.username, 
                                          email: u.email, 
                                          role: String(u.role)
                                        }))}
                                        selectedValue={field.value}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                 control={form.control}
                                 name="dueDate"
                                 render={({ field }) => (
                                   <FormItem>
                                     <FormLabel className="text-sm font-medium text-slate-700 mb-2 block">Due Date</FormLabel>
                                     <FormControl>
                                       <Input type="datetime-local" {...field} className="rounded-xl border-slate-200 h-11 bg-white text-sm" />
                                     </FormControl>
                                   </FormItem>
                                 )}
                              />
                          </div>
                      </div>
                    )}

                    {/* 👤 Requester Persona */}
                    <div className="space-y-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="space-y-1">
                           <h3 className="text-lg font-semibold text-slate-800">Contact Details</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {hasAnyRole(user?.role, ["admin", "agent"]) && (
                              <FormField
                                control={form.control}
                                name="contactId"
                                render={() => (
                                  <FormItem className="md:col-span-2">
                                    <FormLabel className="text-sm font-medium text-slate-700">Select User</FormLabel>
                                    <UserSelection 
                                      type="user"
                                      onSelect={handleContactSelection} 
                                      users={contactOptions.map(u => ({
                                        id: String(u.id),
                                        username: u.name || u.username,
                                        email: u.email,
                                        role: String(u.role)
                                      }))} 
                                    />
                                  </FormItem>
                                )}
                              />
                            )}
                            
                            <FormField control={form.control} name="contactName" render={({ field }) => (
                              <FormItem><FormLabel className="text-sm font-medium text-slate-700">Name</FormLabel><FormControl><Input className="rounded-xl border-slate-200 h-11" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="contactEmail" render={({ field }) => (
                              <FormItem><FormLabel className="text-sm font-medium text-slate-700">Email</FormLabel><FormControl><Input className="rounded-xl border-slate-200 h-11" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="contactPhone" render={({ field }) => (
                              <FormItem><FormLabel className="text-sm font-medium text-slate-700">Phone</FormLabel><FormControl><Input className="rounded-xl border-slate-200 h-11" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="companyName" render={({ field }) => (
                              <FormItem><FormLabel className="text-sm font-medium text-slate-700">Company</FormLabel><FormControl><Input className="rounded-xl border-slate-200 h-11" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="location" render={({ field }) => (
                              <FormItem className="md:col-span-2"><FormLabel className="text-sm font-medium text-slate-700">Location</FormLabel><FormControl><Input className="rounded-xl border-slate-200 h-11" {...field} /></FormControl></FormItem>
                            )} />
                        </div>
                    </div>

                    {/* 📝 Technical Narrative */}
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-700">Description</FormLabel>
                            <FormControl>
                              <Textarea rows={6} placeholder="Please provide details about the issue..." className="rounded-xl border-slate-200 p-4 text-sm focus:ring-2 focus:ring-blue-600/20 transition-all resize-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                       <div className="space-y-1">
                          <FormLabel className="text-base font-semibold text-slate-800">Attachment</FormLabel>
                          <p className="text-xs text-slate-500">Max 10MB | PDF, JPG, PNG, DOCX</p>
                       </div>
                       <div className="w-full md:w-auto min-w-[300px]">
                          <Input type="file" className="bg-white border-slate-200 rounded-xl h-11 pt-2.5 text-sm" onChange={e => {
                            if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                          }} />
                          {file && <p className="text-xs text-slate-600 mt-2 font-medium">Selected: {file.name}</p>}
                       </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-6">
                      <Button type="button" variant="ghost" onClick={() => navigate("/tickets")} className="h-11 px-6 rounded-xl text-sm font-medium text-slate-600">
                         Cancel
                      </Button>
                      <Button type="submit" disabled={createTicketMutation.isPending} className="h-11 px-8 rounded-xl bg-blue-600 text-white font-medium text-sm shadow-sm hover:bg-blue-700 transition-all">
                        {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    </div>

  );
}
