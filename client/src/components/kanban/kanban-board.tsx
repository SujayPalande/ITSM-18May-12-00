import { useState, useMemo } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    TouchSensor,
    closestCorners,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { KanbanFiltersBar } from './kanban-filters';
import { ExtendedTicket, KanbanFilters, TICKET_STATUSES } from '@/types/kanban-types';
import { useToast } from '@/hooks/use-toast';

interface KanbanBoardProps {
    tickets: ExtendedTicket[];
    onUpdateTicketStatus: (ticketId: number, newStatus: string) => Promise<void>;
}

export function KanbanBoard({ tickets, onUpdateTicketStatus }: KanbanBoardProps) {
    const [activeTicket, setActiveTicket] = useState<ExtendedTicket | null>(null);
    const [filters, setFilters] = useState<KanbanFilters>({});
    const { toast } = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 6,
            },
        })
    );

    // Filter tickets based on active filters
    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket) => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const matchesSearch =
                    ticket.title.toLowerCase().includes(searchLower) ||
                    ticket.description.toLowerCase().includes(searchLower) ||
                    `#IT-${ticket.id.toString().padStart(4, '0')}`.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            if (filters.priority && ticket.priority !== filters.priority) {
                return false;
            }

            if (filters.ticketType && ticket.ticketType !== filters.ticketType) {
                return false;
            }

            if (filters.slaStatus && ticket.sla.status !== filters.slaStatus) {
                return false;
            }

            return true;
        });
    }, [tickets, filters]);

    // Organize tickets into columns with status mapping
    const columns = useMemo(() => {
        return TICKET_STATUSES.map((columnStatus) => {
            const columnTickets = filteredTickets.filter((ticket) => {
                const status = ticket.status.toLowerCase();

                if (columnStatus.status === 'open') {
                    return ['new', 'assigned', 'pending-user', 'pending-approval', 'open'].includes(status);
                }

                if (columnStatus.status === 'in-progress') {
                    return ['in-progress', 'in_progress'].includes(status);
                }

                if (columnStatus.status === 'closed') {
                    return ['resolved', 'closed'].includes(status);
                }

                return false;
            });

            return {
                ...columnStatus,
                tickets: columnTickets,
            };
        });
    }, [filteredTickets]);

    const handleDragStart = (event: DragStartEvent) => {
        const ticket = tickets.find((t) => t.id === event.active.id);
        setActiveTicket(ticket || null);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTicket(null);

        if (!over) return;

        const ticketId = active.id as number;
        const newStatus = over.id as string;

        const ticket = tickets.find((t) => t.id === ticketId);
        if (!ticket || ticket.status === newStatus) return;

        try {
            await onUpdateTicketStatus(ticketId, newStatus);
            toast({
                title: 'Ticket Updated',
                description: `Ticket moved to ${TICKET_STATUSES.find(s => s.status === newStatus)?.title}`,
            });
        } catch (error) {
            toast({
                title: 'Update Failed',
                description: 'Failed to update ticket status',
                variant: 'destructive',
            });
        }
    };

    const handleClearFilters = () => {
        setFilters({});
    };

    return (
        <div className="space-y-4">
            <KanbanFiltersBar
                filters={filters}
                onFilterChange={setFilters}
                onClearFilters={handleClearFilters}
            />

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4 px-1">
                    {columns.map((column) => (
                        <KanbanColumn
                            key={column.id}
                            id={column.status}
                            title={column.title}
                            tickets={column.tickets}
                            color={column.color}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeTicket ? <KanbanCard ticket={activeTicket} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
