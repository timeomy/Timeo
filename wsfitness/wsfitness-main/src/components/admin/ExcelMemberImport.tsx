import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface ImportResult {
  success: number;
  skipped: number;
  errors: string[];
}

interface ExcelRow {
  [key: string]: string | number | undefined;
}

// Convert Excel serial date to JS Date string (YYYY-MM-DD)
function parseExcelDate(value: number | string | undefined): string | null {
  if (value === undefined || value === null || value === '') return null;
  
  if (typeof value === 'number') {
    // Excel serial date: days since 1900-01-01 (with Excel's leap year bug)
    // Excel incorrectly treats 1900 as a leap year, so we adjust for dates after Feb 28, 1900
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const jsDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return jsDate.toISOString().split('T')[0];
  }
  
  if (typeof value === 'string') {
    // Try parsing as date string (handles various formats)
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    // Try DD/MM/YYYY format
    const parts = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (parts) {
      const day = parseInt(parts[1]);
      const month = parseInt(parts[2]) - 1;
      let year = parseInt(parts[3]);
      if (year < 100) year += 2000;
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  return null;
}

// Fuzzy match column names (case-insensitive, partial match)
function findColumn(row: ExcelRow, patterns: string[]): string | number | undefined {
  const keys = Object.keys(row);
  for (const pattern of patterns) {
    const lowerPattern = pattern.toLowerCase();
    for (const key of keys) {
      if (key.toLowerCase().includes(lowerPattern) || lowerPattern.includes(key.toLowerCase())) {
        return row[key];
      }
    }
  }
  return undefined;
}

// Generate auto email from name
function generateEmail(name: string): string {
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0].toLowerCase().replace(/[^a-z]/g, '');
  const lastInitial = nameParts.length > 1 
    ? nameParts[nameParts.length - 1].charAt(0).toLowerCase().replace(/[^a-z]/g, '') 
    : '';
  return `${firstName}${lastInitial}@wsfitness.my`;
}

interface ExcelMemberImportProps {
  onImportComplete: () => void;
}

export function ExcelMemberImport({ onImportComplete }: ExcelMemberImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [currentName, setCurrentName] = useState('');
  const [totalRows, setTotalRows] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setProgress(0);
    setResult(null);
    setCurrentName('');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

      if (jsonData.length === 0) {
        toast.error('Excel file is empty');
        setImporting(false);
        return;
      }

      setTotalRows(jsonData.length);
      
      const importResult: ImportResult = {
        success: 0,
        skipped: 0,
        errors: [],
      };

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        setCurrentRow(i + 1);
        setProgress(Math.round(((i + 1) / jsonData.length) * 100));

        // Extract name (fuzzy column matching)
        const nameValue = findColumn(row, ['name', 'full name', 'fullname', 'member name']);
        const name = typeof nameValue === 'string' ? nameValue : '';
        
        if (!name || name.trim().length < 2) {
          importResult.skipped++;
          importResult.errors.push(`Row ${i + 2}: Invalid or missing name`);
          continue;
        }

        setCurrentName(name);

        // Extract start date (fuzzy column matching)
        const startDateValue = findColumn(row, ['start date', 'startdate', 'start', 'valid from', 'validfrom', 'from']);
        const validFrom = parseExcelDate(startDateValue);

        // Extract end date (fuzzy column matching)
        const endDateValue = findColumn(row, ['end date', 'enddate', 'end', 'valid until', 'validuntil', 'expiry', 'expiry date', 'expires']);
        const validUntil = parseExcelDate(endDateValue);

        // Generate credentials
        const email = generateEmail(name);

        try {
          const res = await supabase.functions.invoke('create-user', {
            body: {
              fullName: name.trim(),
              email,
              password: '123456',
              role: 'member',
              plan_type: 'Monthly',
              valid_from: validFrom,
              valid_until: validUntil,
            },
          });

          if (res.error) {
            throw new Error(res.error.message);
          }

          if (res.data?.error) {
            // Check if it's a duplicate email error
            if (res.data.error.includes('already been registered') || 
                res.data.error.includes('duplicate') ||
                res.data.error.includes('already exists')) {
              importResult.skipped++;
              importResult.errors.push(`Row ${i + 2}: ${name} - Already exists`);
            } else {
              throw new Error(res.data.error);
            }
          } else {
            importResult.success++;
          }
        } catch (err: any) {
          importResult.skipped++;
          importResult.errors.push(`Row ${i + 2}: ${name} - ${err.message}`);
        }

        // Rate limiting: 500ms delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setResult(importResult);
      
      if (importResult.success > 0) {
        toast.success(`Imported ${importResult.success} members successfully`);
        onImportComplete();
      }
    } catch (error: any) {
      console.error('Excel import error:', error);
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setImporting(false);
      setCurrentName('');
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    if (!importing) {
      setIsOpen(false);
      setResult(null);
      setProgress(0);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Import Excel
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Members from Excel
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!importing && !result && (
              <>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Upload an Excel file (.xlsx, .csv) with member data.</p>
                  <p className="font-medium">Expected columns:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                    <li><strong>Name</strong> - Full name of the member</li>
                    <li><strong>Start Date</strong> - Membership start date</li>
                    <li><strong>End Date</strong> - Membership expiry date</li>
                  </ul>
                  <p className="text-xs mt-3 bg-muted/50 p-2 rounded">
                    <strong>Auto-generated:</strong><br />
                    • Email: [FirstName][LastInitial]@wsfitness.my<br />
                    • Password: 123456<br />
                    • Member ID: 8-digit hex (e.g., B62CF7C2)
                  </p>
                </div>

                <div className="flex justify-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="excel-file-input"
                  />
                  <label htmlFor="excel-file-input">
                    <Button asChild variant="default" className="cursor-pointer gap-2">
                      <span>
                        <Upload className="h-4 w-4" />
                        Select Excel File
                      </span>
                    </Button>
                  </label>
                </div>
              </>
            )}

            {importing && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">Importing members...</span>
                </div>
                
                <Progress value={progress} className="h-3" />
                
                <div className="text-center space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Importing {currentRow} of {totalRows}
                  </p>
                  {currentName && (
                    <p className="text-sm font-medium text-primary truncate">
                      {currentName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3">
                  {result.success > 0 ? (
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  ) : (
                    <AlertCircle className="h-10 w-10 text-yellow-500" />
                  )}
                </div>

                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold">Import Complete</p>
                  <div className="flex justify-center gap-6 text-sm">
                    <span className="text-green-600 font-medium">
                      ✅ Success: {result.success}
                    </span>
                    <span className="text-yellow-600 font-medium">
                      ⚠️ Skipped: {result.skipped}
                    </span>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="max-h-32 overflow-y-auto bg-muted/50 rounded-md p-3">
                    <p className="text-xs font-medium mb-2">Skipped rows:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li className="font-medium">
                          ...and {result.errors.length - 10} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {result && (
              <Button onClick={handleClose}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
