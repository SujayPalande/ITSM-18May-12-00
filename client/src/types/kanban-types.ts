export interface SLAStatus {
    status: 'ok' | 'warning' | 'breached' | 'on-hold';
    remainingHours?: number;
    dueDate?: Date;
}

export interface ExtendedTicket {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: 'low' | 'medium' | 'high';
    categoryId: number;
    categoryName?: string;
    subcategoryId?: number | null;
    subcategoryName?: string | null;
    assignedTo?: number | null;
    assignedAgent?: {
        id: number;
        name: string;
        avatar?: string;
    };
    createdBy: number;
    createdAt: string;
    updatedAt: string;
    commentCount: number;
    attachmentCount?: number;
    timeSpent?: number;
    sla: SLAStatus;
    ticketType?: 'incident' | 'service-request' | 'problem' | 'change';
    department?: string;
}

export interface KanbanColumn {
    id: string;
    title: string;
    status: string;
    tickets: ExtendedTicket[];
    color?: string;
}

export interface KanbanFilters {
    search?: string;
    priority?: string;
    ticketType?: string;
    agent?: string;
    department?: string;
    slaStatus?: string;
}

export const TICKET_STATUSES = [
    { id: 'open', title: 'Open', status: 'open', color: '#3B82F6' },
    { id: 'in-progress', title: 'In Progress', status: 'in-progress', color: '#F59E0B' },
    { id: 'closed', title: 'Closed', status: 'closed', color: '#6B7280' },
] as const;
