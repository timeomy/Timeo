import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Key, Copy, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { SortableTableHead, useSortableTable } from '@/components/ui/sortable-table-head';

const inviteCodeSchema = z.object({
  code: z.string().min(3, 'Min 3 characters').max(30, 'Max 30 characters').toUpperCase(),
  max_uses: z.number().min(1, 'Minimum 1 use'),
  is_active: z.boolean(),
  expires_at: z.string().optional(),
});

interface InviteCode {
  id: string;
  code: string;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function InviteCodeManager() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    code: '',
    max_uses: 50,
    is_active: true,
    expires_at: '',
  });

  const fetchCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invite codes:', error);
      toast.error('Failed to load invite codes');
    } else {
      setCodes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    // Format: XXXX-XXXX
    for (let i = 0; i < 8; i++) {
      if (i === 4) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, code }));
  };

  const handleCreate = async () => {
    const result = inviteCodeSchema.safeParse({
      ...form,
      code: form.code.toUpperCase().replace(/\s/g, ''),
      max_uses: Number(form.max_uses),
    });

    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase.from('invite_codes').insert({
        code: form.code.toUpperCase().replace(/\s/g, ''),
        max_uses: form.max_uses,
        is_active: form.is_active,
        expires_at: form.expires_at || null,
        created_by: userData.user?.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('This code already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Invite code created');
      setDialogOpen(false);
      setForm({ code: '', max_uses: 50, is_active: true, expires_at: '' });
      await fetchCodes();
    } catch (error: any) {
      console.error('Error creating invite code:', error);
      toast.error(error.message || 'Failed to create invite code');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('invite_codes')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Code ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchCodes();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invite code?')) return;

    const { error } = await supabase.from('invite_codes').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      toast.success('Invite code deleted');
      fetchCodes();
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Invite Codes ({codes.length})
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-neon">
              <Plus className="h-4 w-4 mr-1" />
              Create Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Invite Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Code Name *</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.code}
                    onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="VIP-2025"
                    className="font-mono uppercase tracking-wider"
                  />
                  <Button type="button" variant="outline" onClick={generateCode}>
                    🎲
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Usage Limit *</Label>
                  <Input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm(p => ({ ...p, max_uses: Number(e.target.value) }))}
                    min={1}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expires At</Label>
                  <Input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) => setForm(p => ({ ...p, expires_at: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm(p => ({ ...p, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="bg-gradient-neon">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Code
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <InviteCodesTable codes={codes} onToggleStatus={handleToggleStatus} onDelete={handleDelete} copyToClipboard={copyToClipboard} />
      </CardContent>
    </Card>
  );
}

// Separate table component to use hook properly
function InviteCodesTable({ codes, onToggleStatus, onDelete, copyToClipboard }: {
  codes: InviteCode[];
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  copyToClipboard: (code: string) => void;
}) {
  const { sortKey, sortDirection, handleSort, sortedData } = useSortableTable(codes, 'created_at', 'desc');

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead sortKey="code" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Code</SortableTableHead>
          <SortableTableHead sortKey="times_used" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Usage</SortableTableHead>
          <SortableTableHead sortKey="expires_at" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Expires</SortableTableHead>
          <SortableTableHead sortKey="is_active" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Status</SortableTableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No invite codes yet
            </TableCell>
          </TableRow>
        ) : (
          sortedData.map((code) => {
            const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
            const isFull = code.max_uses !== null && code.times_used >= code.max_uses;
            
            return (
              <TableRow key={code.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-primary">{code.code}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(code.code)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={isFull ? 'text-destructive font-medium' : ''}>
                    {code.times_used} / {code.max_uses ?? '∞'}
                  </span>
                  {isFull && <span className="ml-2 text-xs text-destructive">(Full)</span>}
                </TableCell>
                <TableCell>
                  {code.expires_at ? (
                    <span className={isExpired ? 'text-destructive' : ''}>
                      {new Date(code.expires_at).toLocaleDateString()}
                      {isExpired && <span className="ml-1 text-xs">(Expired)</span>}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={code.is_active && !isExpired && !isFull ? 'default' : 'secondary'}>
                    {!code.is_active ? 'Inactive' : isExpired ? 'Expired' : isFull ? 'Full' : 'Active'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Switch
                      checked={code.is_active}
                      onCheckedChange={() => onToggleStatus(code.id, code.is_active)}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onDelete(code.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
