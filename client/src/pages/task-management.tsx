import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, X, CheckCircle2, AlertCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CsvImport {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  columns: string[];
  createdAt: string;
  completedAt?: string;
}

interface CsvImportRow {
  id: string;
  rowNumber: number;
  data: Record<string, any>;
}

export default function TaskManagement() {
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedImportId, setSelectedImportId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const pageSize = 50;

  const { data: imports = [], refetch: refetchImports } = useQuery<CsvImport[]>({
    queryKey: ['/api/csv-imports'],
    refetchInterval: (query) => {
      const hasProcessing = query.state.data?.some((imp: CsvImport) => imp.status === 'processing');
      return hasProcessing ? 2000 : false;
    },
  });

  const { data: selectedImport } = useQuery<CsvImport>({
    queryKey: ['/api/csv-imports', selectedImportId],
    enabled: !!selectedImportId,
    refetchInterval: (query) => {
      return query.state.data?.status === 'processing' ? 2000 : false;
    },
  });

  const { data: rowsData } = useQuery<{
    rows: CsvImportRow[];
    totalCount: number;
    limit: number;
    offset: number;
  }>({
    queryKey: ['/api/csv-imports', selectedImportId, 'rows', pageSize, currentPage * pageSize],
    enabled: !!selectedImportId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/csv-imports', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setSelectedImportId(data.importId);
      queryClient.invalidateQueries({ queryKey: ['/api/csv-imports'] });
      toast({
        title: "Upload Started",
        description: "Your file is being processed in the background.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const handleFileUpload = useCallback((file: File) => {
    if (!file) return;
    
    const fileNameLower = file.name.toLowerCase();
    const isCSV = fileNameLower.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/csv';
    
    if (!isCSV) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please upload a CSV file",
      });
      return;
    }

    setFileName(file.name);
    setUploading(true);
    uploadMutation.mutate(file);
  }, [uploadMutation, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleClearData = useCallback(() => {
    setFileName("");
    setSelectedImportId("");
    setCurrentPage(0);
  }, []);

  useEffect(() => {
    if (imports.length > 0 && !selectedImportId) {
      setSelectedImportId(imports[0].id);
    }
  }, [imports, selectedImportId]);

  const totalPages = rowsData ? Math.ceil(rowsData.totalCount / pageSize) : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Task Management</h1>
        <p className="text-muted-foreground mt-1">
          Upload CSV files with up to 300,000 rows and 50+ columns for processing
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Claim Data</CardTitle>
          <CardDescription>
            Drag and drop a CSV file or click to browse - handles large files with 300K+ rows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            `}
          >
            {uploading ? (
              <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
            ) : (
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            )}
            <h3 className="text-lg font-medium mb-2">
              {uploading ? 'Uploading...' : isDragging ? 'Drop file here' : 'Upload CSV File'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {uploading ? 'Please wait while your file is being uploaded' : 'Drag and drop your CSV file here, or click to browse'}
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-upload"
              data-testid="input-file-upload"
              disabled={uploading}
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              data-testid="button-browse-files"
              disabled={uploading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          </div>

          {fileName && (
            <div className="mt-4 flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium" data-testid="text-uploaded-filename">
                  {fileName}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearData}
                data-testid="button-clear-upload"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {imports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>Select an import to view its data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {imports.map((imp) => (
                <div
                  key={imp.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors
                    ${selectedImportId === imp.id ? 'border-primary bg-primary/5' : 'border-muted hover-elevate'}
                  `}
                  onClick={() => {
                    setSelectedImportId(imp.id);
                    setCurrentPage(0);
                  }}
                  data-testid={`import-item-${imp.id}`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(imp.status)}
                    <div>
                      <p className="font-medium text-sm">{imp.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {imp.status === 'completed' 
                          ? `${imp.totalRows.toLocaleString()} rows, ${imp.columns.length} columns`
                          : imp.status === 'processing'
                          ? `Processing: ${imp.processedRows.toLocaleString()} of ${imp.totalRows.toLocaleString()} rows`
                          : imp.status}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(imp.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedImport && selectedImport.status === 'completed' && rowsData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Data Preview</CardTitle>
                <CardDescription>
                  Showing {rowsData.rows.length} of {rowsData.totalCount.toLocaleString()} rows
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold w-16">Row #</TableHead>
                    {selectedImport.columns.map((header, index) => (
                      <TableHead key={index} className="font-semibold">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rowsData.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.rowNumber}</TableCell>
                      {selectedImport.columns.map((header, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {row.data[header] || ''}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
