import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { hasRole } from "@/lib/role-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  FormMessage 
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { 
  Tag, 
  PlusCircle, 
  Edit, 
  Trash,
  Folder,
  FolderPlus,
  FolderTree,
  MoreVertical
} from "lucide-react";
import { Category } from "@shared/schema";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Form validation schema
const categoryFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name cannot exceed 50 characters"),
  parentId: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoriesPage() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();


  // Initialize form
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      parentId: "",
    },
  });

  // Fetch categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/categories");
      return await res.json();
    },
    enabled: !!user && hasRole(user?.role, "admin"),
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; parentId?: number }) => {
      const res = await apiRequest("POST", "/api/categories", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Category created",
        description: "The category has been created successfully.",
      });
      setShowAddDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create category",
        description: error.message || "An error occurred while creating the category.",
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async (data: { id: number; name: string; parentId?: number }) => {
      const res = await apiRequest("PUT", `/api/categories?id=${data.id}`, {
        name: data.name,
        parentId: data.parentId,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Category updated",
        description: "The category has been updated successfully.",
      });
      setShowEditDialog(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update category",
        description: error.message || "An error occurred while updating the category.",
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/categories?id=${id}`);
      if (!res.ok) {
        const errorText = await res.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
        }
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete category",
        description: error.message || "An error occurred while deleting the category.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: CategoryFormValues) => {
    
    const formData = {
      name: data.name,
      // coerce null to undefined so mutation types accept optional parentId
      parentId: data.parentId && data.parentId !== "" && data.parentId !== "none" 
        ? parseInt(data.parentId) 
        : undefined,
    };



    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        ...formData,
      });
    } else {
      createCategoryMutation.mutate(formData);
    }
  };

  // Handle edit category
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    form.setValue("name", category.name);
    form.setValue("parentId", category.parentId?.toString() || "");
    setShowEditDialog(true);
  };

  // Handle delete category
  const handleDeleteCategory = (id: number) => {
    const category = categories?.find(c => c.id === id);
    const subcategories = getSubcategories(id);
    
    let warningMessage = "Are you sure you want to delete this category? This action cannot be undone.";
    
    if (subcategories.length > 0) {
      warningMessage += `\n\nWARNING: This category has ${subcategories.length} subcategory(ies). You must delete all subcategories first.`;
    }
    
    warningMessage += "\n\nNote: Categories with assigned tickets cannot be deleted.";
    
    if (confirm(warningMessage)) {
      deleteCategoryMutation.mutate(id);
    }
  };

  // Handle add subcategory
  const handleAddSubcategory = (parentId: number) => {
    form.reset();
    form.setValue("parentId", parentId.toString());
    form.setValue("name", "");
    setEditingCategory(null);
    setShowAddDialog(true);
  };

  // Reset form when dialogs close
  const handleCloseDialogs = () => {
    setShowAddDialog(false);
    setShowEditDialog(false);
    setEditingCategory(null);
    form.reset({
      name: "",
      parentId: "",
    });
  };

  // Get parent categories (no parentId)
  const parentCategories = categories?.filter(c => !c.parentId) || [];

  // Get subcategories for a parent
  const getSubcategories = (parentId: number) => {
    return categories?.filter(c => c.parentId === parentId) || [];
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc]">
      <Sidebar isMobile={isMobile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Categories" />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[1500px] mx-auto space-y-8">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight">Category Management</h2>
                <p className="text-sm text-slate-500 mt-1 font-medium">Organize tickets by category</p>
              </div>
              
              <Button 
                className="h-10 px-6 rounded-md bg-blue-600 text-white font-medium text-sm shadow-sm hover:bg-blue-700 transition-all" 
                onClick={() => {
                  form.reset({ name: "", parentId: "" });
                  setEditingCategory(null);
                  setShowAddDialog(true);
                }}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Add Category
              </Button>

              {/* Add Category Dialog */}
              <Dialog open={showAddDialog} onOpenChange={handleCloseDialogs}>
                <DialogContent className="max-w-md rounded-xl overflow-hidden p-0 border border-slate-200">
                  <div className="bg-slate-50 border-b border-slate-200 p-6">
                     <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">New Category</DialogTitle>
                     <DialogDescription className="text-slate-500 text-sm mt-1">Create a new category for tickets</DialogDescription>
                  </div>
                  <div className="p-6">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-slate-700">Category Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Hardware" className="rounded-md border-slate-200 h-10 text-sm shadow-sm" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="parentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-slate-700">Parent Category (Optional)</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger className="rounded-md border-slate-200 h-10 shadow-sm text-sm">
                                    <SelectValue placeholder="None (Top Level)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-md border-slate-200 shadow-md">
                                  <SelectItem value="none">None (Top Level)</SelectItem>
                                  {parentCategories.map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter className="pt-4 gap-2">
                          <Button type="button" variant="outline" onClick={handleCloseDialogs} className="rounded-md h-9 px-4 font-medium text-sm">
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createCategoryMutation.isPending} className="bg-blue-600 hover:bg-blue-700 rounded-md h-9 px-6 font-medium text-sm text-white transition-all shadow-sm">
                            {createCategoryMutation.isPending ? "Saving..." : "Create Category"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit Category Dialog */}
              <Dialog open={showEditDialog} onOpenChange={handleCloseDialogs}>
                <DialogContent className="max-w-md rounded-xl overflow-hidden p-0 border border-slate-200">
                  <div className="bg-slate-50 border-b border-slate-200 p-6">
                     <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">Edit Category</DialogTitle>
                     <DialogDescription className="text-slate-500 text-sm mt-1">Modify category details</DialogDescription>
                  </div>
                  <div className="p-6">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-slate-700">Category Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Category name" className="rounded-md border-slate-200 h-10 shadow-sm text-sm" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="parentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-medium text-slate-700">Parent Category</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger className="rounded-md border-slate-200 h-10 shadow-sm text-sm">
                                    <SelectValue placeholder="None (Top Level)" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-md border-slate-200 shadow-md">
                                  <SelectItem value="none">None (Top Level)</SelectItem>
                                  {parentCategories
                                    .filter(cat => cat.id !== editingCategory?.id)
                                    .map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter className="pt-4 gap-2">
                          <Button type="button" variant="outline" onClick={handleCloseDialogs} className="rounded-md h-9 px-4 font-medium text-sm">
                            Cancel
                          </Button>
                          <Button type="submit" disabled={updateCategoryMutation.isPending} className="bg-blue-600 hover:bg-blue-700 rounded-md h-9 px-6 font-medium text-sm text-white shadow-sm transition-all">
                            {updateCategoryMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* 📊 Categories Canvas */}
            {isLoadingCategories ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="border-none shadow-sm rounded-3xl h-64 bg-white/50">
                    <CardContent className="p-8 space-y-4">
                      <Skeleton className="h-8 w-1/2 rounded-xl bg-slate-50" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full rounded-lg bg-slate-50" />
                        <Skeleton className="h-4 w-2/3 rounded-lg bg-slate-50" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : parentCategories.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {parentCategories.map((category) => {
                  const subcategories = getSubcategories(category.id);
                  return (
                    <Card key={category.id} className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden flex flex-col group h-full">
                      <CardHeader className="p-6 pb-4 relative">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                               <div className="h-8 w-8 bg-blue-50 rounded-md flex items-center justify-center text-blue-600 transition-all">
                                  <Folder className="h-4 w-4" />
                               </div>
                               <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</span>
                            </div>
                            <CardTitle className="text-lg font-semibold text-slate-900 tracking-tight transition-colors">
                              {category.name}
                            </CardTitle>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-slate-50 p-0">
                                <MoreVertical className="h-4 w-4 text-slate-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-md border-slate-200 shadow-md p-1 min-w-[140px]">
                               <DropdownMenuItem onClick={() => handleEditCategory(category)} className="rounded font-medium text-sm gap-2">
                                  <Edit size={14} className="text-blue-600" /> Edit Category
                               </DropdownMenuItem>
                               <DropdownMenuSeparator className="bg-slate-100" />
                               <DropdownMenuItem onClick={() => handleDeleteCategory(category.id)} className="rounded font-medium text-sm gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                                  <Trash size={14} /> Delete Category
                               </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs text-slate-500 mt-4">
                          <span className="font-medium text-slate-700">{subcategories.length}</span> Subcategories
                        </p>
                      </CardHeader>

                      <CardContent className="p-6 pt-0 flex-1">
                        <div className="space-y-2 mt-2">
                          {subcategories.length > 0 ? (
                            subcategories.map((sub) => (
                              <div key={sub.id} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-md shadow-sm hover:border-slate-300 transition-all group/item">
                                <div className="flex items-center gap-2">
                                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                                  <span className="text-sm font-medium text-slate-700">{sub.name}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded hover:bg-slate-200"
                                    onClick={() => handleEditCategory(sub)}
                                  >
                                    <Edit size={14} className="text-slate-500" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 rounded hover:bg-rose-50"
                                    onClick={() => handleDeleteCategory(sub.id)}
                                  >
                                    <Trash size={14} className="text-rose-500" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="py-6 text-center rounded-md border border-dashed border-slate-200">
                               <p className="text-xs font-medium text-slate-500">No Subcategories</p>
                            </div>
                          )}
                        </div>
                      </CardContent>

                      <CardFooter className="p-6 pt-0 mt-auto">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-9 rounded-md border-slate-200 bg-white font-medium text-sm shadow-sm hover:bg-slate-50" 
                          onClick={() => handleAddSubcategory(category.id)}
                        >
                          <PlusCircle className="h-4 w-4 mr-2 text-slate-500" />
                          Add Subcategory
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="py-32 text-center flex flex-col items-center">
                <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                   <FolderTree size={40} className="text-slate-300" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 tracking-tight">No Categories Found</h3>
                <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                  Create categories to help organize and route your tickets efficiently.
                </p>
                <Button onClick={() => setShowAddDialog(true)} className="mt-8 rounded-md bg-blue-600 hover:bg-blue-700 h-10 px-6 font-medium text-sm text-white shadow-sm transition-all">
                  Create First Category
                </Button>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
