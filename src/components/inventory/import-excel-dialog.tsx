
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { importInventoryFromExcelAction } from "@/app/(app)/inventory/actions";
import { ScrollArea } from "@/components/ui/scroll-area"; // For displaying errors

interface ImportExcelDialogProps {
  setOpen: (open: boolean) => void;
  onImportCompleted?: () => void; 
}

interface ImportError {
  row: number;
  field?: string;
  message: string;
}

export function ImportExcelDialog({ setOpen, onImportCompleted }: ImportExcelDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [importErrors, setImportErrors] = React.useState<ImportError[]>([]);
  const [importSummary, setImportSummary] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setImportErrors([]);
      setImportSummary(null);
    } else {
      setSelectedFile(null);
    }
  };

  async function onSubmit() {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select an Excel file to import.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setImportErrors([]);
    setImportSummary("Processing import...");

    const formData = new FormData();
    formData.append("excelFile", selectedFile);

    try {
      const result = await importInventoryFromExcelAction(formData);
      
      setImportSummary(result.message);
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors);
        toast({
          title: "Import Processed with Errors",
          description: `${result.importedCount} items imported. ${result.failedCount} items failed. See dialog for details.`,
          variant: "default", 
        });
      } else if (result.success) {
         toast({
          title: "Import Successful",
          description: result.message,
        });
      } else {
         toast({
          title: "Import Failed",
          description: result.message,
          variant: "destructive",
        });
      }


      if (result.importedCount > 0 && onImportCompleted) {
        onImportCompleted();
      }
      // Keep dialog open to show results, or close if fully successful and no errors
      if (result.success && result.errors.length === 0) {
         // Optionally close dialog on full success after a delay, or let user close
         // setOpen(false); 
      }
      
    } catch (error) {
      console.error("Failed to import from Excel:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not import data. Please check the file and try again.";
      setImportSummary(`Import failed: ${errorMessage}`);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      // Reset file input for next selection
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; 
      }
      setSelectedFile(null); 
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Import Inventory from Excel</DialogTitle>
        <DialogDescription>
          Select an Excel file (.xlsx or .xls) with inventory items to import.
          Ensure the file follows the required template format.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
        />
        {selectedFile && <p className="text-sm text-muted-foreground">Selected file: {selectedFile.name}</p>}

        {importSummary && (
          <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm">
            <p className="font-semibold">Import Status:</p>
            <p>{importSummary}</p>
          </div>
        )}

        {importErrors.length > 0 && (
          <div className="mt-4">
            <p className="font-semibold text-destructive mb-2">Import Errors ({importErrors.length}):</p>
            <ScrollArea className="h-[200px] w-full rounded-md border p-3 text-sm">
              <ul>
                {importErrors.map((err, index) => (
                  <li key={index} className="mb-1 border-b pb-1">
                    Row {err.row}: {err.field ? `Field "${err.field}" - ` : ""}{err.message}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isSubmitting}>
            {importSummary || importErrors.length > 0 ? "Close" : "Cancel"}
          </Button>
        </DialogClose>
        <Button onClick={onSubmit} disabled={isSubmitting || !selectedFile}>
          {isSubmitting ? "Importing..." : "Start Import"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
