import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { MemberEmptyState } from '@/components/admin/MemberEmptyState';
import { MemberListSkeleton } from '@/components/admin/MemberListSkeleton';
import { MemberProfileDialog } from '@/components/admin/MemberProfileDialog';
import { usePaginatedMembers, getAvatarThumbnail, MemberFilter } from '@/hooks/usePaginatedMembers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportToCSV, flattenMemberData } from '@/lib/csvExport';
import { cn } from '@/lib/utils';
import { 
  Loader2, Search, RefreshCw, Download, Eye, Trash2, Filter, 
  ImageOff, Shield, UserCog, Dumbbell, Users, AlertTriangle, CalendarIcon 
} from 'lucide-react';

interface PaginatedMemberTableProps {
  tabType: 'active' | 'expired' | 'staff' | 'scheduled';
}

export function PaginatedMemberTable({ tabType }: PaginatedMemberTableProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [missingIdFilter, setMissingIdFilter] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedProfileMember, setSelectedProfileMember] = useState<any>(null);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [renewDays, setRenewDays] = useState(30);
  const [saving, setSaving] = useState(false);

  // Debounce search input - faster for better UX
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(timer);
  }, [search]);

  // Clear selection when tab changes
  useEffect(() => {
    setSelectedMembers(new Set());
    setSearch('');
    setMissingIdFilter(false);
  }, [tabType]);

  const filter: MemberFilter = useMemo(() => ({
    tab: tabType,
    search: debouncedSearch,
    missingIdOnly: missingIdFilter,
  }), [tabType, debouncedSearch, missingIdFilter]);

  const {
    members,
    totalCount,
    totalPages,
    page,
    setPage,
    sortKey,
    sortDirection,
    handleSort,
    isLoading,
    isFetching,
    refresh,
  } = usePaginatedMembers(filter, 20);

  const getRoleBadge = (role: string) => {
    switch(role) {
      case 'it_admin':
      case 'admin':
        return (
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            <Shield className="h-3 w-3 mr-1" />
            {role === 'it_admin' ? 'IT Admin' : 'Admin'}
          </Badge>
        );
      case 'coach':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <Dumbbell className="h-3 w-3 mr-1" />
            Coach
          </Badge>
        );
      case 'studio':
        return (
          <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
            <Dumbbell className="h-3 w-3 mr-1" />
            Studio
          </Badge>
        );
      case 'vendor':
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            Vendor
          </Badge>
        );
      case 'staff':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            <UserCog className="h-3 w-3 mr-1" />
            Staff
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-muted/50">
            <Users className="h-3 w-3 mr-1" />
            Member
          </Badge>
        );
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const currentPageIds = members.map(m => m.id);
    const allSelected = currentPageIds.every(id => selectedMembers.has(id));
    
    if (allSelected) {
      setSelectedMembers(prev => {
        const next = new Set(prev);
        currentPageIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedMembers(prev => {
        const next = new Set(prev);
        currentPageIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setDeletingMemberId(memberToDelete.user_id);
    try {
      const res = await supabase.functions.invoke('delete-user', {
        body: { userId: memberToDelete.user_id },
      });
      if (res.error || res.data?.error) throw new Error(res.data?.error || res.error?.message);
      toast.success('Member deleted');
      setDeleteConfirmOpen(false);
      setMemberToDelete(null);
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete member');
    } finally {
      setDeletingMemberId(null);
    }
  };

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedMembers);
    if (selectedIds.length === 0) return;
    
    setBulkDeleting(true);
    toast.loading(`Deleting ${selectedIds.length} member(s)...`, { id: 'bulk-delete' });
    
    try {
      const membersToDelete = members.filter(m => selectedIds.includes(m.id));
      const userIds = membersToDelete.map(m => m.user_id).filter(Boolean);
      
      let deleted = 0;
      let failed = 0;

      for (const userId of userIds) {
        try {
          const res = await supabase.functions.invoke('delete-user', { body: { userId } });
          if (res.error) throw new Error(res.error.message);
          if (res.data?.error) throw new Error(res.data.error);
          deleted++;
        } catch {
          failed++;
        }
      }

      setSelectedMembers(new Set());
      refresh();
      
      toast.dismiss('bulk-delete');
      if (deleted > 0) toast.success(`Successfully deleted ${deleted} member(s)`);
      if (failed > 0) toast.error(`Failed to delete ${failed} member(s)`);
    } catch (error: any) {
      toast.dismiss('bulk-delete');
      toast.error(error.message || 'Bulk delete failed');
    } finally {
      setBulkDeleting(false);
      setBulkDeleteOpen(false);
    }
  };

  const openRenewDialog = (member: any) => {
    setSelectedMember(member);
    setRenewDays(30);
    setRenewDialogOpen(true);
  };

  const handleRenewMembership = async () => {
    if (!selectedMember) return;
    
    setSaving(true);
    try {
      const currentExpiry = selectedMember.expiry_date 
        ? new Date(selectedMember.expiry_date) 
        : new Date();
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + renewDays);
      const newExpiryStr = newExpiry.toISOString().split('T')[0];

      const { error: updateError } = await supabase
        .from('memberships')
        .update({ 
          expiry_date: newExpiryStr,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMember.id);

      if (updateError) throw updateError;

      toast.success(`Membership extended by ${renewDays} days`);
      setRenewDialogOpen(false);
      setSelectedMember(null);
      setRenewDays(30);
      refresh();
    } catch (error: any) {
      toast.error(error.message || 'Failed to renew membership');
    } finally {
      setSaving(false);
    }
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (isLoading && members.length === 0) {
    return <MemberListSkeleton />;
  }

  const isEmpty = members.length === 0 && !debouncedSearch && !missingIdFilter;

  return (
    <>
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/50"
            />
          </div>
          <Button
            variant={missingIdFilter ? "default" : "outline"}
            size="sm"
            onClick={() => setMissingIdFilter(!missingIdFilter)}
            className={cn("border-border/50", missingIdFilter && "bg-primary")}
          >
            <Filter className="h-4 w-4 mr-1" />
            No ID
          </Button>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            className="border-border/50"
            onClick={() => refresh()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />Refresh
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="border-border/50"
            onClick={() => {
              if (members.length === 0) {
                toast.error('No members to export');
                return;
              }
              exportToCSV(flattenMemberData(members), `${tabType}-members`, [
                { key: 'name', header: 'Name' },
                { key: 'email', header: 'Email' },
                { key: 'phone', header: 'Phone' },
                { key: 'plan_type', header: 'Plan' },
                { key: 'status', header: 'Status' },
                { key: 'expiry_date', header: 'Expiry Date' },
              ]);
              toast.success(`${tabType.charAt(0).toUpperCase() + tabType.slice(1)} members exported to CSV`);
            }}
          >
            <Download className="h-4 w-4 mr-1" />Export
          </Button>
        </div>
      </div>

      {/* Member List */}
      {isEmpty ? (
        tabType === 'active' ? (
          <MemberEmptyState
            onAddMember={() => {}}
            onImportExcel={() => {}}
            onInviteMembers={() => {}}
          />
        ) : (
          <Card className="ios-card border-border/50">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {tabType === 'expired' ? 'No expired members' : 'No staff members'}
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        <Card className="ios-card border-border/50 overflow-hidden">
          <CardContent className="pt-4 overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={members.length > 0 && members.every(m => selectedMembers.has(m.id))}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <SortableTableHead sortKey="profiles.member_id" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Member ID</SortableTableHead>
                  <SortableTableHead sortKey="profiles.name" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Name</SortableTableHead>
                  <SortableTableHead sortKey="profiles.email" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Email</SortableTableHead>
                  <SortableTableHead sortKey="profiles.phone_number" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Phone</SortableTableHead>
                  <SortableTableHead sortKey="user_role" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Role</SortableTableHead>
                  <SortableTableHead sortKey="status" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Status</SortableTableHead>
                  <SortableTableHead sortKey="plan_type" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Plan</SortableTableHead>
                  <SortableTableHead sortKey="profiles.created_at" currentSortKey={sortKey} currentSortDirection={sortDirection} onSort={handleSort}>Joined</SortableTableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">
                    {debouncedSearch || missingIdFilter ? 'No matching members' : `No ${tabType} members`}
                  </TableCell></TableRow>
                ) : members.map((m) => {
                  const thumbnailUrl = getAvatarThumbnail(m.profiles?.avatar_url, 50);
                  
                  return (
                    <TableRow 
                      key={m.id} 
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedMembers.has(m.id) && "bg-primary/5",
                        tabType === 'active' && "hover:bg-green-500/5",
                        tabType === 'expired' && "hover:bg-red-500/5",
                        tabType === 'staff' && "hover:bg-purple-500/5"
                      )}
                      onClick={() => {
                        setSelectedProfileMember(m);
                        setProfileDialogOpen(true);
                      }}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedMembers.has(m.id)}
                          onCheckedChange={() => toggleMemberSelection(m.id)}
                          aria-label={`Select ${m.profiles?.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-primary text-xs">{m.profiles?.member_id || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {thumbnailUrl ? (
                            <img 
                              src={thumbnailUrl} 
                              alt={m.profiles?.name || 'Photo'} 
                              className="h-8 w-8 rounded-full object-cover border border-border"
                              loading="lazy"
                            />
                          ) : (
                            <span title="No photo uploaded" className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-amber-500">
                              <ImageOff className="h-4 w-4" />
                            </span>
                          )}
                          <span>{m.profiles?.name || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.profiles?.email || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.profiles?.phone_number || '-'}</TableCell>
                      <TableCell>{getRoleBadge(m.user_role)}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === 'active' ? 'default' : 'destructive'}>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{m.plan_type}{m.plan_type === 'Staff' && <span className="text-xs text-muted-foreground ml-1">(No Expiry)</span>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.profiles?.created_at 
                          ? new Date(m.profiles.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProfileMember(m);
                              setProfileDialogOpen(true);
                            }}
                            title="View profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRenewDialog(m);
                            }}
                            title="Renew membership"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMemberToDelete(m);
                              setDeleteConfirmOpen(true);
                            }}
                            title="Delete member"
                            disabled={deletingMemberId === m.user_id}
                          >
                            {deletingMemberId === m.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, totalCount)} of {totalCount} members
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setPage(Math.max(1, page - 1))}
                        className={cn(page === 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map((p, i) => (
                      <PaginationItem key={i}>
                        {p === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => setPage(p)}
                            isActive={page === p}
                          >
                            {p}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        className={cn(page === totalPages && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Member Profile Dialog */}
      <MemberProfileDialog
        member={selectedProfileMember}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        onUpdate={() => {
          // Ensure any profile changes (email/phone/name/etc.) immediately reflect in the table
          refresh();
        }}
        onMemberIdGenerated={(userId, newMemberId) => {
          if (selectedProfileMember?.user_id === userId) {
            setSelectedProfileMember(prev => prev ? {
              ...prev,
              profiles: { ...prev.profiles, member_id: newMemberId }
            } : null);
          }
          refresh();
        }}
      />

      {/* Delete Member Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirm Delete
            </DialogTitle>
          </DialogHeader>
          {memberToDelete && (
            <div className="py-4 space-y-2">
              <p>Are you sure you want to delete this member?</p>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{memberToDelete.profiles?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">{memberToDelete.profiles?.email}</p>
              </div>
              <p className="text-sm text-destructive">This action cannot be undone.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={!!deletingMemberId}>
              {deletingMemberId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Membership Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Renew Membership
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="font-medium">{selectedMember.profiles?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">{selectedMember.profiles?.email}</p>
                <p className="text-sm">
                  Current expiry: <strong>{selectedMember.expiry_date || 'Not set'}</strong>
                </p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Extend by (days)</p>
                <div className="flex gap-2 flex-wrap">
                  {[7, 14, 30, 60, 90].map(days => (
                    <Button
                      key={days}
                      type="button"
                      variant={renewDays === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRenewDays(days)}
                    >
                      {days}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenewMembership} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Extend {renewDays} Days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete {selectedMembers.size} Members?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedMembers.size} selected member(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</>
              ) : (
                <>Delete {selectedMembers.size} Members</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating Bulk Delete Button */}
      {selectedMembers.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <Button 
            variant="destructive" 
            size="lg"
            onClick={() => setBulkDeleteOpen(true)}
            className="shadow-lg shadow-destructive/30"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedMembers.size} Selected)
          </Button>
        </div>
      )}
    </>
  );
}
