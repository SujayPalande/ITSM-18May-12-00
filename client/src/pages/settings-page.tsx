import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasRole, hasAnyRole } from "@/lib/role-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Mail,
  Phone,
  Building,
  UserCheck,
  Key,
  Download,
  Upload,
  Trash2,
  Save,
  Settings,
  Eye,
  EyeOff,
  Plus,
  Edit,
  Check,
  X
} from "lucide-react";

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  companyName: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  contactNumber: z.string().optional(),
});

// Password form schema
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Notification preferences schema
const notificationFormSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  ticketUpdates: z.boolean(),
  assignmentNotifications: z.boolean(),
  weeklyReports: z.boolean(),
  maintenanceAlerts: z.boolean(),
});

// Theme preferences schema
const themeFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
  language: z.enum(["en", "es", "fr", "de", "pt"]),
  timezone: z.string(),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  timeFormat: z.enum(["12", "24"]),
});

// Domain management schema
const domainFormSchema = z.object({
  domain: z.string().min(1, "Domain is required").regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/, "Invalid domain format"),
  companyName: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;
type PasswordFormData = z.infer<typeof passwordFormSchema>;
type NotificationFormData = z.infer<typeof notificationFormSchema>;
type ThemeFormData = z.infer<typeof themeFormSchema>;
type DomainFormData = z.infer<typeof domainFormSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = window.innerWidth < 768;
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [editingDomain, setEditingDomain] = useState<number | null>(null);
  const [showAddDomain, setShowAddDomain] = useState(false);

  // Check if user can manage domains (admin or agent)
  const canManageDomains = hasAnyRole(user?.role, ['admin', 'agent']);

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      companyName: user?.companyName || "",
      department: user?.department || "",
      designation: user?.designation || "",
      contactNumber: user?.contactNumber || "",
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notification form
  const notificationForm = useForm<NotificationFormData>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: true,
      ticketUpdates: true,
      assignmentNotifications: true,
      weeklyReports: false,
      maintenanceAlerts: true,
    },
  });

  // Theme form
  const themeForm = useForm<ThemeFormData>({
    resolver: zodResolver(themeFormSchema),
    defaultValues: {
      theme: "system",
      language: "en",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12",
    },
  });

  // Domain form
  const domainForm = useForm<DomainFormData>({
    resolver: zodResolver(domainFormSchema),
    defaultValues: {
      domain: "",
      companyName: "",
      description: "",
    },
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("PUT", `/api/users/${user?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Password update mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      return await apiRequest("PUT", `/api/users/${user?.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update password",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/users/${user?.id}/export`);
      return response;
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-data-${user?.username}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data exported",
        description: "Your data has been exported successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch allowed domains
  const { data: allowedDomains, isLoading: domainsLoading } = useQuery({
    queryKey: ["/api/domains"],
    queryFn: async () => {
      if (!canManageDomains) return [];
      const res = await apiRequest("GET", "/api/domains");
      return await res.json();
    },
    enabled: canManageDomains,
  });

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async (data: DomainFormData) => {
      return await apiRequest("POST", "/api/domains", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      domainForm.reset();
      setShowAddDomain(false);
      toast({
        title: "Domain added",
        description: "The domain has been added successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update domain mutation
  const updateDomainMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DomainFormData> }) => {
      return await apiRequest("PUT", `/api/domains/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      setEditingDomain(null);
      toast({
        title: "Domain updated",
        description: "The domain has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/domains/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({
        title: "Domain deleted",
        description: "The domain has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle domain status mutation
  const toggleDomainMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest("PUT", `/api/domains/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      toast({
        title: "Domain updated",
        description: "Domain status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update domain",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    updatePasswordMutation.mutate(data);
  };

  const onNotificationSubmit = (data: NotificationFormData) => {
    // Save notification preferences locally or to backend
    localStorage.setItem("notificationPreferences", JSON.stringify(data));
    toast({
      title: "Preferences saved",
      description: "Your notification preferences have been saved.",
    });
  };

  const onThemeSubmit = (data: ThemeFormData) => {
    // Save theme preferences locally
    localStorage.setItem("themePreferences", JSON.stringify(data));
    
    // Apply theme changes to document instantly
    if (data.theme === 'dark') document.documentElement.classList.add('dark');
    else if (data.theme === 'light') document.documentElement.classList.remove('dark');
    else if (data.theme === 'system') {
       if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
       } else {
          document.documentElement.classList.remove('dark');
       }
    }

    toast({
      title: "Preferences saved",
      description: "Your appearance preferences have been saved.",
    });
  };

  const onDomainSubmit = (data: DomainFormData) => {
    addDomainMutation.mutate(data);
  };

  const handleEditDomain = (domain: any) => {
    setEditingDomain(domain.id);
    domainForm.setValue("domain", domain.domain);
    domainForm.setValue("companyName", domain.companyName);
    domainForm.setValue("description", domain.description || "");
  };

  const handleUpdateDomain = (domainId: number) => {
    const formData = domainForm.getValues();
    updateDomainMutation.mutate({ id: domainId, data: formData });
  };

  const handleCancelEdit = () => {
    setEditingDomain(null);
    domainForm.reset();
  };

  const handleToggleDomain = (id: number, currentStatus: boolean) => {
    toggleDomainMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleDeleteDomain = (id: number) => {
    if (confirm("Are you sure you want to delete this domain? This action cannot be undone.")) {
      deleteDomainMutation.mutate(id);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Settings" />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                <p className="text-slate-500">Manage your account settings and preferences</p>
              </div>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className={`grid w-full ${canManageDomains ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-5'}`}>
                <TabsTrigger value="profile" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="security" className="flex items-center space-x-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Security</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center space-x-2">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Appearance</span>
                </TabsTrigger>
                {canManageDomains && (
                  <TabsTrigger value="domains" className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span className="hidden sm:inline">Domains</span>
                  </TabsTrigger>
                )}
                <TabsTrigger value="data" className="flex items-center space-x-2">
                  <Database className="h-4 w-4" />
                  <span className="hidden sm:inline">Data</span>
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Profile Information</span>
                    </CardTitle>
                    <CardDescription>
                      Update your personal information and contact details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="your.email@company.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your company" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your department" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="designation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your job title" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="contactNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="+1 (555) 123-4567" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={updateProfileMutation.isPending}
                            className="flex items-center space-x-2"
                          >
                            <Save className="h-4 w-4" />
                            <span>{updateProfileMutation.isPending ? "Saving..." : "Save Changes"}</span>
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Account Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>View your account details and status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Username</Label>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{user?.username}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <div className="flex items-center space-x-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <Badge variant="secondary" className="capitalize">{user?.role}</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Created</Label>
                        <p className="text-sm text-slate-600">
                          {user?.createdAt ? (() => {
                            try {
                              const date = new Date(user.createdAt);
                              return isNaN(date.getTime()) ? "Invalid date" : date.toLocaleDateString();
                            } catch {
                              return "Invalid date";
                            }
                          })() : "N/A"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Account Status</Label>
                        <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="h-5 w-5" />
                      <span>Change Password</span>
                    </CardTitle>
                    <CardDescription>
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showCurrentPassword ? "text" : "password"}
                                    placeholder="Enter your current password" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                  >
                                    {showCurrentPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input 
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Enter your new password" 
                                    {...field} 
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                  >
                                    {showNewPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Password must be at least 6 characters long
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input 
                                  type="password"
                                  placeholder="Confirm your new password" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end">
                          <Button 
                            type="submit" 
                            disabled={updatePasswordMutation.isPending}
                            className="flex items-center space-x-2"
                          >
                            <Key className="h-4 w-4" />
                            <span>{updatePasswordMutation.isPending ? "Updating..." : "Update Password"}</span>
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Additional security options for your account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Enable 2FA
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Login Notifications</Label>
                        <p className="text-sm text-slate-500">Get notified when someone signs into your account</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Bell className="h-5 w-5" />
                      <span>Notification Preferences</span>
                    </CardTitle>
                    <CardDescription>
                      Choose what notifications you want to receive
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...notificationForm}>
                      <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                        <div className="space-y-4">
                          <FormField
                            control={notificationForm.control}
                            name="emailNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base flex items-center space-x-2">
                                    <Mail className="h-4 w-4" />
                                    <span>Email Notifications</span>
                                  </FormLabel>
                                  <FormDescription>
                                    Receive notifications via email
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationForm.control}
                            name="pushNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base flex items-center space-x-2">
                                    <Bell className="h-4 w-4" />
                                    <span>Push Notifications</span>
                                  </FormLabel>
                                  <FormDescription>
                                    Receive push notifications in your browser
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationForm.control}
                            name="ticketUpdates"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Ticket Updates</FormLabel>
                                  <FormDescription>
                                    Get notified when your tickets are updated
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationForm.control}
                            name="assignmentNotifications"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Assignment Notifications</FormLabel>
                                  <FormDescription>
                                    Get notified when tickets are assigned to you
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationForm.control}
                            name="weeklyReports"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Weekly Reports</FormLabel>
                                  <FormDescription>
                                    Receive weekly summary reports
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={notificationForm.control}
                            name="maintenanceAlerts"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Maintenance Alerts</FormLabel>
                                  <FormDescription>
                                    Get notified about system maintenance
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button type="submit" className="flex items-center space-x-2">
                            <Save className="h-4 w-4" />
                            <span>Save Preferences</span>
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Appearance Tab */}
              <TabsContent value="appearance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Palette className="h-5 w-5" />
                      <span>Appearance & Language</span>
                    </CardTitle>
                    <CardDescription>
                      Customize how the application looks and behaves
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...themeForm}>
                      <form onSubmit={themeForm.handleSubmit(onThemeSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={themeForm.control}
                            name="theme"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Theme</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select theme" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="light">Light</SelectItem>
                                    <SelectItem value="dark">Dark</SelectItem>
                                    <SelectItem value="system">System</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Choose your preferred color scheme
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={themeForm.control}
                            name="language"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Language</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="es">Español</SelectItem>
                                    <SelectItem value="fr">Français</SelectItem>
                                    <SelectItem value="de">Deutsch</SelectItem>
                                    <SelectItem value="pt">Português</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={themeForm.control}
                            name="timezone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Timezone</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select timezone" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="UTC">UTC</SelectItem>
                                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                                    <SelectItem value="Europe/London">London</SelectItem>
                                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={themeForm.control}
                            name="dateFormat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Date Format</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select date format" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={themeForm.control}
                            name="timeFormat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Time Format</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select time format" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="12">12-hour (AM/PM)</SelectItem>
                                    <SelectItem value="24">24-hour</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button type="submit" className="flex items-center space-x-2">
                            <Save className="h-4 w-4" />
                            <span>Save Preferences</span>
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Domain Management Tab */}
              {canManageDomains && (
                <TabsContent value="domains" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-5 w-5" />
                          <div>
                            <CardTitle>Domain Management</CardTitle>
                            <CardDescription>
                              Manage allowed email domains for user registration and login
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          onClick={() => setShowAddDomain(true)}
                          className="flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add Domain</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Add Domain Form */}
                      {showAddDomain && (
                        <Card className="mb-6">
                          <CardHeader>
                            <CardTitle className="text-lg">Add New Domain</CardTitle>
                            <CardDescription>
                              Add a new email domain that users can register with
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Form {...domainForm}>
                              <form onSubmit={domainForm.handleSubmit(onDomainSubmit)} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <FormField
                                    control={domainForm.control}
                                    name="domain"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Domain</FormLabel>
                                        <FormControl>
                                          <Input placeholder="example.com" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                          Enter the email domain (e.g., company.com)
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={domainForm.control}
                                    name="companyName"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Company Name</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Company Inc." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <FormField
                                  control={domainForm.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description (Optional)</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Additional notes about this domain..."
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="flex justify-end space-x-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      setShowAddDomain(false);
                                      domainForm.reset();
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="submit"
                                    disabled={addDomainMutation.isPending}
                                    className="flex items-center space-x-2"
                                  >
                                    <Plus className="h-4 w-4" />
                                    <span>{addDomainMutation.isPending ? "Adding..." : "Add Domain"}</span>
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </CardContent>
                        </Card>
                      )}

                      {/* Domains List */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium">Allowed Domains</h3>
                          {allowedDomains && (
                            <Badge variant="secondary">
                              {allowedDomains.length} domain{allowedDomains.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>

                        {domainsLoading ? (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-slate-500">Loading domains...</p>
                          </div>
                        ) : allowedDomains && allowedDomains.length > 0 ? (
                          <div className="grid gap-4">
                            {allowedDomains.map((domain: any) => (
                              <Card key={domain.id} className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    {editingDomain === domain.id ? (
                                      <Form {...domainForm}>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <FormField
                                            control={domainForm.control}
                                            name="domain"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={domainForm.control}
                                            name="companyName"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={domainForm.control}
                                            name="description"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormControl>
                                                  <Input placeholder="Description..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                        </div>
                                      </Form>
                                    ) : (
                                      <div>
                                        <div className="flex items-center space-x-3">
                                          <h4 className="font-medium text-lg">{domain.domain}</h4>
                                          <Badge variant={domain.isActive ? "default" : "secondary"}>
                                            {domain.isActive ? "Active" : "Inactive"}
                                          </Badge>
                                        </div>
                                        <p className="text-slate-600 font-medium">{domain.companyName}</p>
                                        {domain.description && (
                                          <p className="text-slate-500 text-sm mt-1">{domain.description}</p>
                                        )}
                                        <p className="text-xs text-slate-400 mt-2">
                                          Added {new Date(domain.createdAt).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center space-x-2 ml-4">
                                    {editingDomain === domain.id ? (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateDomain(domain.id)}
                                          disabled={updateDomainMutation.isPending}
                                          className="flex items-center space-x-1"
                                        >
                                          <Check className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={handleCancelEdit}
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleEditDomain(domain)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={domain.isActive ? "secondary" : "default"}
                                          onClick={() => handleToggleDomain(domain.id, domain.isActive)}
                                          disabled={toggleDomainMutation.isPending}
                                        >
                                          {domain.isActive ? "Disable" : "Enable"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleDeleteDomain(domain.id)}
                                          disabled={deleteDomainMutation.isPending}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <Card className="p-8 text-center">
                            <Globe className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 mb-2">No domains configured</h3>
                            <p className="text-slate-500 mb-4">
                              Add email domains to control which users can register and access the portal.
                            </p>
                            <Button onClick={() => setShowAddDomain(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Domain
                            </Button>
                          </Card>
                        )}
                      </div>

                      <Separator className="my-6" />

                      {/* Domain Usage Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">How Domain Restrictions Work</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Users can only register with email addresses from allowed domains</li>
                          <li>• Existing users from restricted domains will not be able to log in</li>
                          <li>• Inactive domains are temporarily disabled but can be re-enabled</li>
                          <li>• Changes take effect immediately for new registrations and logins</li>
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Data Tab */}
              <TabsContent value="data" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="h-5 w-5" />
                      <span>Data Management</span>
                    </CardTitle>
                    <CardDescription>
                      Export your data or manage your account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <Label className="text-base">Export Data</Label>
                          <p className="text-sm text-slate-500">
                            Download a copy of all your data including tickets, comments, and profile information
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => exportDataMutation.mutate()}
                          disabled={exportDataMutation.isPending}
                          className="flex items-center space-x-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>{exportDataMutation.isPending ? "Exporting..." : "Export Data"}</span>
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <Label className="text-base">Import Data</Label>
                          <p className="text-sm text-slate-500">
                            Import data from a previous export file
                          </p>
                        </div>
                        <Button variant="outline" className="flex items-center space-x-2">
                          <Upload className="h-4 w-4" />
                          <span>Import Data</span>
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                      <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                        <div className="space-y-0.5">
                          <Label className="text-base text-red-900">Delete Account</Label>
                          <p className="text-sm text-red-700">
                            permanently delete your account and all associated data. This action cannot be undone.
                          </p>
                        </div>
                        <Button variant="destructive" className="flex items-center space-x-2">
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Account</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
