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
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";

interface Category {
  id: number | string;
  name: string;
  parentId?: number | string | null;
}

interface CategorySelectionProps {
  type: 'category' | 'subcategory';
  onSelect: (id: string) => void;
  categories: Category[];
  parentCategoryId?: string;
  selectedValue?: string;
  isLoading?: boolean;
}

export function CategorySelection({ type, onSelect, categories, parentCategoryId, selectedValue, isLoading }: CategorySelectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleAddCategory = async () => {
    setIsAdding(true);
    try {
      const payload: { name: string; parentId?: string } = {
        name: newName
      };

      if (type === 'subcategory' && parentCategoryId) {
        payload.parentId = parentCategoryId;
      }

      const res = await apiRequest("POST", "/api/categories", payload);

      if (res.ok) {
        const created = await res.json();
        toast({ 
          title: "Success", 
          description: `New ${type} created successfully.` 
        });
        setShowAddModal(false);
        setNewName("");
        await queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        
        if (created && created.id) {
          onSelect(created.id.toString());
        }
      } else {
        toast({ 
          title: "Error", 
          description: `Failed to add ${type}.`
        });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: `Failed to add ${type}.`
      });
    } finally {
      setIsAdding(false);
    }
  };

  const displayItems = type === 'category' 
    ? categories.filter(c => !c.parentId)
    : categories.filter(c => c.parentId?.toString() === parentCategoryId?.toString());

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Select
          onValueChange={onSelect}
          value={selectedValue}
          disabled={isLoading || (type === 'subcategory' && !parentCategoryId)}
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${type}`} />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[200px]">
              {/* Add New Button */}
              <div className="p-2">
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
                  ➕ Add New {type === 'category' ? 'Category' : 'Subcategory'}
                </Button>
              </div>
              <div className="px-2">
                <Separator className="my-2" />
              </div>
              {displayItems.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {type === 'category' ? 'Category' : 'Subcategory'}</DialogTitle>
            <DialogDescription>
              Enter a name for the new {type}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder={`Enter ${type} name`}
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    disabled={isAdding}
                  />
                </FormControl>
              </FormItem>
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
              onClick={handleAddCategory}
              disabled={isAdding || !newName}
            >
              {isAdding ? `Adding ${type}...` : `Add ${type}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}