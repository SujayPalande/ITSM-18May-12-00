import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasAnyRole } from "@/lib/role-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { PaginationControls } from "@/components/common/pagination-controls";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  UserPlus,
  Edit,
  Trash,
  User as UserIcon,
  ShieldCheck,
  Mail,
  Phone,
  Building,
  Briefcase
} from "lucide-react";
import { User as UserType } from "@shared/schema";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/* ------------------------
   Zod schemas + types
   ------------------------ */

const baseUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "agent", "admin"]).default("user"),
  companyName: z.string().optional(),
  department: z.string().optional(),
  contactNumber: z.string().optional(),
  designation: z.string().optional(),
});

const createUserSchema = baseUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const editUserSchema = baseUserSchema.extend({
  // optional for edit (user may not change password)
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
});

type CreateUserValues = z.infer<typeof createUserSchema>;
type EditUserValues = z.infer<typeof editUserSchema>;

/* ------------------------
   Component
   ------------------------ */

export default function UsersPage(): JSX.Element {
  const { user } = useAuth();

  // Only block if user is not logged in
  if (!user) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 mt-24">
            <h2 className="text-2xl font-bold mb-4 text-slate-900">Please log in</h2>
            <p className="text-slate-700 mb-2">You need to log in to access this page.</p>
          </div>
        </div>
      </div>
    );
  }
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);


  // forms: separate forms for create vs edit to handle different validations
  const addForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      name: "",
      email: "",
      role: "user",
      companyName: "",
      department: "",
      contactNumber: "",
      designation: "",
    },
  });

  const editForm = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: "",
      password: undefined,
      name: "",
      email: "",
      role: "user",
      companyName: "",
      department: "",
      contactNumber: "",
      designation: "",
    },
  });

  /* ------------------------
     Fetch users
     ------------------------ */
  const {
    data: users,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
  } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users");
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to fetch users");
      }
      return await res.json();
    },
    enabled: !!user && hasAnyRole(user?.role, ["admin", "agent"]), // allow agents too
  });

  /* ------------------------
     Mutations
     ------------------------ */

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserValues) => {
      // Use the users endpoint for creating users, not registration
      const res = await apiRequest("POST", "/api/users", data);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to create user");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created", description: "The user was created successfully." });
      setShowAddUserDialog(false);
      addForm.reset();
    },
    onError: (err: any) => {
      console.error('Create user error:', err);
      toast({
        title: "Create failed",
        description: err?.message || "An error occurred while creating user.",
        variant: "destructive",
      });
    },
    // Only allow agents and admins to add users
  });

  const updateUserMutation = useMutation({
    mutationFn: async (payload: { id: string | number; data: EditUserValues }) => {
      const { id, data } = payload;
      // Only send fields that are not empty, null, or unchanged
      const body: Record<string, any> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (
          value !== undefined &&
          value !== null &&
          !(typeof value === 'string' && value.trim() === '')
        ) {
          body[key] = value;
        }
      });

      // Remove password field completely if empty or undefined
      if (!body.password || body.password.trim() === '') {
        delete body.password;
      }

      // Ensure we have at least one field to update
      if (Object.keys(body).length === 0) {
        throw new Error("No changes to save");
      }


      const res = await apiRequest("PUT", `/api/users?id=${String(id)}`, body);
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to update user");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User updated", description: "User details updated successfully." });
      setShowEditDialog(false);
      setEditingUser(null);
      editForm.reset();
    },
    onError: (err: any) => {
      toast({
        title: "Update failed",
        description: err?.message || "An error occurred while updating user.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string | number) => {
      const res = await apiRequest("DELETE", `/api/users?id=${String(id)}`);
      if (!res.ok) {
        const txt = await res.text();
        let errorMessage = "Failed to delete user";
        try {
          const json = JSON.parse(txt);
          if (json && json.error) errorMessage = json.error;
        } catch { }
        // Custom message for users with existing tickets
        if (errorMessage.includes("tickets")) {
          errorMessage = "This user cannot be deleted because they have existing tickets. Please reassign or delete their tickets first.";
        }
        throw new Error(errorMessage);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted", description: "User deleted successfully." });
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    },
    onError: (err: any) => {
      let msg = err?.message || "An error occurred while deleting user.";
      // Show alert for ticket constraint
      if (msg.includes("cannot be deleted because they have existing tickets")) {
        toast({
          title: "Cannot Delete User",
          description: msg,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Delete failed",
          description: msg,
          variant: "destructive",
        });
      }
    },
  });

  /* ------------------------
     UI helpers
     ------------------------ */

  const filteredUsers = users?.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil((filteredUsers?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers?.slice(startIndex, endIndex) || [];

  const formatDate = (d?: string) => {
    if (!d) return "-";
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d || "-";
      return date.toLocaleString();
    } catch {
      return d || "-";
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "agent":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  /* ------------------------
     Handlers
     ------------------------ */

  const openEditFor = (u: UserType) => {
    setEditingUser(u);
    // reset edit form values
    editForm.reset({
      username: u.username,
      password: undefined,
      name: u.name,
      email: u.email,
      role: (u.role as "user" | "agent" | "admin") || "user",
      companyName: (u as any).companyName || "",
      department: (u as any).department || "",
      contactNumber: (u as any).contactNumber || "",
      designation: (u as any).designation || "",
    });
    setShowEditDialog(true);
  };

  const openDeleteFor = (u: UserType) => {
    setUserToDelete(u);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen((s) => !s)} title="Users" />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1600px] mx-auto flex flex-col gap-5 min-h-full">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">Users</h2>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-sm text-slate-500 font-medium">Manage organizational members and roles</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative group w-full sm:w-80">
                  <Input
                    type="text"
                    placeholder="Search personnel by name or ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-12 h-12 bg-white border-slate-200 rounded-2xl text-[13px] font-medium shadow-sm transition-all focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                </div>

                <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
                  <DialogTrigger asChild>
                    <Button className="h-11 px-6 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-all">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-xl overflow-hidden p-0 border-none">
                    <div className="bg-slate-50 border-b border-slate-100 p-6">
                       <h3 className="text-xl font-bold tracking-tight text-slate-800">Add New User</h3>
                       <p className="text-slate-500 text-sm mt-1">Create a new user account and assign roles</p>
                    </div>
                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                      <Form {...addForm}>
                        <form
                          onSubmit={addForm.handleSubmit((data) => createUserMutation.mutate(data))}
                          className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                          <FormField
                            control={addForm.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700">Username *</FormLabel>
                                <FormControl>
                                  <Input placeholder="username" className="border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700">Password *</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" className="border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700">Full Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Full name" className="border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700">Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="user@company.com" className="border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700">Role</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="border-slate-200">
                                        <SelectValue placeholder="Select role" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="agent">Agent</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addForm.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700">Company Name (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Company Name" className="border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700">Department (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Department" className="border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addForm.control}
                            name="contactNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium text-slate-700">Contact Number (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Phone number" className="border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={addForm.control}
                            name="designation"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel className="text-sm font-medium text-slate-700">Designation (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Job Title" className="border-slate-200" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <DialogFooter className="md:col-span-2 pt-4 gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowAddUserDialog(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createUserMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                              {createUserMutation.isPending ? "Creating..." : "Create User"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* 📋 Intelligence Ledger */}
            <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white flex-1">
              <div className="bg-slate-50/40 py-5 px-8 flex items-center justify-between border-b border-slate-100/50">
                 <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">Personnel</span>
                 </div>
                 <Badge className="bg-slate-100 text-slate-700 border-none rounded-lg px-3 py-1 font-medium text-xs">
                    {filteredUsers?.length || 0} Users
                 </Badge>
              </div>

              {isLoadingUsers ? (
                <div className="p-12 space-y-6">
                  {[...Array(6)].map((_, idx) => (
                    <div key={idx} className="flex gap-6 items-center">
                       <Skeleton className="h-12 w-12 rounded-2xl bg-slate-50" />
                       <div className="flex-1 space-y-3">
                          <Skeleton className="h-4 w-1/4 bg-slate-50" />
                          <Skeleton className="h-3 w-1/2 bg-slate-50" />
                       </div>
                    </div>
                  ))}
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  {/* Mobile responsive cards for small screens */}
                  <div className="block lg:hidden divide-y divide-slate-100">
                    {paginatedUsers!.map((u) => (
                      <div key={String(u.id)} className="p-6 space-y-5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-2 ring-slate-50">
                               <AvatarFallback className="bg-slate-900 text-white font-black text-xs">
                                  {u.name?.charAt(0).toUpperCase()}
                               </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{u.name}</div>
                              <div className="text-xs text-slate-500">@{u.username}</div>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest border-opacity-50", getRoleBadgeColor(u.role))}>
                            {u.role}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 px-1">
                           <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                              <Search size={14} className="text-slate-300" /> {u.email}
                           </div>
                           <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Registry: {formatDate((u as any).createdAt)}
                           </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg font-medium text-xs px-3 h-8 border-slate-200"
                              onClick={() => openEditFor(u)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg font-medium text-xs px-3 h-8 text-red-500 hover:bg-red-50"
                              onClick={() => openDeleteFor(u)}
                            >
                              Delete
                            </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Table for larger screens */}
                  <table className="min-w-full hidden lg:table">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-8 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                        <th className="px-8 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-8 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                        <th className="px-8 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                        <th className="px-8 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedUsers!.map((u) => (
                        <tr key={String(u.id)} className="hover:bg-slate-50/30 transition-all group">
                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="flex items-center gap-4">
                              <Avatar className="h-11 w-11 border-2 border-white shadow-sm ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                                <AvatarFallback className="bg-slate-900 text-white font-black text-xs">
                                  {u.name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{u.name}</div>
                                <div className="text-xs text-slate-500">@{u.username}</div>
                              </div>
                            </div>
                          </td>

                          <td className="px-8 py-6 whitespace-nowrap">
                            <div className="text-xs font-semibold text-slate-600">{u.email}</div>
                          </td>

                          <td className="px-8 py-6 whitespace-nowrap">
                            <Badge variant="outline" className={cn("text-xs font-medium py-0.5 border-opacity-50", getRoleBadgeColor(u.role))}>
                              {u.role}
                            </Badge>
                          </td>

                          <td className="px-8 py-6 whitespace-nowrap text-[10px] font-bold text-slate-400 tracking-normal">
                            {formatDate((u as any).createdAt)}
                          </td>

                          <td className="px-8 py-6 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-50"
                                onClick={() => openEditFor(u)}
                              >
                                <Edit size={16} />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-50"
                                onClick={() => openDeleteFor(u)}
                              >
                                <Trash size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* 🔘 Enhanced Pagination */}
                  <div className="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-between mt-auto">
                      <div className="hidden md:block whitespace-nowrap pr-4">
                         <p className="text-sm font-medium text-slate-500">
                            Page {currentPage} of {totalPages}
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
                <div className="p-32 text-center flex flex-col items-center">
                  <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                     <UserIcon size={40} className="text-slate-200" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">No personnel detected</h3>
                  <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-tight">The query string matched zero network identities.</p>
                  <Button onClick={() => setShowAddUserDialog(true)} className="mt-8 rounded-2xl bg-slate-900 hover:bg-black h-12 px-8 font-black uppercase text-[11px] tracking-widest text-white shadow-xl">
                    Enroll New Vector
                  </Button>
                </div>
              )}
            </Card>

            {/* 🛡️ Protocol Intelligence */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { 
                  title: "User Logic", 
                  desc: "Operational users retain ticket creation protocols, status tracking, and KB access vectors.",
                  icon: <UserIcon className="h-4 w-4" />,
                  color: "slate"
                },
                { 
                  title: "Agent Proxy", 
                  desc: "Support agents authorized for ticket resolution, status mutation, and organizational assistance.",
                  icon: <ShieldCheck className="h-4 w-4" />,
                  color: "blue"
                },
                { 
                  title: "Admin Override", 
                  desc: "Maximum privilege level. Full system oversight, personnel management, and global config control.",
                  icon: <ShieldCheck className="h-4 w-4 text-rose-500" />,
                  color: "rose"
                }
              ].map((role, i) => (
                <Card key={i} className="border-none shadow-lg shadow-slate-200/30 rounded-2xl bg-white group overflow-hidden">
                  <CardHeader className="p-5 pb-2">
                     <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 duration-500", {
                        "bg-slate-50 text-slate-600": role.color === "slate",
                        "bg-blue-50 text-blue-600": role.color === "blue",
                        "bg-rose-50 text-rose-600": role.color === "rose",
                     })}>
                        {role.icon}
                     </div>
                     <CardTitle className="text-base font-semibold tracking-tight text-slate-900">{role.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 pt-0">
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                      {role.desc}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Edit Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Update user details and role</DialogDescription>
              </DialogHeader>

              <Form {...editForm}>
                <form
                  onSubmit={editForm.handleSubmit((data) => {
                    if (!editingUser) return;
                    updateUserMutation.mutate({ id: editingUser.id, data });
                  })}
                  className="space-y-3"
                >
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="agent">Agent</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Department" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="designation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Designation (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Job title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password (optional)</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>Leave blank if you don't want to change the password</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateUserMutation.isPending}>
                      {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete confirm */}
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
              </DialogHeader>

              <DialogDescription>
                Are you sure you want to delete user <strong>{userToDelete?.name}</strong>? This action is irreversible.
              </DialogDescription>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancel
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!userToDelete) return;
                    deleteUserMutation.mutate(userToDelete.id);
                  }}
                  disabled={deleteUserMutation.isPending}
                >
                  {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
