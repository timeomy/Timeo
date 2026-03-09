import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Download, Loader2, HardDrive, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function FullDatabaseExport() {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setProgress('Requesting full database export...');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in');

      const response = await supabase.functions.invoke('export-database', {});

      if (response.error) throw new Error(response.error.message || 'Export failed');

      const jsonStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `wsfitness_full_export_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(link.href);

      const tableCount = response.data?.tables ? Object.keys(response.data.tables).length : 0;
      toast.success(`Full export complete: ${tableCount} tables exported`);
      setProgress('');
    } catch (error: any) {
      console.error('Full export error:', error);
      toast.error(error.message || 'Failed to export database');
      setProgress('');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="border-2 border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <HardDrive className="h-5 w-5" />
          Full Database Export (Migration)
        </CardTitle>
        <CardDescription>
          Export ALL tables + auth users as a single JSON file for self-hosted migration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Security Notice</AlertTitle>
          <AlertDescription>
            This exports <strong>all data</strong> including personal information.
            Password hashes <strong>cannot be exported</strong> — users will need to reset passwords on your new system.
            Handle this file securely.
          </AlertDescription>
        </Alert>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Includes:</strong></p>
          <ul className="list-disc list-inside ml-2 space-y-0.5 text-xs">
            <li>All public tables (profiles, memberships, plans, check-ins, classes, etc.)</li>
            <li>Auth users (email, phone, metadata, sign-in timestamps)</li>
            <li>User roles & permissions</li>
            <li>Billing, invoices, payment history</li>
            <li>Turnstile/gate logs & device configs</li>
            <li>Vouchers, vendors, training logs</li>
            <li>Full DDL schema available in <code>database-schema-export.sql</code></li>
          </ul>
        </div>

        {progress && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            {progress}
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={exporting}
          variant="destructive"
          className="w-full gap-2"
          size="lg"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting all tables...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export Full Database (JSON)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
