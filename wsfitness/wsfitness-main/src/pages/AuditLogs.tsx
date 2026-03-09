import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, UserPlus, UserMinus, UserX, Edit2, Clock, Filter } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action_type: string;
  actor_id: string;
  actor_name: string;
  target_user_id: string | null;
  target_user_name: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  user_created: { label: 'User Created', icon: <UserPlus className="h-4 w-4" />, variant: 'default' },
  user_deleted: { label: 'User Deleted', icon: <UserX className="h-4 w-4" />, variant: 'destructive' },
  role_updated: { label: 'Role Updated', icon: <Edit2 className="h-4 w-4" />, variant: 'secondary' },
  role_removed: { label: 'Role Removed', icon: <UserMinus className="h-4 w-4" />, variant: 'outline' },
};

export default function AuditLogs() {
  const { role, isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const canViewLogs = role === 'admin' || role === 'it_admin';

  useEffect(() => {
    if (canViewLogs) {
      fetchLogs();
    }
  }, [canViewLogs]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      (log.target_user_name && log.target_user_name.toLowerCase().includes(search.toLowerCase()));
    
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const getActionInfo = (actionType: string) => {
    return ACTION_LABELS[actionType] || { 
      label: actionType.replace('_', ' ').toUpperCase(), 
      icon: <Clock className="h-4 w-4" />, 
      variant: 'outline' as const 
    };
  };

  const formatDetails = (log: AuditLog) => {
    const details = log.details || {};
    const parts: string[] = [];

    if (details.email) {
      parts.push(`Email: ${details.email}`);
    }
    if (details.old_role && details.new_role) {
      parts.push(`${details.old_role} → ${details.new_role}`);
    } else if (details.new_role) {
      parts.push(`Role: ${details.new_role}`);
    } else if (details.old_role) {
      parts.push(`Was: ${details.old_role}`);
    }

    return parts.join(' • ');
  };

  if (!canViewLogs) {
    return (
      <AppLayout title="AUDIT LOGS">
        <Card className="glass">
          <CardContent className="py-12 text-center text-muted-foreground">
            Access denied. Admin only.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="AUDIT LOGS">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user_created">User Created</SelectItem>
                <SelectItem value="user_deleted">User Deleted</SelectItem>
                <SelectItem value="role_updated">Role Updated</SelectItem>
                <SelectItem value="role_removed">Role Removed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Logs List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                {search || actionFilter !== 'all' ? 'No matching logs found' : 'No audit logs yet'}
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map((log, index) => {
              const actionInfo = getActionInfo(log.action_type);
              return (
                <Card
                  key={log.id}
                  className="glass neon-border animate-slide-up"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-muted shrink-0">
                          {actionInfo.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={actionInfo.variant}>{actionInfo.label}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm mt-1">
                            <span className="font-medium">{log.actor_name}</span>
                            {log.target_user_name && (
                              <>
                                {' → '}
                                <span className="font-medium">{log.target_user_name}</span>
                              </>
                            )}
                          </p>
                          {formatDetails(log) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDetails(log)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
