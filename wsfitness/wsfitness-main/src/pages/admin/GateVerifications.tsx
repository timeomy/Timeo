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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShieldCheck, Search, Loader2, RefreshCw, Eye, CheckCircle, XCircle, CalendarIcon } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface GateDevice {
  id: string;
  name: string;
  device_sn: string;
}

interface GateVerification {
  id: string;
  received_at: string;
  device_sn: string | null;
  math_type: number | null;
  qrcode: string | null;
  match_state: number | null;
  person_id: string | null;
  person_name: string | null;
  decision_code: number;
  decision_desc: string | null;
  raw_payload: Record<string, unknown>;
  is_rejected: boolean | null;
  reject_reason: string | null;
}

export default function GateVerifications() {
  const [devices, setDevices] = useState<GateDevice[]>([]);
  const [verifications, setVerifications] = useState<GateVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [selectedDecision, setSelectedDecision] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerification, setSelectedVerification] = useState<GateVerification | null>(null);
  const [showPayloadDialog, setShowPayloadDialog] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const fetchDevices = async () => {
    const { data } = await supabase
      .from('turnstile_face_devices')
      .select('id, name, device_sn')
      .order('name');
    setDevices(data || []);
  };

  const fetchVerifications = async () => {
    setLoading(true);

    let query = supabase
      .from('turnstile_verifications')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(200);

    if (selectedDevice !== 'all') {
      query = query.eq('device_sn', selectedDevice);
    }

    if (selectedDecision !== 'all') {
      query = query.eq('decision_code', parseInt(selectedDecision));
    }

    if (dateRange.from) {
      query = query.gte('received_at', startOfDay(dateRange.from).toISOString());
    }

    if (dateRange.to) {
      query = query.lte('received_at', endOfDay(dateRange.to).toISOString());
    }

    const { data, error } = await query;

    if (error) {
      toast.error('Failed to load verifications');
      console.error(error);
    } else {
      setVerifications((data || []) as GateVerification[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    fetchVerifications();
  }, [selectedDevice, selectedDecision, dateRange]);

  const getDeviceName = (deviceSn: string | null) => {
    if (!deviceSn) return '-';
    const device = devices.find(d => d.device_sn === deviceSn);
    return device?.name || deviceSn;
  };

  const getDecisionBadge = (code: number) => {
    if (code === 0) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Allowed</Badge>;
    }
    return <Badge variant="destructive">Denied</Badge>;
  };

  const getDecisionIcon = (code: number) => {
    if (code === 0) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const filteredVerifications = verifications.filter(v => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.person_name?.toLowerCase().includes(query) ||
      v.person_id?.toLowerCase().includes(query) ||
      v.decision_desc?.toLowerCase().includes(query) ||
      v.device_sn?.toLowerCase().includes(query)
    );
  });

  const handleViewPayload = (v: GateVerification) => {
    setSelectedVerification(v);
    setShowPayloadDialog(true);
  };

  const allowedCount = verifications.filter(v => v.decision_code === 0).length;
  const deniedCount = verifications.filter(v => v.decision_code !== 0).length;

  return (
    <AppLayout title="FaceGate Verifications">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{verifications.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
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
                  <p className="text-2xl font-bold">{allowedCount}</p>
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
                  <p className="text-2xl font-bold">{deniedCount}</p>
                  <p className="text-sm text-muted-foreground">Denied</p>
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
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Verification Requests
                </CardTitle>
                <CardDescription>Person verification requests and decisions</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchVerifications} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <SelectItem value="0">Allowed</SelectItem>
                    <SelectItem value="1">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        "All time"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={1}
                    />
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setDateRange({ from: undefined, to: undefined })}
                      >
                        Clear
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Verifications Table */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredVerifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No verifications found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Person</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVerifications.map((v) => (
                      <TableRow 
                        key={v.id} 
                        className={cn(
                          "cursor-pointer hover:bg-muted/50",
                          v.decision_code !== 0 && "bg-destructive/5"
                        )}
                        onClick={() => handleViewPayload(v)}
                      >
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(v.received_at), 'dd MMM HH:mm:ss')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{getDeviceName(v.device_sn)}</TableCell>
                        <TableCell>
                          {v.person_name || v.person_id ? (
                            <div>
                              <p className="font-medium text-sm">{v.person_name || '-'}</p>
                              <p className="text-xs text-muted-foreground">{v.person_id}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-sm">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDecisionIcon(v.decision_code)}
                            {getDecisionBadge(v.decision_code)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {v.decision_desc || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPayload(v);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Raw Payload Dialog */}
        <Dialog open={showPayloadDialog} onOpenChange={setShowPayloadDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Raw Verification Payload</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <pre className="bg-muted/50 p-4 rounded-lg text-xs overflow-x-auto font-mono">
                {selectedVerification ? JSON.stringify(selectedVerification.raw_payload, null, 2) : ''}
              </pre>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
