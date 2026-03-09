import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ClassItem {
  id: string;
  name: string;
  start_time: string;
  instructor_id: string | null;
  instructor_name?: string;
  capacity: number;
  enrolled_count: number;
}

export function TodaysClassesWidget() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    start_time: '',
    capacity: 0,
  });

  const fetchTodaysClasses = async () => {
    const today = new Date().getDay();
    
    const { data, error } = await supabase
      .from('gym_classes')
      .select(`
        id,
        name,
        start_time,
        capacity,
        instructor_id,
        day_of_week
      `)
      .eq('day_of_week', today)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching classes:', error);
      return;
    }

    // Get enrollment counts for each class
    const classesWithEnrollment = await Promise.all(
      (data || []).map(async (cls) => {
        const { count } = await supabase
          .from('class_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .eq('status', 'enrolled');

        // Get instructor name if exists
        let instructorName = 'TBA';
        if (cls.instructor_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', cls.instructor_id)
            .maybeSingle();
          instructorName = profile?.name || 'TBA';
        }

        return {
          ...cls,
          enrolled_count: count || 0,
          instructor_name: instructorName,
        };
      })
    );

    setClasses(classesWithEnrollment);
    setLoading(false);
  };

  useEffect(() => {
    fetchTodaysClasses();
  }, []);

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setEditForm({
      name: cls.name,
      start_time: cls.start_time,
      capacity: cls.capacity,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingClass) return;

    const { error } = await supabase
      .from('gym_classes')
      .update({
        name: editForm.name,
        start_time: editForm.start_time,
        capacity: editForm.capacity,
      })
      .eq('id', editingClass.id);

    if (error) {
      toast.error('Failed to update class');
      return;
    }

    toast.success('Class updated successfully');
    setEditingClass(null);
    fetchTodaysClasses();
  };

  const handleDelete = async () => {
    if (!deleteClassId) return;

    const { error } = await supabase
      .from('gym_classes')
      .delete()
      .eq('id', deleteClassId);

    if (error) {
      toast.error('Failed to delete class');
      return;
    }

    toast.success('Class deleted successfully');
    setDeleteClassId(null);
    fetchTodaysClasses();
  };

  return (
    <>
      <Card className="bg-card border-border/30">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Today's Classes
          </CardTitle>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
            {classes.length} scheduled
          </Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : classes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No classes scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/20 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-10 rounded-full bg-primary" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTime(cls.start_time)} • {cls.instructor_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-border/30">
                      {cls.enrolled_count}/{cls.capacity}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleEdit(cls)}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDeleteClassId(cls.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingClass} onOpenChange={() => setEditingClass(null)}>
        <DialogContent className="bg-card border-border/30">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Class Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-background border-border/30"
              />
            </div>
            <div>
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={editForm.start_time}
                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                className="bg-background border-border/30"
              />
            </div>
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={editForm.capacity}
                onChange={(e) => setEditForm({ ...editForm, capacity: parseInt(e.target.value) || 0 })}
                className="bg-background border-border/30"
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteClassId} onOpenChange={() => setDeleteClassId(null)}>
        <AlertDialogContent className="bg-card border-border/30">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this class? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/30">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
