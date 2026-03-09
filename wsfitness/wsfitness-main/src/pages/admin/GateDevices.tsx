import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Router, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface GateDevice {
  id: string;
  name: string;
  device_sn: string;
  device_no: string | null;
  addr_no: string | null;
  addr_name: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export default function GateDevices() {
  const [devices, setDevices] = useState<GateDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<GateDevice | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    device_sn: '',
    device_no: '',
    addr_no: '',
    addr_name: '',
    location: '',
  });

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from('turnstile_face_devices')
      .select('id, name, device_sn, device_no, addr_no, addr_name, location, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load devices');
      console.error(error);
    } else {
      setDevices((data || []) as GateDevice[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', device_sn: '', device_no: '', addr_no: '', addr_name: '', location: '' });
    setEditingDevice(null);
  };

  const handleSubmit = async () => {
    if (!formData.device_sn) {
      toast.error('Device Serial Number is required');
      return;
    }

    setSaving(true);

    if (editingDevice) {
      const { error } = await supabase
        .from('turnstile_face_devices')
        .update({
          name: formData.name || formData.device_sn,
          device_no: formData.device_no || null,
          addr_no: formData.addr_no || null,
          addr_name: formData.addr_name || null,
          location: formData.location || null,
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
          name: formData.name || formData.device_sn,
          device_sn: formData.device_sn,
          device_no: formData.device_no || null,
          addr_no: formData.addr_no || null,
          addr_name: formData.addr_name || null,
          location: formData.location || null,
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

  const handleToggleActive = async (device: GateDevice) => {
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

  const handleDelete = async (device: GateDevice) => {
    if (!confirm(`Delete device "${device.name}"?`)) return;

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

  const handleEdit = (device: GateDevice) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      device_sn: device.device_sn,
      device_no: device.device_no || '',
      addr_no: device.addr_no || '',
      addr_name: device.addr_name || '',
      location: device.location || '',
    });
    setDialogOpen(true);
  };

  return (
    <AppLayout title="FaceGate Devices">
      <div className="space-y-6">
        <Card className="glass border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-display flex items-center gap-2">
                <Router className="h-5 w-5 text-primary" />
                Device Allowlist
              </CardTitle>
              <CardDescription>Manage registered FaceGate turnstile devices</CardDescription>
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
                    <Label>Device Serial Number *</Label>
                    <Input
                      placeholder="e.g., 1122E2-AAD72B-61A9FF"
                      value={formData.device_sn}
                      onChange={(e) => setFormData(prev => ({ ...prev, device_sn: e.target.value }))}
                      disabled={!!editingDevice}
                    />
                    {editingDevice && (
                      <p className="text-xs text-muted-foreground">Serial number cannot be changed</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Device Name</Label>
                    <Input
                      placeholder="e.g., Main Entrance Gate"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Device No</Label>
                      <Input
                        placeholder="Optional"
                        value={formData.device_no}
                        onChange={(e) => setFormData(prev => ({ ...prev, device_no: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address No</Label>
                      <Input
                        placeholder="Optional"
                        value={formData.addr_no}
                        onChange={(e) => setFormData(prev => ({ ...prev, addr_no: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address Name</Label>
                    <Input
                      placeholder="e.g., Building A"
                      value={formData.addr_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, addr_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g., Ground Floor Lobby"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
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
                <Router className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No devices registered</p>
                <p className="text-sm">Add your first FaceGate device</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device SN</TableHead>
                    <TableHead>Name / Location</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-mono text-sm">{device.device_sn}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{device.name}</p>
                          {device.location && (
                            <p className="text-xs text-muted-foreground">{device.location}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {device.addr_name || device.addr_no || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={device.is_active}
                            onCheckedChange={() => handleToggleActive(device)}
                          />
                          <Badge variant={device.is_active ? 'default' : 'secondary'}>
                            {device.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(device.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
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
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>
    </AppLayout>
  );
}
