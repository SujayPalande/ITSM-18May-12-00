import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Input } from './input';
import { useToast } from '../../hooks/use-toast';
import { apiRequest } from '../../lib/queryClient';
import { Upload } from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess?: () => void;
}

export function ImportDialog({ open, onOpenChange, onImportSuccess }: ImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import",
        variant: "destructive"
      });
      return;
    }

    setIsImporting(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await apiRequest("POST", "/api/reports?action=import", formData, true);

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Import Successful",
          description: `${result.imported} tickets imported successfully.`,
        });
        
        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          console.warn("Import warnings:", result.errors);
          toast({
            title: "Import Warnings",
            description: `${result.errors.length} warnings occurred during import. Check console for details.`,
            variant: "default"
          });
        }
        
        // Call success callback and close dialog
        if (onImportSuccess) {
          onImportSuccess();
        }
        onOpenChange(false);
        setSelectedFile(null);
      } else {
        toast({
          title: "Import Failed",
          description: result.error || "Failed to import tickets",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Error",
        description: "An error occurred while importing tickets",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Import Tickets</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload a CSV file to import tickets. Required columns: title, description, status, priority, categoryId
          </p>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <div className="text-center">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Choose File
              </label>
              <p className="mt-2 text-sm text-gray-500">
                {selectedFile ? selectedFile.name : 'No file chosen'}
              </p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Sample CSV format:</p>
            <div className="bg-white p-3 rounded border font-mono text-xs">
              <div className="text-gray-600">title,description,status,priority,categoryId,supportType</div>
              <div className="text-gray-800">"Login Issue","Cannot access system","open","high","1","remote"</div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isImporting}
              className="bg-gray-600 hover:bg-gray-700"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? 'Importing...' : 'Import File'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}