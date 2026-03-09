import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format, isFuture, isToday, parseISO, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Clock, RefreshCw, Loader2, User, X, CalendarDays, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ScheduledPass {
  id: string;
  user_id: string;
  plan_type: string;
  valid_from: string;
  expiry_date: string;
  status: string;
  profiles: {
    name: string;
    email: string | null;
    avatar_url: string | null;
    phone_number: string | null;
  } | null;
}

export function ScheduledDayPasses() {
  const [passes, setPasses] = useState<ScheduledPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [reschedulePass, setReschedulePass] = useState<ScheduledPass | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [restorePass, setRestorePass] = useState<ScheduledPass | null>(null);
  const [restoreDate, setRestoreDate] = useState<Date>(new Date());
  const [cancelledPasses, setCancelledPasses] = useState<ScheduledPass[]>([]);

  useEffect(() => {
    fetchScheduledPasses();
  }, []);

  const fetchScheduledPasses = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Fetch active scheduled day passes
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          plan_type,
          valid_from,
          expiry_date,
          status,
          profiles (
            name,
            email,
            avatar_url,
            phone_number
          )
        `)
        .gte('valid_from', todayStr)
        .neq('status', 'cancelled')
        .or('plan_type.ilike.%day pass%,plan_type.ilike.%day-pass%,plan_type.ilike.%daypass%')
        .order('valid_from', { ascending: true });

      // Fetch cancelled day passes
      const { data: cancelled, error: cancelledError } = await supabase
        .from('memberships')
        .select(`
          id,
          user_id,
          plan_type,
          valid_from,
          expiry_date,
          status,
          profiles (
            name,
            email,
            avatar_url,
            phone_number
          )
        `)
        .eq('status', 'cancelled')
        .or('plan_type.ilike.%day pass%,plan_type.ilike.%day-pass%,plan_type.ilike.%daypass%')
        .order('valid_from', { ascending: false })
        .limit(20);

      if (error) throw error;
      if (cancelledError) throw cancelledError;
      setPasses((data as ScheduledPass[]) || []);
      setCancelledPasses((cancelled as ScheduledPass[]) || []);
    } catch (error) {
      console.error('Error fetching scheduled passes:', error);
      toast.error('Failed to load scheduled passes');
    } finally {
      setLoading(false);
    }
  };

  const openRestoreDialog = (pass: ScheduledPass) => {
    setRestorePass(pass);
    setRestoreDate(new Date()); // Default to today
  };

  const handleRestore = async () => {
    if (!restorePass || !restoreDate) return;
    
    setSaving(true);
    try {
      // Restore to active status with selected date
      const validFrom = new Date(restoreDate);
      validFrom.setHours(0, 0, 0, 0);
      const expiryDate = new Date(restoreDate);
      expiryDate.setHours(23, 59, 59, 999);

      const { error } = await supabase
        .from('memberships')
        .update({ 
          status: 'active',
          valid_from: validFrom.toISOString(),
          expiry_date: expiryDate.toISOString(),
        })
        .eq('id', restorePass.id);

      if (error) throw error;
      toast.success(`Day pass restored for ${format(restoreDate, 'MMM d, yyyy')}`);
      setRestorePass(null);
      fetchScheduledPasses();
    } catch (error) {
      console.error('Error restoring pass:', error);
      toast.error('Failed to restore pass');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (pass: ScheduledPass) => {
    if (!confirm(`Cancel day pass for ${pass.profiles?.name || 'this member'}?`)) return;
    
    try {
      const { error } = await supabase
        .from('memberships')
        .update({ status: 'cancelled' })
        .eq('id', pass.id);

      if (error) throw error;
      toast.success('Day pass cancelled');
      fetchScheduledPasses();
    } catch (error) {
      console.error('Error cancelling pass:', error);
      toast.error('Failed to cancel pass');
    }
  };

  const openReschedule = (pass: ScheduledPass) => {
    setReschedulePass(pass);
    setRescheduleDate(pass.valid_from ? parseISO(pass.valid_from) : undefined);
  };

  const handleReschedule = async () => {
    if (!reschedulePass || !rescheduleDate) return;

    setSaving(true);
    try {
      // Set start of day for valid_from
      const validFrom = new Date(rescheduleDate);
      validFrom.setHours(0, 0, 0, 0);

      // Set end of day for expiry
      const expiryDate = new Date(rescheduleDate);
      expiryDate.setHours(23, 59, 59, 999);

      const { error } = await supabase
        .from('memberships')
        .update({
          valid_from: validFrom.toISOString(),
          expiry_date: expiryDate.toISOString(),
        })
        .eq('id', reschedulePass.id);

      if (error) throw error;
      toast.success('Day pass rescheduled');
      setReschedulePass(null);
      fetchScheduledPasses();
    } catch (error) {
      console.error('Error rescheduling pass:', error);
      toast.error('Failed to reschedule pass');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (validFrom: string) => {
    const date = parseISO(validFrom);
    if (isToday(date)) {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Today
        </Badge>
      );
    }
    if (isFuture(date)) {
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <CalendarIcon className="h-3 w-3 mr-1" />
          Scheduled
        </Badge>
      );
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  if (loading) {
    return (
      <Card className="border-border/50 bg-card">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-amber-500" />
              Scheduled Day Passes
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {passes.length} upcoming day pass{passes.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchScheduledPasses}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {passes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No scheduled day passes</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Member</TableHead>
                    <TableHead>Visit Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passes.map((pass) => (
                    <TableRow key={pass.id} className="hover:bg-muted/10">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={pass.profiles?.avatar_url || undefined} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{pass.profiles?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{pass.plan_type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {format(parseISO(pass.valid_from), 'EEE, MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Expires: {format(parseISO(pass.expiry_date), 'h:mm a')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(pass.valid_from)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {pass.profiles?.phone_number || pass.profiles?.email || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem onClick={() => openReschedule(pass)}>
                              <CalendarDays className="h-4 w-4 mr-2" />
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleCancel(pass)}
                              className="text-destructive focus:text-destructive"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel Pass
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Cancelled Day Passes Section */}
          {cancelledPasses.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <X className="h-4 w-4" />
                Cancelled Passes ({cancelledPasses.length})
              </h4>
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead>Member</TableHead>
                      <TableHead>Original Date</TableHead>
                      <TableHead className="w-24">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cancelledPasses.map((pass) => (
                      <TableRow key={pass.id} className="hover:bg-muted/10 opacity-70">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={pass.profiles?.avatar_url || undefined} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{pass.profiles?.name || 'Unknown'}</p>
                              <Badge variant="outline" className="text-xs mt-0.5">Cancelled</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-muted-foreground">
                            {pass.valid_from ? format(parseISO(pass.valid_from), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openRestoreDialog(pass)}
                            className="h-7 text-xs"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <Dialog open={!!reschedulePass} onOpenChange={(open) => !open && setReschedulePass(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Reschedule Day Pass</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Reschedule day pass for <span className="font-medium text-foreground">{reschedulePass?.profiles?.name}</span>
            </p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={rescheduleDate}
                onSelect={setRescheduleDate}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border border-border bg-background"
              />
            </div>
            {rescheduleDate && (
              <p className="text-center mt-4 text-sm">
                New date: <span className="font-medium text-primary">{format(rescheduleDate, 'EEEE, MMMM d, yyyy')}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReschedulePass(null)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={!rescheduleDate || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-2" />}
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={!!restorePass} onOpenChange={(open) => !open && setRestorePass(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Restore Day Pass</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Restore day pass for <span className="font-medium text-foreground">{restorePass?.profiles?.name}</span>
            </p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={restoreDate}
                onSelect={(date) => date && setRestoreDate(date)}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border border-border bg-background pointer-events-auto"
              />
            </div>
            {restoreDate && (
              <p className="text-center mt-4 text-sm">
                Visit date: <span className="font-medium text-primary">{format(restoreDate, 'EEEE, MMMM d, yyyy')}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestorePass(null)}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={!restoreDate || saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Restore Pass
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}