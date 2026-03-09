import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Calendar, Dumbbell, Edit2, Trash2, Lock, LogIn, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type TrainingType = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'full_body' | 'stretching';

interface TrainingLog {
  id: string;
  client_id: string;
  coach_id: string | null;
  date: string;
  training_type: TrainingType;
  training_types: string[] | null;
  sessions_used: number;
  notes: string | null;
  clients?: { name: string };
  profiles?: { name: string } | null;
}

interface LoginLog {
  id: string;
  user_id: string;
  user_name: string;
  role: string;
  logged_in_at: string;
}

interface Client {
  id: string;
  name: string;
}

const TRAINING_TYPES: { value: TrainingType; label: string }[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'legs', label: 'Legs' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'core', label: 'Core' },
];

const TYPE_COLORS: Record<TrainingType, string> = {
  chest: 'pill-teal',
  back: 'pill-purple',
  legs: 'pill-teal',
  shoulders: 'pill-purple',
  arms: 'pill-teal',
  core: 'pill-purple',
  cardio: 'pill-teal',
  full_body: 'pill-purple',
  stretching: 'pill-teal',
};

export default function TrainingLogs() {
  const { user, role } = useAuth();
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TrainingLog | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    training_type: 'chest' as TrainingType,
    sessions_used: 1,
    notes: '',
  });

  // Only admins and IT admins can edit/delete logs
  const isAdminOrIT = role === 'admin' || role === 'it_admin';
  const canModifyLogs = isAdminOrIT;

  useEffect(() => {
    fetchLogs();
    fetchClients();
    if (isAdminOrIT) {
      fetchLoginLogs();
    }
  }, [user, role]);

  const fetchLoginLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('login_logs')
        .select('*')
        .order('logged_in_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLoginLogs(data || []);
    } catch (error) {
      console.error('Error fetching login logs:', error);
    }
  };

  const fetchLogs = async () => {
    if (!user) return;

    try {
      // NOTE: training_logs.coach_id has no FK to profiles, so we hydrate coach names manually.
      const query = isAdminOrIT
        ? supabase.from('training_logs').select('*, clients(name)').order('date', { ascending: false }).order('created_at', { ascending: false })
        : supabase.from('training_logs').select('*, clients(name)').eq('coach_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      let hydratedLogs: TrainingLog[] = (data as any) || [];

      if (isAdminOrIT) {
        const coachIds = Array.from(new Set(hydratedLogs.map((l) => l.coach_id).filter(Boolean))) as string[];

        if (coachIds.length > 0) {
          const { data: coachProfiles, error: coachProfilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', coachIds);

          if (coachProfilesError) throw coachProfilesError;

          const coachNameById: Record<string, string> = {};
          coachProfiles?.forEach((p: any) => {
            coachNameById[p.id] = p.name;
          });

          hydratedLogs = hydratedLogs.map((log) => ({
            ...log,
            profiles: log.coach_id ? { name: coachNameById[log.coach_id] || 'Unknown' } : null,
          }));
        }
      }

      setLogs(hydratedLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load training logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!user) return;

    try {
      const query = isAdminOrIT
        ? supabase.from('clients').select('id, name').order('name')
        : supabase.from('clients').select('id, name').eq('assigned_coach_id', user.id).order('name');

      const { data, error } = await query;
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only admins can edit
    if (editingLog && !canModifyLogs) {
      toast.error('Only admins can edit logs');
      return;
    }

    try {
      const logData = {
        client_id: formData.client_id,
        coach_id: user?.id,
        date: formData.date,
        training_type: formData.training_type,
        sessions_used: formData.sessions_used,
        notes: formData.notes || null,
      };

      if (editingLog) {
        const { error } = await supabase
          .from('training_logs')
          .update(logData)
          .eq('id', editingLog.id);

        if (error) throw error;
        toast.success('Log updated');
      }

      setDialogOpen(false);
      resetForm();
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save log');
    }
  };

  const handleDelete = async (id: string) => {
    if (!canModifyLogs) {
      toast.error('Only admins can delete logs');
      return;
    }

    if (!confirm('Are you sure you want to delete this log?')) return;

    try {
      const { error } = await supabase.from('training_logs').delete().eq('id', id);
      if (error) throw error;
      toast.success('Log deleted');
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete log');
    }
  };

  const openEditDialog = (log: TrainingLog) => {
    if (!canModifyLogs) {
      toast.error('Only admins can edit logs');
      return;
    }

    setEditingLog(log);
    setFormData({
      client_id: log.client_id,
      date: log.date,
      training_type: log.training_type,
      sessions_used: log.sessions_used,
      notes: log.notes || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingLog(null);
    setFormData({
      client_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      training_type: 'chest',
      sessions_used: 1,
      notes: '',
    });
  };

  const filteredLogs = logs.filter(l =>
    l.clients?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="TRAINING LOGS">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Coach Notice */}
        {!canModifyLogs && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>Logs are locked after submission. Contact an admin to make changes.</span>
          </div>
        )}

        {/* Edit Dialog (Admin Only) */}
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Edit Log</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(v) => setFormData({ ...formData, client_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Training Type</Label>
                <Select
                  value={formData.training_type}
                  onValueChange={(v: TrainingType) => setFormData({ ...formData, training_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sessions Used</Label>
                <Select
                  value={String(formData.sessions_used)}
                  onValueChange={(v) => setFormData({ ...formData, sessions_used: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Session</SelectItem>
                    <SelectItem value="2">2 Sessions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">
                Update Log
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Tabs for Admin/IT to switch between Training Logs and Login Logs */}
        {isAdminOrIT ? (
          <Tabs defaultValue="training" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="training" className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Training Logs
              </TabsTrigger>
              <TabsTrigger value="logins" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Login Activity
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="training" className="mt-4">
              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <Card className="glass">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      {search ? 'No logs found' : 'No training logs yet. Log sessions from the Clients page!'}
                    </CardContent>
                  </Card>
                ) : (
                  filteredLogs.map((log, index) => {
                    // Use training_types array if available, otherwise fallback to single training_type
                    const types = log.training_types && log.training_types.length > 0 
                      ? log.training_types 
                      : [log.training_type];
                    
                    return (
                      <Card
                        key={log.id}
                        className="ios-card animate-slide-up"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h3 className="font-semibold text-foreground truncate">{log.clients?.name || 'Unknown'}</h3>
                                {types.map((type, idx) => (
                                  <span key={idx} className={TYPE_COLORS[type as TrainingType] || 'pill-teal'}>
                                    {TRAINING_TYPES.find(t => t.value === type)?.label || type}
                                  </span>
                                ))}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(log.date), 'EEEE, MMM d, yyyy')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Dumbbell className="h-3 w-3" />
                                  <span>{log.sessions_used} session{log.sessions_used > 1 ? 's' : ''}</span>
                                </div>
                                {log.notes && (
                                  <p className="mt-2 text-foreground/80">{log.notes}</p>
                                )}
                                {isAdminOrIT && log.profiles && (
                                  <p className="text-xs">Logged by: {log.profiles.name}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="ghost" onClick={() => openEditDialog(log)} className="rounded-xl">
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(log.id)} className="rounded-xl">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="logins" className="mt-4">
              <div className="space-y-3">
                {loginLogs.length === 0 ? (
                  <Card className="glass">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No login activity recorded yet.
                    </CardContent>
                  </Card>
                ) : (
                  loginLogs.map((log, index) => (
                    <Card
                      key={log.id}
                      className="ios-card animate-slide-up"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <LogIn className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{log.user_name}</h3>
                              <Badge variant={log.role === 'coach' ? 'secondary' : 'default'}>
                                {log.role.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{format(new Date(log.logged_in_at), 'h:mm a')}</span>
                            </div>
                            <div>{format(new Date(log.logged_in_at), 'MMM d, yyyy')}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Coach view - only training logs */
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <Card className="glass">
                <CardContent className="py-12 text-center text-muted-foreground">
                  {search ? 'No logs found' : 'No training logs yet. Log sessions from the Clients page!'}
                </CardContent>
              </Card>
            ) : (
              filteredLogs.map((log, index) => (
                <Card
                  key={log.id}
                  className="ios-card animate-slide-up"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground truncate">{log.clients?.name || 'Unknown'}</h3>
                          <span className={TYPE_COLORS[log.training_type]}>
                            {TRAINING_TYPES.find(t => t.value === log.training_type)?.label}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(log.date), 'EEEE, MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-3 w-3" />
                            <span>{log.sessions_used} session{log.sessions_used > 1 ? 's' : ''}</span>
                          </div>
                          {log.notes && (
                            <p className="mt-2 text-foreground/80">{log.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="p-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
