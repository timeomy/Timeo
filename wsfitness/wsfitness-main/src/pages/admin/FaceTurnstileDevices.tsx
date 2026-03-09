import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Scan, Power, PowerOff, Loader2, Users, RefreshCw, Clock, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FaceDevice {
  id: string;
  name: string;
  device_sn: string;
  location: string | null;
  device_type: 'gpio' | 'wiegand';
  is_active: boolean;
  created_at: string;
}

interface QueuedCommand {
  id: string;
  device_sn: string;
  command_json: {
    cmd: string;
    id?: string;
    name?: string;
    [key: string]: unknown;
  };
  status: string;
  created_at: string;
  sent_at: string | null;
}

export default function FaceTurnstileDevices() {
  const [devices, setDevices] = useState<FaceDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<FaceDevice | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    device_sn: '',
    location: '',
    device_type: 'gpio' as 'gpio' | 'wiegand',
  });

  // Bulk sync state
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, failed: 0 });
  
  // Command queue state
  const [queuedCommands, setQueuedCommands] = useState<QueuedCommand[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from('turnstile_face_devices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load devices');
      console.error(error);
    } else {
      setDevices((data || []) as FaceDevice[]);
    }
    setLoading(false);
  };

  const fetchQueuedCommands = async () => {
    setQueueLoading(true);
    const { data, error } = await supabase
      .from('turnstile_command_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to fetch command queue:', error);
    } else {
      setQueuedCommands((data || []) as QueuedCommand[]);
    }
    setQueueLoading(false);
  };

  // Cleanup old sent commands (24 hours)
  const cleanupOldCommands = async () => {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { error, count } = await supabase
      .from('turnstile_command_queue')
      .delete()
      .eq('status', 'sent')
      .lt('sent_at', cutoffTime);

    if (error) {
      console.error('Failed to cleanup old commands:', error);
    } else if (count && count > 0) {
      console.log(`Cleaned up ${count} old sent commands`);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchQueuedCommands();
    
    // Cleanup on load and every 5 minutes
    cleanupOldCommands();
    const cleanupInterval = setInterval(cleanupOldCommands, 5 * 60 * 1000);
    return () => clearInterval(cleanupInterval);
  }, []);

  const resetForm = () => {
    setFormData({ name: '', device_sn: '', location: '', device_type: 'gpio' });
    setEditingDevice(null);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.device_sn) {
      toast.error('Name and Serial Number are required');
      return;
    }

    setSaving(true);

    if (editingDevice) {
      const { error } = await supabase
        .from('turnstile_face_devices')
        .update({
          name: formData.name,
          location: formData.location || null,
          device_type: formData.device_type,
        })
        .eq('id', editingDevice.id);

      if (error) {
        toast.error('Failed to update device');
      } else {
        toast.success('Device updated');
        fetchDevices();
        setDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from('turnstile_face_devices')
        .insert({
          name: formData.name,
          device_sn: formData.device_sn,
          location: formData.location || null,
          device_type: formData.device_type,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Device with this serial number already exists');
        } else {
          toast.error('Failed to add device');
        }
      } else {
        toast.success('Device added');
        fetchDevices();
        setDialogOpen(false);
        resetForm();
      }
    }

    setSaving(false);
  };

  const handleToggleActive = async (device: FaceDevice) => {
    const { error } = await supabase
      .from('turnstile_face_devices')
      .update({ is_active: !device.is_active })
      .eq('id', device.id);

    if (error) {
      toast.error('Failed to update device status');
    } else {
      toast.success(device.is_active ? 'Device disabled' : 'Device enabled');
      fetchDevices();
    }
  };

  const handleDelete = async (device: FaceDevice) => {
    if (!confirm(`Delete device "${device.name}"? This will remove all enrollments.`)) return;

    const { error } = await supabase
      .from('turnstile_face_devices')
      .delete()
      .eq('id', device.id);

    if (error) {
      toast.error('Failed to delete device');
    } else {
      toast.success('Device deleted');
      fetchDevices();
    }
  };

  const handleEdit = (device: FaceDevice) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      device_sn: device.device_sn,
      location: device.location || '',
      device_type: device.device_type,
    });
    setDialogOpen(true);
  };

  // Retry a failed/pending command
  const handleRetryCommand = async (command: QueuedCommand) => {
    const { error } = await supabase
      .from('turnstile_command_queue')
      .update({ status: 'pending', sent_at: null })
      .eq('id', command.id);

    if (error) {
      toast.error('Failed to retry command');
    } else {
      toast.success('Command queued for retry');
      fetchQueuedCommands();
    }
  };

  // Delete a queued command
  const handleDeleteCommand = async (id: string) => {
    const { error } = await supabase
      .from('turnstile_command_queue')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete command');
    } else {
      toast.success('Command deleted');
      fetchQueuedCommands();
    }
  };

  // Bulk sync all active members with photos to turnstile
  const handleBulkSync = async () => {
    if (!confirm('This will sync ALL active members with profile photos to the turnstile device. This may take several minutes. Continue?')) {
      return;
    }

    setBulkSyncing(true);
    setSyncProgress({ current: 0, total: 0, failed: 0 });

    try {
      // Fetch all active members with photos by joining profiles with memberships
      const { data: activeMembers, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          avatar_url,
          memberships!fk_memberships_profiles(status, expiry_date)
        `)
        .not('avatar_url', 'is', null);

      if (error) throw error;

      // Filter to only active members (status = 'active' or expiry_date is null/future)
      const now = new Date().toISOString();
      const membersWithActiveStatus = (activeMembers || []).filter(m => {
        const membership = Array.isArray(m.memberships) ? m.memberships[0] : m.memberships;
        if (!membership) return false;
        // Include if status is active, or expiry_date is null (staff/lifetime), or expiry is in the future
        return membership.status === 'active' || 
               !membership.expiry_date || 
               membership.expiry_date >= now;
      }).filter(m => m.avatar_url);

      setSyncProgress(p => ({ ...p, total: membersWithActiveStatus.length }));

      if (membersWithActiveStatus.length === 0) {
        toast.info('No active members with photos found');
        setBulkSyncing(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      let successCount = 0;
      let failCount = 0;

      // Process members one at a time to avoid overwhelming the device
      for (const member of membersWithActiveStatus) {
        try {
          const response = await supabase.functions.invoke('sync-user-to-turnstile', {
            body: {
              type: 'UPDATE',
              table: 'profiles',
              record: {
                id: member.id,
                name: member.name,
                avatar_url: member.avatar_url,
              },
              old_record: {
                id: member.id,
                name: member.name,
                avatar_url: null, // Force re-sync
              },
            },
            headers: { Authorization: `Bearer ${session?.access_token}` },
          });

          if (response.error || response.data?.success === false) {
            failCount++;
            console.error(`Failed to sync ${member.name}:`, response.error || response.data?.message);
          } else {
            successCount++;
          }
        } catch (err) {
          failCount++;
          console.error(`Failed to sync ${member.name}:`, err);
        }

        setSyncProgress(p => ({
          ...p,
          current: p.current + 1,
          failed: failCount,
        }));

        // Small delay between requests to avoid overwhelming the device
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (failCount === 0) {
        toast.success(`Successfully synced ${successCount} active members to turnstile`);
      } else {
        toast.warning(`Synced ${successCount} members, ${failCount} failed`);
      }
    } catch (error: any) {
      console.error('Bulk sync error:', error);
      toast.error(error.message || 'Bulk sync failed');
    } finally {
      setBulkSyncing(false);
      setSyncProgress({ current: 0, total: 0, failed: 0 });
    }
  };

  return (
    <AppLayout title="Face Turnstile Devices">
      <div className="space-y-6">
        {/* Bulk Sync Card */}
        <Card className="glass border-amber-500/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              Bulk Face Sync
            </CardTitle>
            <CardDescription>
              Sync all active members with profile photos to the turnstile device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {bulkSyncing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>Syncing members...</span>
                  <span className="text-muted-foreground">
                    {syncProgress.current} / {syncProgress.total}
                    {syncProgress.failed > 0 && (
                      <span className="text-destructive ml-2">({syncProgress.failed} failed)</span>
                    )}
                  </span>
                </div>
                <Progress 
                  value={syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  Please wait, this may take several minutes. Do not close this page.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleBulkSync}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync All Active Members
                </Button>
                <p className="text-xs text-muted-foreground self-center">
                  Only syncs members with active/valid memberships
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Scan className="h-5 w-5 text-primary" />
                Face Recognition Turnstiles
              </CardTitle>
              <CardDescription>Manage facial recognition turnstile devices</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDevice ? 'Edit Device' : 'Add New Device'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Device Name</Label>
                    <Input
                      placeholder="e.g., Main Entrance"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Device Serial Number</Label>
                    <Input
                      placeholder="e.g., FC001234567890"
                      value={formData.device_sn}
                      onChange={(e) => setFormData(prev => ({ ...prev, device_sn: e.target.value }))}
                      disabled={!!editingDevice}
                    />
                    {editingDevice && (
                      <p className="text-xs text-muted-foreground">Serial number cannot be changed</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Location (optional)</Label>
                    <Input
                      placeholder="e.g., Ground Floor"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Device Type</Label>
                    <Select
                      value={formData.device_type}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, device_type: v as 'gpio' | 'wiegand' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpio">GPIO (Relay)</SelectItem>
                        <SelectItem value="wiegand">Wiegand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingDevice ? 'Update' : 'Add Device'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Scan className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No devices configured</p>
                <p className="text-sm">Add your first face recognition turnstile</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell className="font-mono text-sm">{device.device_sn}</TableCell>
                      <TableCell>{device.location || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{device.device_type.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.is_active ? 'default' : 'secondary'}>
                          {device.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(device)}
                            title={device.is_active ? 'Disable' : 'Enable'}
                          >
                            {device.is_active ? (
                              <PowerOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Power className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(device)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(device)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pending Commands Queue */}
        <Card className="glass border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Command Queue
              </CardTitle>
              <CardDescription>
                Commands waiting to be sent to devices via heartbeat piggyback
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchQueuedCommands} disabled={queueLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${queueLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : queuedCommands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No commands in queue</p>
                <p className="text-sm">Commands are sent when devices send their next heartbeat</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Command</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queuedCommands.map((cmd) => (
                    <TableRow key={cmd.id}>
                      <TableCell className="font-mono text-xs">{cmd.device_sn}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cmd.command_json.cmd}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {cmd.command_json.name || cmd.command_json.id || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={cmd.status === 'pending' ? 'default' : cmd.status === 'sent' ? 'secondary' : 'destructive'}
                          className="flex items-center gap-1 w-fit"
                        >
                          {cmd.status === 'pending' && <Clock className="h-3 w-3" />}
                          {cmd.status === 'sent' && <CheckCircle2 className="h-3 w-3" />}
                          {cmd.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                          {cmd.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(cmd.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {cmd.status !== 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetryCommand(cmd)}
                              title="Retry"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCommand(cmd.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Commands older than 24 hours are automatically cleaned up.
            </p>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg">Turnstile Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-foreground">Device Callback URL:</p>
              <code className="block mt-1 p-2 bg-muted rounded text-xs font-mono break-all">
                https://gate.wsfitness.my/turnstile/face
              </code>
              <p className="text-muted-foreground text-xs mt-1">
                Cloudflare proxies this to /functions/v1/turnstile-face-callback
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">Protocol (Piggyback Queue):</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 mt-1">
                <li>Device sends heartbeat/face event → Server checks queue for pending commands</li>
                <li>If command found → Return command JSON instead of normal ACK</li>
                <li>If no command → Return normal ACK response</li>
                <li>Commands are sent one at a time per heartbeat</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
