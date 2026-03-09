import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Download, FileText, FileCode, File, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface TrainingLog {
  id: string;
  date: string;
  training_type: string;
  training_types?: string[] | null;
  sessions_used: number;
  notes: string | null;
  weight_kg?: number | null;
  exercises?: { name: string; equipment: string; training_type: string }[] | null;
}

interface TrainingLogExportProps {
  clientName: string;
  logs: TrainingLog[];
}

const TRAINING_TYPE_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  cardio: 'Cardio',
  full_body: 'Full Body',
  stretching: 'Stretching',
};

export function TrainingLogExport({ clientName, logs }: TrainingLogExportProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const getTrainingTypeLabel = (type: string) => TRAINING_TYPE_LABELS[type] || type;

  const generateTextContent = () => {
    let content = `Training History - ${clientName}\n`;
    content += `Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}\n`;
    content += `${'='.repeat(50)}\n\n`;

    logs.forEach((log, index) => {
      const types = log.training_types?.length ? log.training_types : [log.training_type];
      content += `Session ${index + 1}\n`;
      content += `Date: ${format(new Date(log.date), 'MMM d, yyyy')}\n`;
      content += `Training Type(s): ${types.map(getTrainingTypeLabel).join(', ')}\n`;
      content += `Sessions Used: ${log.sessions_used}\n`;
      if (log.weight_kg) content += `Weight: ${log.weight_kg} kg\n`;
      
      if (log.exercises && log.exercises.length > 0) {
        content += `Exercises:\n`;
        log.exercises.forEach((ex) => {
          content += `  - ${ex.name} (Equipment: ${ex.equipment})\n`;
        });
      }
      
      if (log.notes) content += `Notes: ${log.notes}\n`;
      content += `${'-'.repeat(30)}\n\n`;
    });

    return content;
  };

  const generateHtmlContent = () => {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Training History - ${clientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { font-size: 24px; margin-bottom: 5px; color: #1a1a1a; }
    .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
    .session { border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .session-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .session-date { font-weight: 600; color: #1a1a1a; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #0ea5e9; color: white; margin-right: 4px; }
    .detail { display: flex; gap: 20px; font-size: 14px; color: #666; margin-top: 8px; }
    .exercises { margin-top: 10px; padding: 10px; background: #f9fafb; border-radius: 6px; }
    .exercise { font-size: 13px; padding: 4px 0; border-bottom: 1px solid #e5e5e5; }
    .exercise:last-child { border-bottom: none; }
    .equipment { color: #666; font-size: 12px; }
    .notes { margin-top: 10px; padding: 10px; background: #fef3c7; border-radius: 6px; font-size: 13px; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Training History</h1>
    <p class="subtitle">${clientName} • Generated ${format(new Date(), 'MMM d, yyyy h:mm a')}</p>
`;

    logs.forEach((log) => {
      const types = log.training_types?.length ? log.training_types : [log.training_type];
      html += `
    <div class="session">
      <div class="session-header">
        <span class="session-date">${format(new Date(log.date), 'MMMM d, yyyy')}</span>
        <div>${types.map(t => `<span class="badge">${getTrainingTypeLabel(t)}</span>`).join('')}</div>
      </div>
      <div class="detail">
        <span>Sessions: ${log.sessions_used}</span>
        ${log.weight_kg ? `<span>Weight: ${log.weight_kg} kg</span>` : ''}
      </div>`;
      
      if (log.exercises && log.exercises.length > 0) {
        html += `
      <div class="exercises">
        <strong style="font-size: 12px; color: #666;">Exercises:</strong>
        ${log.exercises.map(ex => `
        <div class="exercise">
          ${ex.name} <span class="equipment">• ${ex.equipment}</span>
        </div>`).join('')}
      </div>`;
      }
      
      if (log.notes) {
        html += `
      <div class="notes">${log.notes}</div>`;
      }
      
      html += `
    </div>`;
    });

    html += `
  </div>
</body>
</html>`;
    return html;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type: 'txt' | 'html' | 'pdf') => {
    if (logs.length === 0) {
      toast.error('No training history to export');
      return;
    }

    setExporting(type);
    const sanitizedName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    try {
      if (type === 'txt') {
        const content = generateTextContent();
        downloadFile(content, `training_history_${sanitizedName}_${dateStr}.txt`, 'text/plain');
        toast.success('Text file downloaded');
      } else if (type === 'html') {
        const content = generateHtmlContent();
        downloadFile(content, `training_history_${sanitizedName}_${dateStr}.html`, 'text/html');
        toast.success('HTML file downloaded');
      } else if (type === 'pdf') {
        // For PDF, we generate HTML and open in new tab for printing
        const content = generateHtmlContent();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(content);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
          }, 500);
          toast.success('Print dialog opened - save as PDF');
        } else {
          toast.error('Please allow popups to generate PDF');
        }
      }
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={logs.length === 0}>
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('txt')} className="gap-2">
          <FileText className="h-4 w-4" />
          Text (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('html')} className="gap-2">
          <FileCode className="h-4 w-4" />
          HTML (.html)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2">
          <File className="h-4 w-4" />
          PDF (Print)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
