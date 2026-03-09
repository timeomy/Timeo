import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, User, Loader2, Link, CheckCircle, AlertCircle, Flag, UserCheck, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberProfile {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  member_id: string | null;
  avatar_url: string | null;
}

interface ClientLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: {
    id: string;
    name: string;
    phone: string | null;
    member_id?: string | null;
  } | null;
  onSuccess: () => void;
}

// Normalize string for fuzzy matching
const normalizeString = (str: string): string => {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

// Calculate similarity score between two strings
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Simple character matching for fuzzy match
  let matches = 0;
  const shorter = s1.length < s2.length ? s1 : s2;
  const longer = s1.length >= s2.length ? s1 : s2;
  
  for (const char of shorter) {
    if (longer.includes(char)) matches++;
  }
  
  return matches / Math.max(s1.length, s2.length);
};

export function ClientLinkDialog({ open, onOpenChange, client, onSuccess }: ClientLinkDialogProps) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [results, setResults] = useState<MemberProfile[]>([]);
  const [suggestedMatches, setSuggestedMatches] = useState<(MemberProfile & { matchReason: string; score: number })[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);
  
  // Auto-detect matches when dialog opens
  useEffect(() => {
    if (open && client) {
      findSuggestedMatches();
      setSearch('');
      setResults([]);
      setSelectedMember(null);
    }
  }, [open, client]);
  
  const findSuggestedMatches = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      // Build query to find potential matches
      const queries: string[] = [];
      
      // Phone match (exact or similar)
      if (client.phone) {
        const normalizedPhone = client.phone.replace(/\D/g, '');
        queries.push(`phone_number.ilike.%${normalizedPhone.slice(-8)}%`);
      }
      
      // Name match (fuzzy)
      if (client.name) {
        const nameParts = client.name.split(' ').filter(p => p.length > 2);
        nameParts.forEach(part => {
          queries.push(`name.ilike.%${part}%`);
        });
      }
      
      if (queries.length === 0) {
        setSuggestedMatches([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, phone_number, member_id, avatar_url')
        .or(queries.join(','))
        .limit(20);
      
      if (error) throw error;
      
      // Score and rank matches
      const scoredMatches = (data || []).map(profile => {
        let score = 0;
        let matchReason = '';
        
        // Phone match (highest priority)
        if (client.phone && profile.phone_number) {
          const clientPhone = client.phone.replace(/\D/g, '');
          const profilePhone = profile.phone_number.replace(/\D/g, '');
          if (clientPhone === profilePhone || clientPhone.endsWith(profilePhone.slice(-8)) || profilePhone.endsWith(clientPhone.slice(-8))) {
            score += 0.5;
            matchReason = '📱 Phone match';
          }
        }
        
        // Name match
        const nameSimilarity = calculateSimilarity(client.name, profile.name);
        if (nameSimilarity >= 0.7) {
          score += nameSimilarity * 0.5;
          matchReason = matchReason ? `${matchReason} + 👤 Name similar` : '👤 Name similar';
        }
        
        return { ...profile, matchReason, score };
      });
      
      // Filter and sort by score
      const topMatches = scoredMatches
        .filter(m => m.score >= 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      setSuggestedMatches(topMatches);
    } catch (error) {
      console.error('Error finding matches:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Manual search
  useEffect(() => {
    const searchMembers = async () => {
      if (search.length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, phone_number, member_id, avatar_url')
          .or(`name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%,member_id.ilike.%${search}%`)
          .limit(15);
        
        if (error) throw error;
        setResults(data || []);
      } catch (error) {
        console.error('Error searching members:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    
    const debounce = setTimeout(searchMembers, 300);
    return () => clearTimeout(debounce);
  }, [search]);
  
  const handleLink = async () => {
    if (!client || !selectedMember) return;
    
    setLinking(true);
    try {
      // Update the client record to link to the member profile
      const { error } = await supabase
        .from('clients')
        .update({ member_id: selectedMember.id })
        .eq('id', client.id);
      
      if (error) throw error;
      
      toast.success(`Linked ${client.name} to ${selectedMember.name}'s profile`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error linking client:', error);
      toast.error(error.message || 'Failed to link client');
    } finally {
      setLinking(false);
    }
  };
  
  const handleFlagForAdmin = async () => {
    if (!client) return;
    
    setFlagging(true);
    try {
      // Create a notification for admins
      // First get admin user IDs
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'it_admin']);
      
      if (rolesError) throw rolesError;
      
      const adminIds = adminRoles?.map(r => r.user_id) || [];
      
      if (adminIds.length > 0) {
        const notifications = adminIds.map(adminId => ({
          user_id: adminId,
          title: 'Client Merge Request',
          message: `Coach requested help linking client "${client.name}" to a member profile. No matching profile found.`,
          type: 'warning',
        }));
        
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert(notifications);
        
        if (notifyError) throw notifyError;
      }
      
      toast.success('Flagged for admin review');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error flagging for admin:', error);
      toast.error(error.message || 'Failed to flag for admin');
    } finally {
      setFlagging(false);
    }
  };
  
  const handleUnlink = async () => {
    if (!client) return;
    
    setLinking(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ member_id: null })
        .eq('id', client.id);
      
      if (error) throw error;
      
      toast.success('Unlinked client from member profile');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error unlinking client:', error);
      toast.error(error.message || 'Failed to unlink client');
    } finally {
      setLinking(false);
    }
  };
  
  if (!client) return null;
  
  const isAlreadyLinked = !!client.member_id;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-primary" />
            Link to App Profile
          </DialogTitle>
          <DialogDescription>
            Connect "{client.name}" to their gym member profile
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto space-y-4">
          {/* Already linked status */}
          {isAlreadyLinked && (
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Already Linked</p>
                <p className="text-xs text-muted-foreground">This client is linked to a member profile</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnlink}
                disabled={linking}
                className="text-destructive border-destructive/50"
              >
                <UserX className="h-4 w-4 mr-1" />
                Unlink
              </Button>
            </div>
          )}
          
          {/* Auto-suggested matches */}
          {!isAlreadyLinked && suggestedMatches.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">🎯 Suggested Matches</p>
              <ScrollArea className="max-h-[180px]">
                <div className="space-y-2">
                  {suggestedMatches.map((match) => (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => setSelectedMember(match)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border-2",
                        selectedMember?.id === match.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50 hover:bg-accent"
                      )}
                    >
                      {match.avatar_url ? (
                        <img src={match.avatar_url} alt={match.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{match.name}</p>
                        <div className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground">
                          {match.member_id && <Badge variant="outline" className="text-xs">{match.member_id}</Badge>}
                          {match.phone_number && <span>{match.phone_number}</span>}
                        </div>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{match.matchReason}</p>
                      </div>
                      {selectedMember?.id === match.id && (
                        <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* No auto-matches found */}
          {!isAlreadyLinked && !loading && suggestedMatches.length === 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">No automatic matches found</p>
                <p className="text-xs text-muted-foreground">Search manually below or flag for admin review</p>
              </div>
            </div>
          )}
          
          {/* Manual search */}
          {!isAlreadyLinked && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">🔍 Manual Search</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or member ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {search.length >= 2 && (
                <ScrollArea className="h-[200px]">
                  {loading ? (
                    <div className="p-4 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </div>
                  ) : results.length === 0 ? (
                    <p className="p-3 text-center text-sm text-muted-foreground">No members found</p>
                  ) : (
                    <div className="space-y-1">
                      {results.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => setSelectedMember(member)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all",
                            selectedMember?.id === member.id
                              ? "bg-primary/10 ring-2 ring-primary"
                              : "hover:bg-accent"
                          )}
                        >
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt={member.name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{member.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {member.member_id && <span className="font-mono">{member.member_id}</span>}
                              {member.phone_number && <span>• {member.phone_number}</span>}
                            </div>
                          </div>
                          {selectedMember?.id === member.id && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>
          )}
          
          {/* Selected member preview */}
          {!isAlreadyLinked && selectedMember && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-2">Selected Profile</p>
              <div className="flex items-center gap-3">
                {selectedMember.avatar_url ? (
                  <img src={selectedMember.avatar_url} alt={selectedMember.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-primary" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center ring-2 ring-primary">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-semibold">{selectedMember.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedMember.email}</p>
                  {selectedMember.member_id && (
                    <Badge variant="secondary" className="text-xs mt-1">{selectedMember.member_id}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        {!isAlreadyLinked && (
          <div className="flex items-center gap-2 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={handleFlagForAdmin}
              disabled={flagging}
              className="flex-1"
            >
              {flagging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Flag className="h-4 w-4 mr-2" />}
              Flag for Admin
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedMember || linking}
              className="flex-1"
            >
              {linking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
              Link Profile
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
