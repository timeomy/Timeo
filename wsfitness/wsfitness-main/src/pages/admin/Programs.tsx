import { useState, useEffect } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dumbbell, Plus, Pencil, Trash2, Loader2, Search, Filter, Calendar, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Program {
  id: string;
  name: string;
  description: string | null;
  duration_weeks: number;
  sessions_per_week: number;
  level: string;
  is_active: boolean;
  created_at: string;
}

export default function Programs() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_weeks: 8,
    sessions_per_week: 3,
    level: 'beginner',
    is_active: true,
  });

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_weeks: 8,
      sessions_per_week: 3,
      level: 'beginner',
      is_active: true,
    });
    setEditingProgram(null);
  };

  const handleOpenDialog = (program?: Program) => {
    if (program) {
      setEditingProgram(program);
      setFormData({
        name: program.name,
        description: program.description || '',
        duration_weeks: program.duration_weeks,
        sessions_per_week: program.sessions_per_week,
        level: program.level,
        is_active: program.is_active,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a program name');
      return;
    }

    setSaving(true);
    try {
      if (editingProgram) {
        const { error } = await supabase
          .from('training_programs')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            duration_weeks: formData.duration_weeks,
            sessions_per_week: formData.sessions_per_week,
            level: formData.level,
            is_active: formData.is_active,
          })
          .eq('id', editingProgram.id);

        if (error) throw error;
        toast.success('Program updated successfully');
      } else {
        const { error } = await supabase
          .from('training_programs')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            duration_weeks: formData.duration_weeks,
            sessions_per_week: formData.sessions_per_week,
            level: formData.level,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Program created successfully');
      }

      setDialogOpen(false);
      resetForm();
      await fetchPrograms();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save program');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setProgramToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!programToDelete) return;

    try {
      const { error } = await supabase
        .from('training_programs')
        .delete()
        .eq('id', programToDelete);

      if (error) throw error;
      toast.success('Program deleted');
      await fetchPrograms();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete program');
    } finally {
      setDeleteDialogOpen(false);
      setProgramToDelete(null);
    }
  };

  const handleToggleActive = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from('training_programs')
        .update({ is_active: !currentValue })
        .eq('id', id);

      if (error) throw error;
      
      setPrograms(prev => prev.map(p => 
        p.id === id ? { ...p, is_active: !currentValue } : p
      ));
      toast.success(`Program ${!currentValue ? 'activated' : 'deactivated'}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const filteredPrograms = programs.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'beginner':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Beginner</Badge>;
      case 'intermediate':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Intermediate</Badge>;
      case 'advanced':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Advanced</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <GymLayout title="Programs" subtitle="Manage training programs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Dumbbell className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Training Programs</h1>
              <p className="text-muted-foreground text-sm">Create and manage training programs for memberships</p>
            </div>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Program
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border/30"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card border-border/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{programs.length}</div>
              <p className="text-muted-foreground text-sm">Total Programs</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-400">
                {programs.filter(p => p.is_active).length}
              </div>
              <p className="text-muted-foreground text-sm">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/30">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">
                {programs.filter(p => !p.is_active).length}
              </div>
              <p className="text-muted-foreground text-sm">Inactive</p>
            </CardContent>
          </Card>
        </div>

        {/* Programs Table */}
        <Card className="bg-card border-border/30">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchTerm ? 'No programs match your search.' : 'No programs found. Click "Add Program" to create one.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20">
                    <TableHead>Program</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Sessions/Week</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrograms.map((program) => (
                    <TableRow key={program.id} className="border-border/20">
                      <TableCell>
                        <div>
                          <p className="font-medium">{program.name}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {program.description || 'No description'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getLevelBadge(program.level)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {program.duration_weeks} weeks
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {program.sessions_per_week}x/week
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={program.is_active}
                          onCheckedChange={() => handleToggleActive(program.id, program.is_active)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(program)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(program.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border/30 max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProgram ? 'Edit Program' : 'Create New Program'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Program Name *</Label>
              <Input
                placeholder="e.g., Beginner Strength"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-background border-border/30"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the program..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-background border-border/30 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (weeks)</Label>
                <Input
                  type="number"
                  value={formData.duration_weeks}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) || 1 }))}
                  className="bg-background border-border/30"
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Sessions per Week</Label>
                <Input
                  type="number"
                  value={formData.sessions_per_week}
                  onChange={(e) => setFormData(prev => ({ ...prev, sessions_per_week: parseInt(e.target.value) || 1 }))}
                  className="bg-background border-border/30"
                  min={1}
                  max={7}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Difficulty Level</Label>
              <Select
                value={formData.level}
                onValueChange={(v) => setFormData(prev => ({ ...prev, level: v }))}
              >
                <SelectTrigger className="bg-background border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Make this program available</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProgram ? 'Update' : 'Create'} Program
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this program? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GymLayout>
  );
}
