import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KanbanCard } from './kanban-card';
import { ExtendedTicket } from '@/types/kanban-types';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
    id: string;
    title: string;
    tickets: ExtendedTicket[];
    color?: string;
}

export function KanbanColumn({ id, title, tickets, color }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div className="flex-shrink-0 w-80">
            <Card className={cn(
                "h-full flex flex-col bg-slate-50/50 border-slate-200",
                isOver && "ring-2 ring-primary ring-offset-2"
            )}>
                {/* Column Header */}
                <div className="p-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: color || '#3B82F6' }}
                            />
                            {title}
                        </h3>
                        <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                            {tickets.length}
                        </Badge>
                    </div>
                </div>

                {/* Scrollable Card Area */}
                <div
                    ref={setNodeRef}
                    className={cn(
                        "flex-1 overflow-y-auto p-3 space-y-2",
                        "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
                        isOver && "bg-primary/5"
                    )}
                >
                    <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        {tickets.length > 0 ? (
                            tickets.map((ticket) => (
                                <KanbanCard key={ticket.id} ticket={ticket} />
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-32 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                                Drop tickets here
                            </div>
                        )}
                    </SortableContext>
                </div>
            </Card>
        </div>
    );
}
