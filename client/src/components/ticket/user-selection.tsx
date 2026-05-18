import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UserSelectionProps {
  type: 'user' | 'agent';
  onSelect: (id: string) => void;
  users: Array<{
    id: string;
    username: string;
    email: string;
    role: string;
  }>;
  isLoading?: boolean;
  selectedValue?: string;
}

export function UserSelection({ type, onSelect, users, isLoading, selectedValue }: UserSelectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async () => {
    setIsAdding(true);
    try {
      // Use email for username and name, generate random password
      const email = newEmail;
      const username = email;
      const name = email;
      const password = Math.random().toString(36).slice(-8);
      
      const res = await apiRequest("POST", "/api/users", { 
        email, 
        role: type, 
        username, 
        name, 
        password 
      });

      if (res.ok) {
        const created = await res.json();
        toast({ title: "Success", description: `New ${type} created successfully.` });
        setShowAddModal(false);
        setNewEmail("");
        await queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        
        if (created && created.id) {
          onSelect(created.id.toString());
        }
      } else {
        toast({ title: "Error", description: `Failed to add ${type}.` });
      }
    } catch (error) {
      toast({ title: "Error", description: `Failed to add ${type}.` });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Select 
          onValueChange={onSelect}
          value={selectedValue}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${type}`} />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[200px]">
              <div className="p-2">
                <Input
                  placeholder={`Search ${type}s...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                <Button 
                  variant="outline" 
                  className="w-full"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAddModal(true);
                  }}
                >
                  ➕ Add New {type === 'user' ? 'User' : 'Agent'}
                </Button>
              </div>
              <SelectItem value="none">None</SelectItem>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.username} - {user.email} ({user.role})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-users" disabled>
                  No {type}s found
                </SelectItem>
              )}
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {type === 'user' ? 'User' : 'Agent'}</DialogTitle>
            <DialogDescription>
              Enter the email address for the new {type}. An account will be created automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                type="email"
                placeholder={`Enter ${type}'s email address`}
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                disabled={isAdding}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddModal(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={isAdding || !newEmail}
            >
              {isAdding ? `Adding ${type}...` : `Add ${type}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}