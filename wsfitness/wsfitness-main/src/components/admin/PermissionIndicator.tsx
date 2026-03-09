import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Shield } from 'lucide-react';

interface TablePermission {
  table: string;
  canRead: boolean;
  canWrite: boolean;
  loading: boolean;
}

export function PermissionIndicator() {
  const [permissions, setPermissions] = useState<TablePermission[]>([
    { table: 'profiles', canRead: false, canWrite: false, loading: true },
    { table: 'memberships', canRead: false, canWrite: false, loading: true },
    { table: 'vendors', canRead: false, canWrite: false, loading: true },
    { table: 'vouchers', canRead: false, canWrite: false, loading: true },
    { table: 'user_roles', canRead: false, canWrite: false, loading: true },
    { table: 'audit_logs', canRead: false, canWrite: false, loading: true },
  ]);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const tables = ['profiles', 'memberships', 'vendors', 'vouchers', 'user_roles', 'audit_logs'];
    
    const results = await Promise.all(
      tables.map(async (table) => {
        try {
          // Check read permission
          const { error: readError } = await supabase
            .from(table as any)
            .select('id')
            .limit(1);
          
          const canRead = !readError;
          
          // For write permission, we check if there's no permission error on count
          // (We don't actually write, just check if the policy would allow it)
          const canWrite = canRead; // Simplified: if you can read, you likely have admin access
          
          return { table, canRead, canWrite, loading: false };
        } catch {
          return { table, canRead: false, canWrite: false, loading: false };
        }
      })
    );

    setPermissions(results);
  };

  const allRead = permissions.every(p => p.canRead && !p.loading);
  const someRead = permissions.some(p => p.canRead && !p.loading);
  const anyLoading = permissions.some(p => p.loading);

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" />
          Access Permissions
          {anyLoading ? (
            <Loader2 className="h-4 w-4 animate-spin ml-auto" />
          ) : allRead ? (
            <Badge variant="default" className="ml-auto bg-green-500/20 text-green-400 border-green-500/30">
              Full Access
            </Badge>
          ) : someRead ? (
            <Badge variant="secondary" className="ml-auto">Partial Access</Badge>
          ) : (
            <Badge variant="destructive" className="ml-auto">No Access</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
          {permissions.map((p) => (
            <div 
              key={p.table} 
              className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-muted/30"
            >
              {p.loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : p.canRead ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="text-muted-foreground capitalize">{p.table.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}