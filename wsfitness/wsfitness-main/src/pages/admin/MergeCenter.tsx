import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Link, Search, User, Loader2, AlertCircle, Users, CheckCircle, Flag, RefreshCw, Trash2 } from 'lucide-react';
import { ClientLinkDialog } from '@/components/clients/ClientLinkDialog';
import { format } from 'date-fns';
import { useMergeCenterRealtimeSync } from '@/hooks/useRealtimeSubscription';

interface UnlinkedClient {
  id: string;
  name: string;
  phone: string | null;
  package_type: string;
  assigned_coach_id: string | null;
  coach_name?: string;
  created_at: string | null;
}

interface FlaggedNotification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  client_name?: string;
}

export default function MergeCenter() {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unlinkedClients, setUnlinkedClients] = useState<UnlinkedClient[]>([]);
  const [flaggedNotifications, setFlaggedNotifications] = useState<FlaggedNotification[]>([]);
  const [search, setSearch] = useState('');
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<UnlinkedClient | null>(null);
  
  const isAdminOrIT = role === 'admin' || role === 'it_admin';
  
  useEffect(() => {
    if (isAdminOrIT) {
      fetchData();
    }
  }, [isAdminOrIT]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUnlinkedClients(), fetchFlaggedNotifications()]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUnlinkedClients = async () => {
    try {
      // Fetch clients where member_id is NULL
      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, phone, package_type, assigned_coach_id, created_at')
        .is('member_id', null)
        .order('name');
      
      if (error) throw error;
      
      // Fetch coach names for assigned coaches
      const coachIds = Array.from(
        new Set((clients || []).map(c => c.assigned_coach_id).filter(Boolean))
      ) as string[];
      
      let coachNameMap: Record<string, string> = {};
      if (coachIds.length > 0) {
        const { data: coaches, error: coachError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', coachIds);
        
        if (!coachError && coaches) {
          coaches.forEach(c => {
            coachNameMap[c.id] = c.name;
          });
        }
      }
      
      setUnlinkedClients(
        (clients || []).map(c => ({
          ...c,
          coach_name: c.assigned_coach_id ? coachNameMap[c.assigned_coach_id] : undefined,
        }))
      );
    } catch (error) {
      console.error('Error fetching unlinked clients:', error);
      toast.error('Failed to load unlinked clients');
    }
  };
  
  const fetchFlaggedNotifications = async () => {
    try {
      // Fetch notifications about merge requests
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, message, created_at')
        .eq('title', 'Client Merge Request')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Extract client names from messages
      const flagged = (data || []).map(n => {
        const match = n.message.match(/linking client "([^"]+)"/);
        return {
          ...n,
          client_name: match ? match[1] : undefined,
        };
      });
      
      setFlaggedNotifications(flagged);
    } catch (error) {
      console.error('Error fetching flagged notifications:', error);
    }
  };
  
  // Real-time subscription for automatic data refresh
  useMergeCenterRealtimeSync(fetchData);
  
  const handleDismissFlag = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
      
      setFlaggedNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Flag dismissed');
    } catch (error) {
      console.error('Error dismissing flag:', error);
      toast.error('Failed to dismiss flag');
    }
  };
  
  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Delete client "${clientName}"? This cannot be undone.`)) return;
    
    try {
      // First delete related training logs
      await supabase.from('training_logs').delete().eq('client_id', clientId);
      
      // Then delete the client
      const { error } = await supabase.from('clients').delete().eq('id', clientId);
      
      if (error) throw error;
      
      setUnlinkedClients(prev => prev.filter(c => c.id !== clientId));
      toast.success(`Deleted client "${clientName}"`);
    } catch (error) {
      console.error('Error deleting client:', error);
      toast.error('Failed to delete client');
    }
  };
  
  const filteredClients = unlinkedClients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    (client.phone && client.phone.includes(search)) ||
    (client.coach_name && client.coach_name.toLowerCase().includes(search.toLowerCase()))
  );
  
  if (!isAdminOrIT) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">You don't have permission to access this page.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Merge Center</h1>
              <p className="text-muted-foreground">Link coach clients to gym member profiles</p>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/15">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unlinkedClients.length}</p>
                  <p className="text-xs text-muted-foreground">Unlinked Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/15">
                  <Flag className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{flaggedNotifications.length}</p>
                  <p className="text-xs text-muted-foreground">Flagged for Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Refresh Button */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        <Tabs defaultValue="unlinked" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unlinked" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Unlinked Clients
              {unlinkedClients.length > 0 && (
                <Badge variant="secondary" className="ml-1">{unlinkedClients.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="flagged" className="gap-2">
              <Flag className="h-4 w-4" />
              Flagged for Review
              {flaggedNotifications.length > 0 && (
                <Badge variant="destructive" className="ml-1">{flaggedNotifications.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Unlinked Clients Tab */}
          <TabsContent value="unlinked" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Unlinked Coach Clients</CardTitle>
                <CardDescription>
                  These clients don't have a linked gym member profile. Link them to sync data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or coach..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium">All clients are linked!</p>
                    <p className="text-sm text-muted-foreground">No unlinked clients found.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {client.phone && <span>{client.phone}</span>}
                                {client.coach_name && (
                                  <>
                                    <span>•</span>
                                    <span>Coach: {client.coach_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{client.package_type}</Badge>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedClient(client);
                                setLinkDialogOpen(true);
                              }}
                            >
                              <Link className="h-4 w-4 mr-1" />
                              Link
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteClient(client.id, client.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Flagged for Review Tab */}
          <TabsContent value="flagged" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Flagged for Admin Review</CardTitle>
                <CardDescription>
                  Coaches flagged these clients because they couldn't find a matching profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : flaggedNotifications.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium">No flagged requests!</p>
                    <p className="text-sm text-muted-foreground">All merge requests have been resolved.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {flaggedNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 rounded-lg border bg-red-500/5 border-red-500/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-red-500/15 shrink-0">
                                <Flag className="h-4 w-4 text-red-500" />
                              </div>
                              <div>
                                <p className="font-medium">{notification.client_name || 'Unknown Client'}</p>
                                <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Flagged on {format(new Date(notification.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  // Find the client by name and open link dialog
                                  const client = unlinkedClients.find(
                                    c => c.name.toLowerCase() === notification.client_name?.toLowerCase()
                                  );
                                  if (client) {
                                    setSelectedClient(client);
                                    setLinkDialogOpen(true);
                                  } else {
                                    toast.error('Client not found in unlinked list');
                                  }
                                }}
                              >
                                <Link className="h-4 w-4 mr-1" />
                                Link Now
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDismissFlag(notification.id)}
                              >
                                Dismiss
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Link Dialog */}
        <ClientLinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          client={selectedClient}
          onSuccess={() => {
            fetchData();
            setSelectedClient(null);
          }}
        />
      </div>
    </AppLayout>
  );
}
