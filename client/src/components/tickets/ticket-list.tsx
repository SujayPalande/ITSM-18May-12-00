import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { hasAnyRole } from "@/lib/role-utils";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { PaginationControls } from "@/components/common/pagination-controls";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Paperclip,
  Tag
} from "lucide-react";
import { Ticket, User } from "@shared/schema";

interface TicketWithExtras extends Ticket {
  category?: any;
  subcategory?: any;
  createdBy?: User;
  assignedTo?: User;
  commentCount?: number;
  comments?: any[];
}

interface TicketListProps {
  tickets: TicketWithExtras[];
  showCreatedBy?: boolean;
  showAssignedTo?: boolean;
  isOwner?: boolean;
  changedTicketIds?: Set<number>;
}

export default function TicketList({
  tickets,
  showCreatedBy = false,
  showAssignedTo = false,
  isOwner = false,
  changedTicketIds = new Set()
}: TicketListProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<TicketWithExtras | null>(null);

  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutations (unchanged logic)
  const deleteTicketMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      await apiRequest("DELETE", `/api/tickets/${ticketId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/my"] });
      toast({ title: "Ticket deleted", description: "The ticket has been deleted successfully." });
      setShowDeleteDialog(false);
      setTicketToDelete(null);
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PUT", `/api/tickets/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/my"] });
      toast({ title: "Ticket updated", description: "The ticket status has been updated successfully." });
    },
  });

  const assignTicketMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      await apiRequest("PUT", `/api/tickets/${ticketId}`, { assignedToId: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets/my"] });
      toast({ title: "Ticket assigned", description: "The ticket has been assigned to you." });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "low": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "medium": return "bg-amber-50 text-amber-700 border-amber-100";
      case "high": return "bg-rose-50 text-rose-700 border-rose-100";
      case "urgent": return "bg-red-50 text-red-700 border-red-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open": return "bg-rose-50 text-rose-700 border-rose-100";
      case "in-progress":
      case "in_progress": return "bg-amber-50 text-amber-700 border-amber-100";
      case "closed": return "bg-slate-50 text-slate-700 border-slate-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "open": return <AlertCircle className="h-3.5 w-3.5 text-rose-500" />;
      case "in-progress":
      case "in_progress": return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case "closed": return <CheckCircle className="h-3.5 w-3.5 text-slate-400" />;
      default: return <AlertCircle className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const formatTicketId = (id: number) => `TKT-${id.toString().padStart(4, '0')}`;

  const handleViewTicket = (id: number) => {
    sessionStorage.setItem('ticketReferrer', window.location.pathname.includes('/all-tickets') ? '/all-tickets' : '/tickets');
    navigate(`/tickets/${id}`);
  };

  const canEditTicket = (t: TicketWithExtras) => hasAnyRole(user?.role, ["admin", "agent"]) || (isOwner && t.createdById === user?.id);
  const canDeleteTicket = (t: TicketWithExtras) => hasAnyRole(user?.role, ["admin"]) || (isOwner && t.createdById === user?.id);
  const canAssignTicket = (t: TicketWithExtras) => hasAnyRole(user?.role, ["admin", "agent"]) && t.assignedToId !== user?.id;

  if (!tickets || tickets.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center">
        <AlertCircle size={32} className="text-slate-200 mb-4" />
        <p className="text-sm font-bold text-slate-800">No tickets found</p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-slate-100">
        {tickets.map((ticket) => {
          const isChanged = changedTicketIds.has(ticket.id);
          return (
            <motion.div
              key={ticket.id}
              initial={false}
              className={cn(
                "p-5 md:p-8 transition-all duration-300 relative group",
                isChanged ? "bg-amber-50/50" : "hover:bg-slate-50/50"
              )}
            >
              {isChanged && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1 min-w-0 space-y-4">
                  {/* Meta Row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded bg-slate-50 border border-slate-200 shadow-sm">
                      {getStatusIcon(ticket.status)}
                      <span className="text-xs font-semibold text-slate-900">
                        {formatTicketId(ticket.id)}
                      </span>
                    </div>
                    <Badge variant="outline" className={cn("text-[11px] font-medium px-2 py-0 border-opacity-50", getPriorityColor(ticket.priority))}>
                      {ticket.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[11px] font-medium px-2 py-0 border-opacity-50", getStatusColor(ticket.status))}>
                      {ticket.status === "in_progress" ? "In Progress" : ticket.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  </div>

                  {/* Title & Desc */}
                  <div>
                    <h3 
                      className="text-base font-semibold text-slate-900 mb-1 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleViewTicket(ticket.id)}
                    >
                      {ticket.title}
                    </h3>
                    <p className="text-slate-500 text-sm line-clamp-1 font-medium max-w-3xl">
                      {ticket.description}
                    </p>
                  </div>

                  {/* Info Row */}
                  <div className="flex flex-wrap items-center gap-6 pt-2">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-xs font-medium text-slate-500">
                        {ticket.createdAt ? formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true }) : 'No date'}
                      </span>
                    </div>

                    {showCreatedBy && ticket.createdBy && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 border border-slate-200">
                          <AvatarFallback className="text-[10px] font-medium bg-slate-100 text-slate-600">
                            {ticket.createdBy.name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-slate-700">{ticket.createdBy.name}</span>
                      </div>
                    )}

                    {showAssignedTo && (
                      <div className={cn(
                        "flex items-center gap-2 px-2 py-1 rounded-md",
                        ticket.assignedTo ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                      )}>
                        <UserCheck size={13} />
                        <span className="text-xs font-medium">
                          {ticket.assignedTo ? ticket.assignedTo.name : "Unassigned"}
                        </span>
                      </div>
                    )}

                    {ticket.category && (
                      <div className="flex items-center gap-2">
                        <Tag size={13} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-500">{ticket.category.name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <MessageSquare size={13} className="text-slate-400" />
                      <span className="text-xs font-medium text-slate-500">{Array.isArray(ticket.comments) ? ticket.comments.length : (ticket.commentCount || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                   <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => handleViewTicket(ticket.id)}
                     className="rounded-lg font-medium text-xs h-8 bg-white border-slate-200 shadow-sm hover:bg-slate-50"
                   >
                     View
                   </Button>
                   
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-transparent hover:border-slate-200 hover:bg-white transition-all">
                          <MoreVertical className="h-4 w-4 text-slate-500" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-lg shadow-md border-slate-200 p-1">
                        <DropdownMenuItem onClick={() => handleViewTicket(ticket.id)} className="rounded-md font-medium text-sm gap-2">
                          <Eye className="h-4 w-4" /> View Details
                        </DropdownMenuItem>

                        {canEditTicket(ticket) && (
                          <DropdownMenuItem onClick={() => navigate(`/tickets/${ticket.id}/edit`)} className="rounded-md font-medium text-sm gap-2">
                            <Edit className="h-4 w-4" /> Edit Ticket
                          </DropdownMenuItem>
                        )}

                        {canAssignTicket(ticket) && (
                          <DropdownMenuItem onClick={() => assignTicketMutation.mutate(ticket.id)} className="rounded-md font-medium text-sm gap-2">
                            <UserCheck className="h-4 w-4" /> Assign to Me
                          </DropdownMenuItem>
                        )}

                        {hasAnyRole(user?.role, ["admin", "agent"]) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => updateTicketMutation.mutate({ id: ticket.id, status: "in_progress" })} 
                              className="rounded-md font-medium text-sm gap-2"
                              disabled={ticket.status === "in_progress"}
                            >
                              <Clock className="h-4 w-4" /> Mark Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => updateTicketMutation.mutate({ id: ticket.id, status: "closed" })}
                              className="rounded-md font-medium text-sm gap-2"
                              disabled={ticket.status === "closed"}
                            >
                              <CheckCircle className="h-4 w-4" /> Close Ticket
                            </DropdownMenuItem>
                          </>
                        )}

                        {canDeleteTicket(ticket) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => { setTicketToDelete(ticket); setShowDeleteDialog(true); }}
                              className="rounded-md font-medium text-sm gap-2 text-rose-600 focus:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" /> Delete Ticket
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                   </DropdownMenu>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">Delete Ticket</DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete ticket "{ticketToDelete?.title}"? This process is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-lg font-medium text-sm">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => ticketToDelete && deleteTicketMutation.mutate(ticketToDelete.id)} 
              disabled={deleteTicketMutation.isPending}
              className="rounded-lg font-medium text-sm"
            >
              {deleteTicketMutation.isPending ? "Deleting..." : "Delete Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

