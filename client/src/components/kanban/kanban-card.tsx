import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Paperclip, Clock, AlertCircle } from 'lucide-react';
import { ExtendedTicket } from '@/types/kanban-types';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
    ticket: ExtendedTicket;
}

export function KanbanCard({ ticket }: KanbanCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: ticket.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const getSLAColor = (status: string) => {
        switch (status) {
            case 'ok':
                return 'bg-green-500';
            case 'warning':
                return 'bg-orange-500';
            case 'breached':
                return 'bg-red-500';
            case 'on-hold':
                return 'bg-gray-400';
            default:
                return 'bg-gray-300';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'low':
                return 'bg-green-100 text-green-700 border-green-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group cursor-grab active:cursor-grabbing",
                isDragging && "opacity-50 scale-105"
            )}
        >
            <Card className={cn(
                "p-3 mb-2 border-l-4 transition-all duration-200",
                "hover:shadow-md hover:-translate-y-0.5",
                "bg-white border-slate-100",
                getSLAColor(ticket.sla.status)
            )}>
                {/* Header */}
                <div className="flex items-start justify-between mb-1.5">
                    <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-mono text-slate-400 font-medium">
                                #IT-{ticket.id.toString().padStart(4, '0')}
                            </span>
                            {ticket.sla.status === 'warning' && (
                                <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500" />
                            )}
                            {ticket.sla.status === 'breached' && (
                                <span className="flex h-1.5 w-1.5 rounded-full bg-red-500" />
                            )}
                        </div>
                        <h4 className="text-sm font-medium text-slate-900 truncate" title={ticket.title}>
                            {ticket.title}
                        </h4>
                    </div>
                    <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 h-5 font-medium border-0", getPriorityColor(ticket.priority))}
                    >
                        {ticket.priority}
                    </Badge>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 text-slate-400">
                        {(ticket.commentCount > 0 || (ticket.attachmentCount && ticket.attachmentCount > 0)) && (
                            <div className="flex items-center gap-2 text-[10px]">
                                {ticket.commentCount > 0 && (
                                    <div className="flex items-center gap-0.5 hover:text-slate-600 transition-colors">
                                        <MessageSquare className="h-3 w-3" />
                                        <span>{ticket.commentCount}</span>
                                    </div>
                                )}
                                {ticket.attachmentCount && ticket.attachmentCount > 0 && (
                                    <div className="flex items-center gap-0.5 hover:text-slate-600 transition-colors">
                                        <Paperclip className="h-3 w-3" />
                                        <span>{ticket.attachmentCount}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {ticket.assignedAgent ? (
                            <div className="flex items-center gap-1.5" title={`Assigned to ${ticket.assignedAgent.name}`}>
                                <Avatar className="h-5 w-5 ring-1 ring-white">
                                    <AvatarFallback className="text-[9px] bg-blue-50 text-blue-600 font-medium">
                                        {ticket.assignedAgent.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        ) : (
                            <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center ring-1 ring-white" title="Unassigned">
                                <User className="h-3 w-3 text-slate-400" />
                            </div>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">
                            {formatDate(ticket.updatedAt)}
                        </span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
