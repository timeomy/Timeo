import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera, Check, X, Search, Loader2, User } from 'lucide-react';
import { BiometricPhotoCapture } from './BiometricPhotoCapture';

interface Member {
  user_id: string;
  name: string;
  member_id: string | null;
  avatar_url: string | null;
  status: string;
}

interface BiometricGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BiometricGallery({ open, onOpenChange }: BiometricGalleryProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'missing' | 'with'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select(`
          user_id,
          status,
          profiles:user_id (
            name,
            member_id,
            avatar_url
          )
        `)
        .not('profiles.member_id', 'is', null);

      if (error) throw error;

      const memberList: Member[] = (data || []).map(m => ({
        user_id: m.user_id,
        name: (m.profiles as any)?.name || 'Unknown',
        member_id: (m.profiles as any)?.member_id || null,
        avatar_url: (m.profiles as any)?.avatar_url || null,
        status: m.status || 'inactive',
      }));

      setMembers(memberList);
    } catch (error: any) {
      console.error('Failed to fetch members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member => {
    // Filter by photo status
    if (filter === 'missing' && member.avatar_url) return false;
    if (filter === 'with' && !member.avatar_url) return false;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        member.name.toLowerCase().includes(query) ||
        (member.member_id?.toLowerCase().includes(query) ?? false)
      );
    }

    return true;
  });

  const handleMemberClick = (member: Member) => {
    if (!member.avatar_url) {
      setSelectedMember(member);
      setPhotoDialogOpen(true);
    }
  };

  const handlePhotoCapture = async (file: File) => {
    if (!selectedMember) return;

    try {
      // Upload to storage
      const fileName = `${selectedMember.user_id}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', selectedMember.user_id);

      if (updateError) throw updateError;

      toast.success('Photo uploaded successfully');
      setPhotoDialogOpen(false);
      setSelectedMember(null);
      fetchMembers(); // Refresh the gallery
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload photo');
      throw error;
    }
  };

  const stats = {
    total: members.length,
    withPhoto: members.filter(m => m.avatar_url).length,
    missing: members.filter(m => !m.avatar_url).length,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Biometric Photo Gallery
            </DialogTitle>
          </DialogHeader>

          {/* Stats & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({stats.total})
              </Button>
              <Button
                variant={filter === 'missing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('missing')}
                className={filter === 'missing' ? '' : 'border-amber-500/50 text-amber-500'}
              >
                Missing ({stats.missing})
              </Button>
              <Button
                variant={filter === 'with' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('with')}
                className={filter === 'with' ? '' : 'border-emerald-500/50 text-emerald-500'}
              >
                With Photo ({stats.withPhoto})
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <User className="h-12 w-12 mb-2" />
                <p>No members found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-1">
                {filteredMembers.map((member) => (
                  <div
                    key={member.user_id}
                    onClick={() => handleMemberClick(member)}
                    className={`relative group rounded-xl overflow-hidden border transition-all ${
                      member.avatar_url
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-amber-500/30 bg-amber-500/5 cursor-pointer hover:border-amber-500 hover:bg-amber-500/10'
                    }`}
                  >
                    {/* Photo/Placeholder */}
                    <div className="aspect-square bg-muted relative">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                          <Camera className="h-8 w-8" />
                          <span className="text-xs">No Photo</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      <Badge
                        className={`absolute top-2 right-2 text-xs ${
                          member.avatar_url
                            ? 'bg-emerald-500/90 text-white'
                            : 'bg-amber-500/90 text-white'
                        }`}
                      >
                        {member.avatar_url ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      </Badge>

                      {/* Hover overlay for missing photos */}
                      {!member.avatar_url && (
                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2 text-center">
                      <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {member.member_id || 'No ID'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Capture Dialog */}
      <BiometricPhotoCapture
        open={photoDialogOpen}
        onOpenChange={setPhotoDialogOpen}
        onCapture={handlePhotoCapture}
        currentAvatarUrl={selectedMember?.avatar_url}
      />
    </>
  );
}
