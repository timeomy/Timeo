import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Search, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface FaceDevice {
  id: string;
  name: string;
  device_sn: string;
}

interface FaceLog {
  id: string;
  device_sn: string;
  user_id: string | null;
  person_id: string | null;
  cap_time: string;
  decision: 'allow' | 'deny' | 'error';
  reason: string | null;
  created_at: string;
  profile?: {
    name: string;
    member_id: string | null;
  } | null;
}

export default function FaceTurnstileLogs() {
  const [devices, setDevices] = useState<FaceDevice[]>([]);
  const [logs, setLogs] = useState<FaceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedDecision, setSelectedDecision] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDevices = async () => {
    const { data } = await supabase
      .from('turnstile_face_devices')
      .select('id, name, device_sn')
      .order('name');
    setDevices(data || []);
  };

  const fetchLogs = async () => {
    setLoading(true);

    let query = supabase
      .from('turnstile_face_logs')
      .select(`
        *,
        profile:profiles!turnstile_face_logs_user_id_fkey(name, member_id)
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (selectedDevice !== 'all') {
      query = query.eq('device_sn', selectedDevice);
    }

    if (selectedDecision !== 'all') {
      query = query.eq('decision', selectedDecision);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load logs');
      console.error(error);
    } else {
      // Handle the join result shape - profile might be array or null
      const logsData = (data || []).map(log => ({
        ...log,
        decision: log.decision as 'allow' | 'deny' | 'error',
        profile: Array.isArray(log.profile) ? log.profile[0] : log.profile,
      }));
      setLogs(logsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedDevice, selectedDecision]);

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'allow':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'deny':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'allow':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Allow</Badge>;
      case 'deny':
        return <Badge variant="destructive">Deny</Badge>;
      case 'error':
        return <Badge variant="secondary">Error</Badge>;
      default:
        return <Badge variant="outline">{decision}</Badge>;
    }
  };

  const getDeviceName = (deviceSn: string) => {
    const device = devices.find(d => d.device_sn === deviceSn);
    return device?.name || deviceSn;
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.profile?.name?.toLowerCase().includes(query) ||
      log.profile?.member_id?.toLowerCase().includes(query) ||
      log.person_id?.toLowerCase().includes(query) ||
      log.reason?.toLowerCase().includes(query)
    );
  });

  // Stats
  const allowCount = logs.filter(l => l.decision === 'allow').length;
  const denyCount = logs.filter(l => l.decision === 'deny').length;
  const errorCount = logs.filter(l => l.decision === 'error').length;

  return (
    <AppLayout title="Face Access Logs">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{allowCount}</p>
                  <p className="text-sm text-muted-foreground">Allowed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/20">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{denyCount}</p>
                  <p className="text-sm text-muted-foreground">Denied</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/20">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{errorCount}</p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Access Logs
                </CardTitle>
                <CardDescription>View facial recognition access attempts</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Device</label>
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    {devices.map((device) => (
                      <SelectItem key={device.device_sn} value={device.device_sn}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Decision</label>
                <Select value={selectedDecision} onValueChange={setSelectedDecision}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="allow">Allowed</SelectItem>
                    <SelectItem value="deny">Denied</SelectItem>
                    <SelectItem value="error">Errors</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Logs Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No logs found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), 'dd MMM HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        {log.profile ? (
                          <div>
                            <p className="font-medium">{log.profile.name}</p>
                            <p className="text-xs text-muted-foreground">{log.profile.member_id}</p>
                          </div>
                        ) : log.person_id ? (
                          <span className="text-muted-foreground font-mono text-sm">{log.person_id}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell>{getDeviceName(log.device_sn)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDecisionIcon(log.decision)}
                          {getDecisionBadge(log.decision)}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {log.reason || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
