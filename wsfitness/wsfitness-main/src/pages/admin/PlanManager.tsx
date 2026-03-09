import { useState, useEffect } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Package, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Tags } from 'lucide-react';
import { useAccessLevels, useAccessLevelMutations, type AccessLevel } from '@/hooks/useAccessLevels';

interface MembershipPlan {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_months: number;
  duration_days: number;
  sessions: number | null;
  access_level: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const defaultFormData = {
  title: '',
  description: '',
  price: 0,
  duration_months: 0,
  duration_days: 0,
  sessions: null as number | null,
  access_level: 'all_access',
  is_active: true,
  display_order: 0,
};

export default function PlanManager() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<MembershipPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(defaultFormData);

  // Access level management
  const { data: accessLevels = [], isLoading: loadingLevels } = useAccessLevels();
  const { createLevel, updateLevel, deleteLevel } = useAccessLevelMutations();
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AccessLevel | null>(null);
  const [deleteLevelDialogOpen, setDeleteLevelDialogOpen] = useState(false);
  const [levelToDelete, setLevelToDelete] = useState<AccessLevel | null>(null);
  const [levelForm, setLevelForm] = useState({ key: '', label: '', emoji: '', color: 'slate', display_order: 0 });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      ...defaultFormData,
      display_order: plans.length,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData({
      title: plan.title,
      description: plan.description || '',
      price: plan.price,
      duration_months: plan.duration_months,
      duration_days: plan.duration_days || 0,
      sessions: plan.sessions,
      access_level: plan.access_level,
      is_active: plan.is_active,
      display_order: plan.display_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      if (editingPlan) {
        const { error } = await supabase
          .from('membership_plans')
          .update({
            title: formData.title,
            description: formData.description || null,
            price: formData.price,
            duration_months: formData.duration_months,
            duration_days: formData.duration_days,
            sessions: formData.sessions,
            access_level: formData.access_level,
            is_active: formData.is_active,
            display_order: formData.display_order,
          })
          .eq('id', editingPlan.id);

        if (error) throw error;
        toast.success('Plan updated successfully');
      } else {
        const { error } = await supabase
          .from('membership_plans')
          .insert({
            title: formData.title,
            description: formData.description || null,
            price: formData.price,
            duration_months: formData.duration_months,
            duration_days: formData.duration_days,
            sessions: formData.sessions,
            access_level: formData.access_level,
            is_active: formData.is_active,
            display_order: formData.display_order,
          });

        if (error) throw error;
        toast.success('Plan created successfully');
      }

      setDialogOpen(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: MembershipPlan) => {
    try {
      const { error } = await supabase
        .from('membership_plans')
        .update({ is_active: !plan.is_active })
        .eq('id', plan.id);

      if (error) throw error;
      toast.success(plan.is_active ? 'Plan hidden' : 'Plan activated');
      fetchPlans();
    } catch (error) {
      console.error('Error toggling plan:', error);
      toast.error('Failed to update plan');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;

    try {
      const { error } = await supabase
        .from('membership_plans')
        .delete()
        .eq('id', planToDelete.id);

      if (error) throw error;
      toast.success('Plan deleted');
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const formatPrice = (price: number) => `RM ${Number(price).toFixed(2)}`;

  const getDurationLabel = (months: number, days: number = 0) => {
    const parts: string[] = [];
    if (months > 0) {
      parts.push(months === 1 ? '1 Month' : months === 12 ? '1 Year' : `${months} Months`);
    }
    if (days > 0) {
      parts.push(days === 1 ? '1 Day' : `${days} Days`);
    }
    return parts.length > 0 ? parts.join(' + ') : '0 Days';
  };

  const getAccessLabel = (key: string) => {
    const level = accessLevels.find(l => l.key === key);
    return level ? `${level.emoji} ${level.label}` : key.replace('_', ' ');
  };

  return (
    <GymLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Plan Manager</h1>
              <p className="text-muted-foreground text-sm">Create and manage membership packages</p>
            </div>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>

        <Card className="bg-card border-border/30">
          <CardContent className="p-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading plans...</div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Package className="h-16 w-16 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold">No Plans Yet</h3>
                  <p className="text-muted-foreground">Create your first membership plan to get started.</p>
                </div>
                <Button onClick={handleOpenCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create First Plan
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20">
                    <TableHead className="w-[40px]">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {plans.map((plan) => (
                    <TableRow 
                      key={plan.id} 
                      className={`border-border/20 ${!plan.is_active ? 'opacity-50 bg-muted/30' : ''}`}
                    >
                      <TableCell className="text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{plan.title}</div>
                            {plan.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {plan.description.split('\n')[0]}
                              </div>
                            )}
                          </div>
                          {!plan.is_active && (
                            <Badge variant="outline" className="text-xs opacity-70">
                              Hidden
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatPrice(plan.price)}
                      </TableCell>
                      <TableCell>{getDurationLabel(plan.duration_months, plan.duration_days)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {plan.sessions != null ? plan.sessions : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {getAccessLabel(plan.access_level)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {plan.is_active ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            <Eye className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="opacity-60">
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hidden
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(plan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleActive(plan)}
                          >
                            {plan.is_active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setPlanToDelete(plan);
                              setDeleteDialogOpen(true);
                            }}
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

        {/* Access Level Management */}
        <Card className="bg-card border-border/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Tags className="h-5 w-5 text-primary" />
                  Access Levels (Categories)
                </CardTitle>
                <CardDescription>Manage plan categories that appear across the platform</CardDescription>
              </div>
              <Button size="sm" onClick={() => {
                setEditingLevel(null);
                setLevelForm({ key: '', label: '', emoji: '', color: 'slate', display_order: accessLevels.length });
                setLevelDialogOpen(true);
              }} className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Add Level
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLevels ? (
              <p className="text-muted-foreground text-sm py-4 text-center">Loading...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20">
                    <TableHead>#</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Emoji</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Plans</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessLevels.map(level => {
                    const planCount = plans.filter(p => p.access_level === level.key).length;
                    return (
                      <TableRow key={level.id} className="border-border/20">
                        <TableCell className="text-muted-foreground text-sm">{level.display_order}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{level.key}</code></TableCell>
                        <TableCell className="font-medium">{level.label}</TableCell>
                        <TableCell>{level.emoji}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{level.color}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{planCount}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => {
                              setEditingLevel(level);
                              setLevelForm({ key: level.key, label: level.label, emoji: level.emoji, color: level.color, display_order: level.display_order });
                              setLevelDialogOpen(true);
                            }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"
                              onClick={() => { setLevelToDelete(level); setDeleteLevelDialogOpen(true); }}
                              disabled={planCount > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Plan Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>
              {editingPlan 
                ? 'Update the plan details below.' 
                : 'Fill in the details to create a new membership plan.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Special Offer / 特惠活动"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Multi-line, emojis supported)</Label>
              <Textarea
                id="description"
                placeholder={"Enter your marketing copy here...\n\n✨ Benefits:\n• Unlimited gym access\n• Free locker rental\n• 会员专属优惠"}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                className="resize-y font-sans"
              />
              <p className="text-xs text-muted-foreground">
                Tip: Line breaks and emojis will be preserved exactly as you type them.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (RM)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="duration_months" className="text-xs text-muted-foreground">Months</Label>
                  <Input
                    id="duration_months"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.duration_months}
                    onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="duration_days" className="text-xs text-muted-foreground">Days</Label>
                  <Input
                    id="duration_days"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                e.g., 1 Month + 14 Days. Expiry = Start Date + (Months × 30) + Days
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessions">Sessions (for session-based plans)</Label>
              <Input
                id="sessions"
                type="number"
                min="0"
                placeholder="Leave empty for non-session plans"
                value={formData.sessions ?? ''}
                onChange={(e) => setFormData({ ...formData, sessions: e.target.value ? parseInt(e.target.value) : null })}
              />
              <p className="text-xs text-muted-foreground">
                Set the number of sessions for Coach Training, Studio Classes, etc. Leave empty for time-based memberships.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_level">Access Level</Label>
              <Select
                value={formData.access_level}
                onValueChange={(value) => setFormData({ ...formData, access_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accessLevels.filter(l => l.is_active).map(level => (
                    <SelectItem key={level.key} value={level.key}>
                      {level.emoji} {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_order">Display Order</Label>
              <Input
                id="display_order"
                type="number"
                min="0"
                placeholder="0"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first. Plans with the same order appear by creation date.
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Only active plans are shown to members
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Plan Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{planToDelete?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Level Create/Edit Dialog */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingLevel ? 'Edit Access Level' : 'New Access Level'}</DialogTitle>
            <DialogDescription>This category will appear in plan selectors across the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Key (unique identifier)</Label>
              <Input
                placeholder="e.g. premium_access"
                value={levelForm.key}
                onChange={(e) => setLevelForm({ ...levelForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })}
                disabled={!!editingLevel}
              />
              <p className="text-xs text-muted-foreground">Lowercase, underscores only. Cannot be changed later.</p>
            </div>
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                placeholder="e.g. PREMIUM ACCESS"
                value={levelForm.label}
                onChange={(e) => setLevelForm({ ...levelForm, label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Emoji</Label>
                <Input
                  placeholder="e.g. 🏆"
                  value={levelForm.emoji}
                  onChange={(e) => setLevelForm({ ...levelForm, emoji: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <Select value={levelForm.color} onValueChange={(v) => setLevelForm({ ...levelForm, color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['amber', 'emerald', 'red', 'purple', 'blue', 'cyan', 'orange', 'pink', 'slate', 'violet', 'teal', 'indigo'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Display Order</Label>
              <Input
                type="number"
                min="0"
                value={levelForm.display_order}
                onChange={(e) => setLevelForm({ ...levelForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (!levelForm.key || !levelForm.label) {
                toast.error('Key and label are required');
                return;
              }
              if (editingLevel) {
                updateLevel.mutate({ id: editingLevel.id, label: levelForm.label, emoji: levelForm.emoji, color: levelForm.color, display_order: levelForm.display_order });
              } else {
                createLevel.mutate(levelForm);
              }
              setLevelDialogOpen(false);
            }}>
              {editingLevel ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Access Level Dialog */}
      <Dialog open={deleteLevelDialogOpen} onOpenChange={setDeleteLevelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Access Level</DialogTitle>
            <DialogDescription>
              Delete &quot;{levelToDelete?.label}&quot;? Plans using this level should be reassigned first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteLevelDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (levelToDelete) {
                deleteLevel.mutate(levelToDelete.id);
                setDeleteLevelDialogOpen(false);
                setLevelToDelete(null);
              }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GymLayout>
  );
}
