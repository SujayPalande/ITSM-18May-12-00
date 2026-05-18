import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { KanbanFilters } from '@/types/kanban-types';

interface KanbanFiltersBarProps {
    filters: KanbanFilters;
    onFilterChange: (filters: KanbanFilters) => void;
    onClearFilters: () => void;
}

export function KanbanFiltersBar({ filters, onFilterChange, onClearFilters }: KanbanFiltersBarProps) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 shadow-sm">
            <div className="flex flex-wrap gap-3">
                {/* Search */}
                <div className="flex-1 min-w-[200px] relative">
                    <Input
                        placeholder="Search tickets..."
                        value={filters.search || ''}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                        className="pl-9 h-9"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>

                {/* Priority Filter */}
                <Select
                    value={filters.priority || 'all'}
                    onValueChange={(value) =>
                        onFilterChange({ ...filters, priority: value === 'all' ? undefined : value })
                    }
                >
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                </Select>

                {/* Ticket Type Filter */}
                <Select
                    value={filters.ticketType || 'all'}
                    onValueChange={(value) =>
                        onFilterChange({ ...filters, ticketType: value === 'all' ? undefined : value })
                    }
                >
                    <SelectTrigger className="w-[160px] h-9">
                        <SelectValue placeholder="Ticket Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="incident">Incident</SelectItem>
                        <SelectItem value="service-request">Service Request</SelectItem>
                        <SelectItem value="problem">Problem</SelectItem>
                        <SelectItem value="change">Change</SelectItem>
                    </SelectContent>
                </Select>

                {/* SLA Status Filter */}
                <Select
                    value={filters.slaStatus || 'all'}
                    onValueChange={(value) =>
                        onFilterChange({ ...filters, slaStatus: value === 'all' ? undefined : value })
                    }
                >
                    <SelectTrigger className="w-[150px] h-9">
                        <SelectValue placeholder="SLA Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All SLA</SelectItem>
                        <SelectItem value="ok">On Track</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="breached">Breached</SelectItem>
                        <SelectItem value="on-hold">On Hold</SelectItem>
                    </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearFilters}
                    className="h-9 px-3"
                >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                </Button>
            </div>
        </div>
    );
}
