import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Papa from "papaparse";

export default function TaskManagement() {
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = useCallback((file: File) => {
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setFileName(file.name);

    Papa.parse(file, {
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          const headers = results.data[0] as string[];
          const rows = results.data.slice(1);
          
          setCsvHeaders(headers);
          setCsvData(rows);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file: ' + error.message);
      },
    });
  }, []);

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
    setCsvData([]);
    setCsvHeaders([]);
    setFileName("");
  }, []);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold">Task Management</h1>
        <p className="text-muted-foreground mt-1">
          Upload CSV files containing claim line details for task ingestion
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Claim Data</CardTitle>
          <CardDescription>
            Drag and drop a CSV file or click to browse
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
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              {isDragging ? 'Drop file here' : 'Upload CSV File'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your CSV file here, or click to browse
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-upload"
              data-testid="input-file-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              data-testid="button-browse-files"
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

      {csvData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Uploaded Data Preview</CardTitle>
                <CardDescription>
                  Showing {csvData.length} rows and {csvHeaders.length} columns
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={handleClearData}
                data-testid="button-clear-data"
              >
                Clear Data
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    {csvHeaders.map((header, index) => (
                      <TableHead key={index} className="font-semibold">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.map((row: any[], rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {cell}
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
