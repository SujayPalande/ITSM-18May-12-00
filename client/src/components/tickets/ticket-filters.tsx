import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, Check, ChevronsUpDown } from "lucide-react";
import { Category, User } from "@shared/schema";
import { hasAnyRole } from "@/lib/role-utils";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FilterState {
  status?: string;
  priority?: string;
  categoryId?: number;
  assignedToId?: number;
  companyName?: string;
}

interface TicketFiltersProps {
  categories: Category[];
  users?: User[];
  tickets?: any[];
  showAssigneeFilter?: boolean;
  initialFilters?: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function TicketFilters({
  categories,
  users = [],
  tickets = [],
  showAssigneeFilter = false,
  initialFilters = {},
  onFilterChange,
}: TicketFiltersProps) {
  // Always default to Unassigned if initialFilters not set
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  // Apply filters
  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  // Reset filters
  const handleResetFilters = () => {
    const resetFilters = {
      status: undefined,
      priority: undefined,
      categoryId: undefined,
      assignedToId: undefined
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  // Apply filters automatically when local state changes
  useEffect(() => {
    // Only call if filters actually changed to avoid infinite loops/resets
    onFilterChange(filters);
  }, [filters]);

  // Get parent categories (no parentId)
  const parentCategories = categories.filter(c => !c.parentId);

  // Fetch company names from API
  const { data: companies, isLoading: isLoadingCompanies } = useQuery<string[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/companies");
      return await res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const uniqueCompanies = companies || [];

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Select
              value={filters.status || "all-statuses"}
              onValueChange={(value) => setFilters({ ...filters, status: value !== "all-statuses" ? value : undefined })}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-statuses">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <Select
              value={filters.priority || "all-priorities"}
              onValueChange={(value) => setFilters({ ...filters, priority: value !== "all-priorities" ? value : undefined })}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-priorities">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <Select
              value={filters.categoryId?.toString() || "all-categories"}
              onValueChange={(value) => setFilters({
                ...filters,
                categoryId: value !== "all-categories" ? parseInt(value) : undefined
              })}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-categories">All Categories</SelectItem>
                {parentCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showAssigneeFilter && (
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <Select
                value={filters.assignedToId === 0 ? "unassigned" : (typeof filters.assignedToId === 'undefined' ? "all-agents" : filters.assignedToId.toString())}
                onValueChange={(value) => {
                  if (value === "unassigned") {
                    setFilters({ ...filters, assignedToId: 0 });
                  } else if (value === "all-agents") {
                    // Remove assignedToId from filters
                    const { assignedToId, ...rest } = filters;
                    setFilters(rest);
                  } else {
                    setFilters({ ...filters, assignedToId: parseInt(value) });
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select Assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-agents">All Agents</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.filter(u => hasAnyRole(u.role, ["agent", "admin"])).map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.username} - {user.email} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Company Name Filter */}
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <Popover open={companyDropdownOpen} onOpenChange={setCompanyDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={companyDropdownOpen}
                  className="w-full sm:w-48 justify-between"
                >
                  {filters.companyName
                    ? uniqueCompanies.find((company) => company === filters.companyName)
                    : "All Companies"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Search company..." />
                  <CommandEmpty>No company found.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    <CommandItem
                      value="all-companies"
                      onSelect={() => {
                        setFilters({ ...filters, companyName: undefined });
                        setCompanyDropdownOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !filters.companyName ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Companies
                    </CommandItem>
                    {uniqueCompanies.map((company) => (
                      <CommandItem
                        key={company}
                        value={company}
                        onSelect={(currentValue) => {
                          setFilters({
                            ...filters,
                            companyName: currentValue === filters.companyName ? undefined : currentValue
                          });
                          setCompanyDropdownOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filters.companyName === company ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {company}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full sm:w-auto ml-auto flex items-end gap-2">
            <Button variant="outline" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
