import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCheck, Search, Loader2, Camera, XCircle, CheckCircle, RefreshCw, Users } from 'lucide-react';
import { format } from 'date-fns';

interface FaceDevice {
  id: string;
  name: string;
  device_sn: string;
  is_active: boolean;
}

interface Enrollment {
  id: string;
  user_id: string;
  device_sn: string;
  person_id: string;
  enrolled_at: string;
  revoked_at: string | null;
  profile?: {
    name: string;
    email: string | null;
    avatar_url: string | null;
    member_id: string | null;
  };
  device?: {
    name: string;
  };
}

interface MemberResult {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  member_id: string | null;
}

export default function FaceTurnstileEnrollments() {
  const [devices, setDevices] = useState<FaceDevice[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Bulk sync state
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, failed: 0 });

  const fetchData = async () => {
    const [devicesRes, enrollmentsRes] = await Promise.all([
      supabase
        .from('turnstile_face_devices')
        .select('id, name, device_sn, is_active')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('turnstile_face_enrollments')
        .select(`
          *,
          profile:profiles!turnstile_face_enrollments_user_id_fkey(name, email, avatar_url, member_id),
          device:turnstile_face_devices!turnstile_face_enrollments_device_sn_fkey(name)
        `)
        .order('enrolled_at', { ascending: false })
        .limit(100),
    ]);

    if (devicesRes.error) console.error('Devices error:', devicesRes.error);
    if (enrollmentsRes.error) console.error('Enrollments error:', enrollmentsRes.error);

    setDevices(devicesRes.data || []);
    // Handle the join result shape
    const enrollmentData = (enrollmentsRes.data || []).map(e => ({
      ...e,
      profile: Array.isArray(e.profile) ? e.profile[0] : e.profile,
      device: Array.isArray(e.device) ? e.device[0] : e.device,
    }));
    setEnrollments(enrollmentData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, member_id')
      .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,member_id.ilike.%${searchQuery}%`)
      .limit(10);

    if (error) {
      toast.error('Search failed');
    } else {
      setSearchResults(data || []);
    }
    setSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleEnroll = async (member: MemberResult) => {
    if (!selectedDevice) {
      toast.error('Please select a device first');
      return;
    }

    if (!member.avatar_url) {
      toast.error('Member has no profile photo. Photo required for face enrollment.');
      return;
    }

    setEnrolling(member.id);

    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('turnstile-face-enroll', {
        body: {
          user_id: member.id,
          device_sn: selectedDevice,
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Enrollment failed');
      }

      toast.success(`Enrolled ${member.name} successfully`);
      fetchData();
      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      toast.error(error.message || 'Enrollment failed');
    }

    setEnrolling(null);
  };

  const handleRevoke = async (enrollment: Enrollment) => {
    if (!confirm(`Revoke face access for ${enrollment.profile?.name}?`)) return;

    setRevoking(enrollment.id);

    const { error } = await supabase
      .from('turnstile_face_enrollments')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', enrollment.id);

    if (error) {
      toast.error('Failed to revoke enrollment');
    } else {
      toast.success('Enrollment revoked');
      fetchData();
    }

    setRevoking(null);
  };

  const handleReactivate = async (enrollment: Enrollment) => {
    setRevoking(enrollment.id);

    const { error } = await supabase
      .from('turnstile_face_enrollments')
      .update({ revoked_at: null })
      .eq('id', enrollment.id);

    if (error) {
      toast.error('Failed to reactivate enrollment');
    } else {
      toast.success('Enrollment reactivated');
      fetchData();
    }

    setRevoking(null);
  };

  const isEnrolled = (memberId: string) => {
    return enrollments.some(e => e.user_id === memberId && e.device_sn === selectedDevice && !e.revoked_at);
  };

  // Bulk sync all members with photos to turnstile
  const handleBulkSync = async () => {
    if (!confirm('This will sync ALL members with profile photos to the turnstile device. This may take several minutes. Continue?')) {
      return;
    }

    setBulkSyncing(true);
    setSyncProgress({ current: 0, total: 0, failed: 0 });

    try {
      // Fetch all members with avatar_url
      const { data: members, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .not('avatar_url', 'is', null);

      if (error) throw error;

      const membersWithPhotos = members?.filter(m => m.avatar_url) || [];
      setSyncProgress(p => ({ ...p, total: membersWithPhotos.length }));

      if (membersWithPhotos.length === 0) {
        toast.info('No members with photos found');
        setBulkSyncing(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      let successCount = 0;
      let failCount = 0;

      // Process members one at a time to avoid overwhelming the device
      for (const member of membersWithPhotos) {
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
        toast.success(`Successfully synced ${successCount} members to turnstile`);
      } else {
        toast.warning(`Synced ${successCount} members, ${failCount} failed`);
      }

      fetchData();
    } catch (error: any) {
      console.error('Bulk sync error:', error);
      toast.error(error.message || 'Bulk sync failed');
    } finally {
      setBulkSyncing(false);
      setSyncProgress({ current: 0, total: 0, failed: 0 });
    }
  };

  return (
    <AppLayout title="Face Enrollments">
      <div className="space-y-6">
        {/* Bulk Sync Card */}
        <Card className="glass border-amber-500/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              Bulk Face Sync
            </CardTitle>
            <CardDescription>
              Sync all members with profile photos to the turnstile device
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
              <Button 
                onClick={handleBulkSync}
                className="w-full md:w-auto"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All Members to Turnstile
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Enroll New Member */}
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Enroll Member Face
            </CardTitle>
            <CardDescription>
              Enroll members for facial recognition access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Device</label>
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a turnstile..." />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.device_sn} value={device.device_sn}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Search Member</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or member ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    disabled={!selectedDevice}
                  />
                </div>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y">
                {searchResults.map((member) => {
                  const alreadyEnrolled = isEnrolled(member.id);
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Camera className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.member_id || member.email}
                          </p>
                        </div>
                        {!member.avatar_url && (
                          <Badge variant="destructive" className="text-xs">No Photo</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={alreadyEnrolled ? 'secondary' : 'default'}
                        onClick={() => handleEnroll(member)}
                        disabled={!member.avatar_url || enrolling === member.id || alreadyEnrolled}
                      >
                        {enrolling === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : alreadyEnrolled ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Enrolled
                          </>
                        ) : (
                          'Enroll'
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enrollments List */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Current Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : enrollments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No enrollments yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Person ID</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id} className={enrollment.revoked_at ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {enrollment.profile?.avatar_url ? (
                            <img
                              src={enrollment.profile.avatar_url}
                              alt={enrollment.profile?.name || 'Member'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted" />
                          )}
                          <div>
                            <p className="font-medium">{enrollment.profile?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">
                              {enrollment.profile?.member_id}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{enrollment.device?.name || enrollment.device_sn}</TableCell>
                      <TableCell className="font-mono text-sm">{enrollment.person_id}</TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(enrollment.enrolled_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {enrollment.revoked_at ? (
                          <Badge variant="secondary">Revoked</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {enrollment.revoked_at ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivate(enrollment)}
                            disabled={revoking === enrollment.id}
                          >
                            {revoking === enrollment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Reactivate'
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(enrollment)}
                            disabled={revoking === enrollment.id}
                          >
                            {revoking === enrollment.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1 text-destructive" />
                                Revoke
                              </>
                            )}
                          </Button>
                        )}
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
