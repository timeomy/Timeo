import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Search, User, Shield, Crown, Edit2, UserX, UserMinus, KeyRound, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';

type AppRole = 'admin' | 'coach' | 'it_admin' | 'member' | 'vendor' | 'staff';

interface UserWithRole {
  id: string;
  name: string;
  email?: string;
  role: AppRole | null;
}

const userSchema = z.object({
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  name: z.string().min(2, 'Name is required').max(100),
  role: z.enum(['admin', 'coach', 'it_admin', 'member', 'vendor', 'staff']),
});

export default function Users() {
  const { role: currentUserRole, isItAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCredentialsDialogOpen, setEditCredentialsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [credentialsForm, setCredentialsForm] = useState({ email: '', password: '' });
  const [newRole, setNewRole] = useState<AppRole>('coach');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'coach' as AppRole,
    requireEmailConfirmation: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdminOrIT = currentUserRole === 'admin' || currentUserRole === 'it_admin';
  const canManageItAdmin = currentUserRole === 'it_admin';

  useEffect(() => {
    if (isAdminOrIT) {
      fetchUsers();
    }
  }, [currentUserRole]);

  const fetchUsers = async () => {
    try {
      // Fetch profiles with email
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles?.map(profile => {
        // Get all roles for this user
        const userRoles = roles?.filter(r => r.user_id === profile.id).map(r => r.role) || [];
        // Prioritize it_admin > admin > coach > staff > vendor > member
        let primaryRole: AppRole | null = null;
        if (userRoles.includes('it_admin')) {
          primaryRole = 'it_admin';
        } else if (userRoles.includes('admin')) {
          primaryRole = 'admin';
        } else if (userRoles.includes('coach')) {
          primaryRole = 'coach';
        } else if (userRoles.includes('staff')) {
          primaryRole = 'staff';
        } else if (userRoles.includes('vendor')) {
          primaryRole = 'vendor';
        } else if (userRoles.includes('member')) {
          primaryRole = 'member';
        }
        return {
          id: profile.id,
          name: profile.name,
          email: profile.email || undefined,
          role: primaryRole,
        };
      }) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only IT Admin can create IT Admin users
    if (formData.role === 'it_admin' && !canManageItAdmin) {
      toast.error('Only IT Admins can create IT Admin users');
      return;
    }

    const result = userSchema.safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current session token
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        toast.error('You must be logged in');
        return;
      }

      // Call edge function to create user (prevents auto-login issue)
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          requireEmailConfirmation: formData.requireEmailConfirmation,
          plan_type: formData.role === 'member' ? 'Monthly' : null, // Default plan for members
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create user');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('User created successfully');
      setDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
        toast.error('This email is already registered');
      } else {
        toast.error(error.message || 'Failed to create user');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditRole = (user: UserWithRole) => {
    // Admin cannot edit IT Admin roles
    if (user.role === 'it_admin' && !canManageItAdmin) {
      toast.error('Only IT Admins can modify IT Admin roles');
      return;
    }
    setSelectedUser(user);
    setNewRole(user.role || 'coach');
    setEditDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    // Only IT Admin can assign/modify IT Admin role
    if ((newRole === 'it_admin' || selectedUser.role === 'it_admin') && !canManageItAdmin) {
      toast.error('Only IT Admins can manage IT Admin roles');
      return;
    }

    setIsSubmitting(true);

    try {
      const oldRole = selectedUser.role;

      if (selectedUser.role) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', selectedUser.id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: selectedUser.id, role: newRole });

        if (error) throw error;
      }

      // Get current user's name for audit
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', currentUser?.id || '')
        .maybeSingle();

      // Log the action
      await supabase.from('audit_logs').insert({
        action_type: 'role_updated',
        actor_id: currentUser?.id || '',
        actor_name: actorProfile?.name || 'Unknown',
        target_user_id: selectedUser.id,
        target_user_name: selectedUser.name,
        details: { old_role: oldRole, new_role: newRole },
      });

      toast.success('Role updated successfully');
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (userId: string, userRole: AppRole | null, userName: string) => {
    // Admin cannot delete IT Admin roles
    if (userRole === 'it_admin' && !canManageItAdmin) {
      toast.error('Only IT Admins can remove IT Admin roles');
      return;
    }

    if (!confirm('Are you sure you want to remove this user\'s role?')) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      // Get current user's name for audit
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', currentUser?.id || '')
        .maybeSingle();

      // Log the action
      await supabase.from('audit_logs').insert({
        action_type: 'role_removed',
        actor_id: currentUser?.id || '',
        actor_name: actorProfile?.name || 'Unknown',
        target_user_id: userId,
        target_user_name: userName,
        details: { old_role: userRole },
      });

      toast.success('Role removed');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove role');
    }
  };

  const openEditCredentialsDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setCredentialsForm({ email: user.email || '', password: '' });
    setEditCredentialsDialogOpen(true);
  };

  const handleUpdateCredentials = async () => {
    if (!selectedUser) return;

    const nextEmail = credentialsForm.email.trim();
    const hasEmail = !!nextEmail && nextEmail !== (selectedUser.email || '');
    const hasPassword = credentialsForm.password.trim().length > 0;

    if (!hasEmail && !hasPassword) {
      toast.error('No changes to save');
      return;
    }

    if (hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(nextEmail)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    if (hasPassword && credentialsForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // Be explicit about the access token to avoid any "missing Authorization" situations
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (sessionError || !accessToken) {
      toast.error('Session expired. Please log in again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const body: { userId: string; email?: string; password?: string } = {
        userId: selectedUser.id,
      };

      if (hasEmail) {
        body.email = nextEmail;
      }
      if (hasPassword) {
        body.password = credentialsForm.password;
      }

      const response = await supabase.functions.invoke('update-user', {
        body,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Handle function invocation errors (non-2xx responses)
      if (response.error) {
        const ctx = (response.error as any)?.context;
        const ctxBody = ctx?.body;
        let parsed: any = null;
        try {
          parsed = typeof ctxBody === 'string' ? JSON.parse(ctxBody) : ctxBody;
        } catch {
          parsed = null;
        }

        const msg = parsed?.error || response.error.message || 'Failed to update user';

        if (parsed?.code === 'DUPLICATE_EMAIL') throw new Error(msg);
        if (ctx?.status === 401) throw new Error('Session expired. Please log in again.');
        if (ctx?.status === 403) throw new Error('Permission denied. Admin access required.');

        throw new Error(msg);
      }

      if (response.data?.error) {
        const errorMessage = response.data.error as string;
        const errorCode = response.data.code as string | undefined;

        if (errorCode === 'DUPLICATE_EMAIL') {
          throw new Error(errorMessage);
        }
        if (errorMessage.includes('Access denied')) {
          throw new Error('Permission denied. Admin access required.');
        }
        if (errorMessage.includes('Unauthorized') || errorMessage.includes('Missing authorization')) {
          throw new Error('Session expired. Please log in again.');
        }

        throw new Error(errorMessage);
      }

      toast.success('User credentials updated');
      setEditCredentialsDialogOpen(false);
      setSelectedUser(null);
      setCredentialsForm({ email: '', password: '' });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: selectedUser.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete user');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (user: UserWithRole) => {
    if (currentUser?.id && user.id === currentUser.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    // Admin cannot delete IT Admin users
    if (user.role === 'it_admin' && !canManageItAdmin) {
      toast.error('Only IT Admins can delete IT Admin users');
      return;
    }
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'coach',
      requireEmailConfirmation: false,
    });
  };

  const getRoleIcon = (role: AppRole | null) => {
    switch (role) {
      case 'it_admin':
        return <Crown className="h-5 w-5 text-amber-500" />;
      case 'admin':
        return <Shield className="h-5 w-5 text-primary" />;
      default:
        return <User className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRoleBadgeVariant = (role: AppRole | null) => {
    switch (role) {
      case 'it_admin':
        return 'destructive' as const;
      case 'admin':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  const filteredUsers = users
    .filter(u => {
      return u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()));
    })
    .sort((a, b) => {
      // Role priority: it_admin > admin > coach > staff > vendor > member > no role
      const rolePriority: Record<AppRole, number> = { it_admin: 0, admin: 1, coach: 2, staff: 3, vendor: 4, member: 5 };
      const priorityA = a.role ? (rolePriority[a.role] ?? 5) : 5;
      const priorityB = b.role ? (rolePriority[b.role] ?? 5) : 5;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // Alphabetically within same role
      return a.name.localeCompare(b.name);
    });
  
  // Helper to check if a user is protected (IT Admin viewed by non-IT Admin)
  const isProtectedUser = (user: UserWithRole) => {
    return user.role === 'it_admin' && !canManageItAdmin;
  };

  if (!isAdminOrIT) {
    return (
      <AppLayout title="USERS">
        <Card className="glass">
          <CardContent className="py-12 text-center text-muted-foreground">
            Access denied. Admin only.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="USERS">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="icon" className="shrink-0">
                <Plus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display text-xl">Add User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Leave blank to auto-generate"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to auto-generate (e.g., name@wsfitness.my)</p>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank for default"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for default (123456)</p>
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v: AppRole) => setFormData({ ...formData, role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {canManageItAdmin && <SelectItem value="it_admin">IT Admin</SelectItem>}
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="email-confirm">Require Email Confirmation</Label>
                    <p className="text-xs text-muted-foreground">
                      User must verify email before logging in
                    </p>
                  </div>
                  <Switch
                    id="email-confirm"
                    checked={formData.requireEmailConfirmation}
                    onCheckedChange={(checked) => setFormData({ ...formData, requireEmailConfirmation: checked })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Edit Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Changing role for: <strong>{selectedUser?.name}</strong>
              </p>
              <div className="space-y-2">
                <Label>New Role</Label>
                <Select
                  value={newRole}
                  onValueChange={(v: AppRole) => setNewRole(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {canManageItAdmin && <SelectItem value="it_admin">IT Admin</SelectItem>}
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleUpdateRole} disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Role'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog - IT Admin only */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-destructive">Delete User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to permanently delete <strong>{selectedUser?.name}</strong>?
              </p>
              <p className="text-sm text-destructive">
                This action cannot be undone. All user data will be removed.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleDeleteUser} disabled={isSubmitting}>
                  {isSubmitting ? 'Deleting...' : 'Delete User'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Credentials Dialog - IT Admin only */}
        <Dialog open={editCredentialsDialogOpen} onOpenChange={setEditCredentialsDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Edit Credentials
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Editing: <strong>{selectedUser?.name}</strong>
              </p>
              <div className="space-y-2">
                <Label>Login Email</Label>
                <Input
                  type="email"
                  value={credentialsForm.email}
                  onChange={(e) => setCredentialsForm({ ...credentialsForm, email: e.target.value })}
                  placeholder="user@example.com"
                />
                <p className="text-xs text-muted-foreground">Leave unchanged to keep current email</p>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={credentialsForm.password}
                  onChange={(e) => setCredentialsForm({ ...credentialsForm, password: e.target.value })}
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground">Leave blank to keep current password</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditCredentialsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleUpdateCredentials} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Users List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card className="glass">
              <CardContent className="py-12 text-center text-muted-foreground">
                {search ? 'No users found' : 'No users yet'}
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user, index) => (
              <Card
                key={user.id}
                className={`glass neon-border animate-slide-up ${isProtectedUser(user) ? 'border-amber-500/30' : ''}`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${isProtectedUser(user) ? 'bg-amber-500/20' : 'bg-muted'}`}>
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{user.name}</h3>
                        {user.email && (
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role?.replace('_', ' ').toUpperCase() || 'No Role'}
                          </Badge>
                          {isProtectedUser(user) && (
                            <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                              <Lock className="h-3 w-3 mr-1" />
                              Protected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isProtectedUser(user) ? (
                        <span className="text-xs text-amber-500/70 italic">No actions available</span>
                      ) : (
                        <>
                          {/* Edit credentials - IT Admin can edit all including self */}
                          {canManageItAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Edit email/password"
                              onClick={() => openEditCredentialsDialog(user)}
                            >
                              <KeyRound className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          {/* Edit role button - IT Admin can edit all, Admin can edit non-IT roles */}
                          {(canManageItAdmin || (currentUserRole === 'admin' && user.role !== 'it_admin')) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Edit role"
                              onClick={() => handleEditRole(user)}
                            >
                              <Edit2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          {/* Remove role button - only show if user has role and can be removed */}
                          {user.role && (canManageItAdmin || (currentUserRole === 'admin' && user.role !== 'it_admin')) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Remove role"
                              onClick={() => handleDeleteRole(user.id, user.role, user.name)}
                            >
                              <UserMinus className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          {canManageItAdmin && (!currentUser?.id || currentUser.id !== user.id) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Delete user"
                              onClick={() => openDeleteDialog(user)}
                            >
                              <UserX className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
