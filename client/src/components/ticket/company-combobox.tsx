import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/queryClient"

interface CompanyComboboxProps {
    value: string
    onChange: (value: string) => void
    disabled?: boolean
}

import { Plus } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

export function CompanyCombobox({ value, onChange, disabled }: CompanyComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [showAddDialog, setShowAddDialog] = React.useState(false)
    const [newCompany, setNewCompany] = React.useState("")
    const [newDomain, setNewDomain] = React.useState("")
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const { data: companies = [], isLoading, isError, error } = useQuery<string[]>({
        queryKey: ["/api/companies"],
        queryFn: async () => {
            try {
                const res = await apiRequest("GET", "/api/companies")

                if (!res.ok) {
                    const errorText = await res.text()
                    throw new Error(`Failed to fetch companies: ${res.status} ${errorText}`)
                }

                const data = await res.json()

                // Ensure we return an array
                if (!Array.isArray(data)) {
                    return []
                }

                return data
            } catch (err) {
                throw err
            }
        },
        retry: 2,
        staleTime: 30000, // 30 seconds
    })



    // Filter companies based on search
    const filteredCompanies = React.useMemo(() => {
        if (!search) return companies
        return companies.filter((company) =>
            company.toLowerCase().includes(search.toLowerCase())
        )
    }, [companies, search])

    const createCompanyMutation = useMutation({
        mutationFn: async (data: { companyName: string, domain: string }) => {
            const res = await apiRequest("POST", "/api/domains", {
                companyName: data.companyName,
                domain: data.domain || "", // Allow blank domain
                description: "Added via ticket form"
            })
            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || "Failed to create company")
            }
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/companies"] })
            onChange(newCompany)
            setShowAddDialog(false)
            setNewCompany("")
            setNewDomain("")
            setSearch("")
            toast({
                title: "Company added",
                description: "The new company has been added successfully.",
            })
        },
        onError: (error: Error) => {
            toast({
                title: "Failed to add company",
                description: error.message,
                variant: "destructive",
            })
        }
    })

    const handleCreateCompany = () => {
        if (!newCompany) return
        createCompanyMutation.mutate({ companyName: newCompany, domain: newDomain })
    }

    const handleOpenAddDialog = () => {
        setNewCompany(search)
        setOpen(false)
        setShowAddDialog(true)
    }

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                        disabled={disabled || isLoading}
                    >
                        {isLoading ? "Loading..." : value || "Select company..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search company..."
                            value={search}
                            onValueChange={setSearch}
                        />
                        <CommandList>
                            {isError ? (
                                <CommandEmpty className="py-4 px-2">
                                    <p className="text-sm text-red-600 text-center pb-2">
                                        ⚠️ Error loading companies
                                    </p>
                                    <p className="text-xs text-gray-500 text-center pb-3">
                                        {error?.message || "Failed to fetch companies from server"}
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-sm h-8"
                                        onClick={handleOpenAddDialog}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add New Company
                                    </Button>
                                </CommandEmpty>
                            ) : filteredCompanies.length === 0 ? (
                                <CommandEmpty className="py-2 px-2">
                                    <p className="text-sm text-muted-foreground text-center pb-2">
                                        {isLoading
                                            ? "Loading companies..."
                                            : search
                                                ? `No company found matching "${search}"`
                                                : "No companies available"}
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-sm h-8"
                                        onClick={handleOpenAddDialog}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {search ? `Create "${search}"` : "Add New Company"}
                                    </Button>
                                </CommandEmpty>
                            ) : (
                                <>
                                    <CommandGroup heading="Companies">
                                        {filteredCompanies.map((company) => (
                                            <CommandItem
                                                key={company}
                                                value={company}
                                                onSelect={() => {
                                                    onChange(company)
                                                    setOpen(false)
                                                    setSearch("")
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        value === company ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {company}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                    <CommandGroup>
                                        <CommandItem
                                            onSelect={handleOpenAddDialog}
                                            className="justify-center text-sm text-primary"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add New Company
                                        </CommandItem>
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Company</DialogTitle>
                        <DialogDescription>
                            Add a new company to the allowed domains list. The domain field is optional.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Company Name *</Label>
                            <Input
                                id="name"
                                value={newCompany}
                                onChange={(e) => setNewCompany(e.target.value)}
                                placeholder="Enter company name"
                                autoFocus
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="domain">Domain (Optional)</Label>
                            <Input
                                id="domain"
                                value={newDomain}
                                onChange={(e) => setNewDomain(e.target.value)}
                                placeholder="example.com or @example.com"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreateCompany}
                            disabled={createCompanyMutation.isPending || !newCompany.trim()}
                        >
                            {createCompanyMutation.isPending ? "Adding..." : "Add Company"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
