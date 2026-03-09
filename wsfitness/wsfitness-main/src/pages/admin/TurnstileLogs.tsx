import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileText, Search, Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, Eye, Database } from 'lucide-react';
import { format } from 'date-fns';

interface TurnstileDevice {
  id: string;
  name: string;
  device_sn: string;
}

interface TurnstileEvent {
  id: string;
  received_at: string;
  device_sn: string;
  cmd: string | null;
  sequence_no: number | null;
  cap_time: string | null;
  match_result: number | null;
  match_failed_reson: number | null;
  person_id: string | null;
  person_name: string | null;
  customer_text: string | null;
  raw_payload: Record<string, unknown>;
}

export default function TurnstileLogs() {
  const [devices, setDevices] = useState<TurnstileDevice[]>([]);
  const [events, setEvents] = useState<TurnstileEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedCmd, setSelectedCmd] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<TurnstileEvent | null>(null);
  const [showPayloadDialog, setShowPayloadDialog] = useState(false);

  // Get unique commands from events
  const uniqueCmds = [...new Set(events.map(e => e.cmd).filter(Boolean))] as string[];

  const fetchDevices = async () => {
    const { data } = await supabase
      .from('turnstile_face_devices')
      .select('id, name, device_sn')
      .order('name');
    setDevices(data || []);
  };

  const fetchEvents = async () => {
    setLoading(true);

    let query = supabase
      .from('turnstile_events')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(200);

    if (selectedDevice !== 'all') {
      query = query.eq('device_sn', selectedDevice);
    }

    if (selectedCmd !== 'all') {
      query = query.eq('cmd', selectedCmd);
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load events');
      console.error(error);
    } else {
      setEvents((data || []) as TurnstileEvent[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [selectedDevice, selectedCmd]);

  const getDeviceName = (deviceSn: string) => {
    const device = devices.find(d => d.device_sn === deviceSn);
    return device?.name || deviceSn;
  };

  const getMatchResultBadge = (result: number | null) => {
    if (result === null) return null;
    if (result === 0) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Match</Badge>;
    } else if (result === 1) {
      return <Badge variant="destructive">No Match</Badge>;
    }
    return <Badge variant="secondary">Unknown ({result})</Badge>;
  };

  const getCmdBadge = (cmd: string | null) => {
    if (!cmd) return <Badge variant="outline">-</Badge>;
    switch (cmd) {
      case 'heartbeat':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Heartbeat</Badge>;
      case 'face':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">Face</Badge>;
      case 'upload person':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">Upload</Badge>;
      default:
        return <Badge variant="outline">{cmd}</Badge>;
    }
  };

  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.person_name?.toLowerCase().includes(query) ||
      event.person_id?.toLowerCase().includes(query) ||
      event.customer_text?.toLowerCase().includes(query) ||
      event.device_sn.toLowerCase().includes(query)
    );
  });

  // Stats
  const faceEvents = events.filter(e => e.cmd === 'face').length;
  const matchSuccess = events.filter(e => e.match_result === 0).length;
  const matchFailed = events.filter(e => e.match_result === 1).length;

  const handleViewPayload = (event: TurnstileEvent) => {
    setSelectedEvent(event);
    setShowPayloadDialog(true);
  };

  return (
    <AppLayout title="Turnstile Logs">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Database className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{events.length}</p>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{matchSuccess}</p>
                  <p className="text-sm text-muted-foreground">Matched</p>
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
                  <p className="text-2xl font-bold">{matchFailed}</p>
                  <p className="text-sm text-muted-foreground">No Match</p>
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
                  Turnstile Events
                </CardTitle>
                <CardDescription>Raw events from Cloudflare Worker relay</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
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
                <label className="text-sm font-medium">Command</label>
                <Select value={selectedCmd} onValueChange={setSelectedCmd}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Commands</SelectItem>
                    {uniqueCmds.map((cmd) => (
                      <SelectItem key={cmd} value={cmd}>
                        {cmd}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Events Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No events found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Command</TableHead>
                    <TableHead>Person</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewPayload(event)}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(event.received_at), 'dd MMM HH:mm:ss')}
                      </TableCell>
                      <TableCell>{getDeviceName(event.device_sn)}</TableCell>
                      <TableCell>{getCmdBadge(event.cmd)}</TableCell>
                      <TableCell>
                        {event.person_name || event.person_id ? (
                          <div>
                            <p className="font-medium">{event.person_name || '-'}</p>
                            <p className="text-xs text-muted-foreground">{event.person_id}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getMatchResultBadge(event.match_result)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.match_failed_reson !== null ? `Code: ${event.match_failed_reson}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPayload(event);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Raw Payload Dialog */}
        <Dialog open={showPayloadDialog} onOpenChange={setShowPayloadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Raw Event Payload</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                {selectedEvent ? JSON.stringify(selectedEvent.raw_payload, null, 2) : ''}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
