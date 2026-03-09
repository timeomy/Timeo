import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, X, Dumbbell, Check, Video, ExternalLink, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Exercise {
  id: string;
  training_type: string;
  name: string;
  equipment: string;
  is_custom: boolean;
  video_url: string | null;
}

interface SelectedExercise {
  id: string;
  name: string;
  equipment: string;
  training_type: string;
  video_url?: string | null;
}

interface ExerciseSelectorProps {
  selectedTrainingTypes: string[];
  selectedExercises: SelectedExercise[];
  onExercisesChange: (exercises: SelectedExercise[]) => void;
}

export function ExerciseSelector({ 
  selectedTrainingTypes, 
  selectedExercises, 
  onExercisesChange 
}: ExerciseSelectorProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customExercise, setCustomExercise] = useState({ name: '', equipment: 'Machine', training_type: '', video_url: '' });
  
  // Edit mode state
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', equipment: 'Machine', video_url: '' });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Use ref to track previous training types to prevent infinite loops
  const prevTypesRef = useRef<string>('');

  useEffect(() => {
    const typesKey = [...selectedTrainingTypes].sort().join(',');
    
    // Only fetch if training types actually changed
    if (typesKey !== prevTypesRef.current) {
      prevTypesRef.current = typesKey;
      
      if (selectedTrainingTypes.length > 0) {
        fetchExercises();
      } else {
        setExercises([]);
      }
    }
  }, [selectedTrainingTypes]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .in('training_type', selectedTrainingTypes)
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExercise = (exercise: Exercise) => {
    const isSelected = selectedExercises.some(e => e.id === exercise.id);
    if (isSelected) {
      onExercisesChange(selectedExercises.filter(e => e.id !== exercise.id));
    } else {
      onExercisesChange([...selectedExercises, {
        id: exercise.id,
        name: exercise.name,
        equipment: exercise.equipment,
        training_type: exercise.training_type,
        video_url: exercise.video_url
      }]);
    }
  };

  const addCustomExercise = async () => {
    if (!customExercise.name.trim()) {
      toast.error('Please enter exercise name');
      return;
    }
    if (!customExercise.training_type) {
      toast.error('Please select a training type for the custom exercise');
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          training_type: customExercise.training_type,
          name: customExercise.name,
          equipment: customExercise.equipment,
          is_custom: true,
          created_by: userData.user.id,
          video_url: customExercise.video_url.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      setExercises([...exercises, data]);
      onExercisesChange([...selectedExercises, {
        id: data.id,
        name: data.name,
        equipment: data.equipment,
        training_type: data.training_type,
        video_url: data.video_url
      }]);
      
      setCustomExercise({ name: '', equipment: 'Machine', training_type: '', video_url: '' });
      setShowAddCustom(false);
      toast.success('Custom exercise added');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add custom exercise');
    }
  };


  // Validate and normalize video URL - ensure it starts with https://
  const normalizeVideoUrl = (url: string): string | null => {
    if (!url || !url.trim()) return null;
    let normalizedUrl = url.trim();
    
    // If URL doesn't start with http:// or https://, prepend https://
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    
    // Convert http:// to https:// for security
    if (normalizedUrl.startsWith('http://')) {
      normalizedUrl = normalizedUrl.replace('http://', 'https://');
    }
    
    return normalizedUrl;
  };

  const saveExerciseChanges = async () => {
    if (!editingExercise) return;
    if (!editFormData.name.trim()) {
      toast.error('Exercise name is required');
      return;
    }

    // Validate video URL format if provided
    const videoUrl = normalizeVideoUrl(editFormData.video_url);

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('exercises')
        .update({
          name: editFormData.name.trim(),
          equipment: editFormData.equipment,
          video_url: videoUrl
        })
        .eq('id', editingExercise.id)
        .select()
        .single();

      if (error) throw error;

      // Update local exercises list
      setExercises(exercises.map(ex => 
        ex.id === editingExercise.id ? data : ex
      ));

      // Update selected exercises if this one was selected
      onExercisesChange(selectedExercises.map(ex => 
        ex.id === editingExercise.id 
          ? { ...ex, name: data.name, equipment: data.equipment, video_url: data.video_url }
          : ex
      ));

      toast.success('Exercise updated successfully');
      setEditModalOpen(false);
      setEditingExercise(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update exercise');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (exercise: Exercise, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExercise(exercise);
    setEditFormData({
      name: exercise.name,
      equipment: exercise.equipment,
      video_url: exercise.video_url || ''
    });
    setEditModalOpen(true);
  };

  // Group exercises by training type
  const groupedExercises = exercises.reduce((acc, ex) => {
    if (!acc[ex.training_type]) acc[ex.training_type] = [];
    acc[ex.training_type].push(ex);
    return acc;
  }, {} as Record<string, Exercise[]>);

  if (selectedTrainingTypes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-4 text-sm border border-dashed border-border/50 rounded-lg">
        Select a training type above to see exercises
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4" />
          Select Exercises
          {selectedExercises.length > 0 && (
            <Badge variant="secondary" className="ml-2">{selectedExercises.length} selected</Badge>
          )}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAddCustom(!showAddCustom)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Custom
        </Button>
      </div>

      {/* Custom exercise form */}
      {showAddCustom && (
        <div className="p-3 rounded-lg bg-muted/50 space-y-3 border border-border/50">
          <div className="text-xs font-medium text-muted-foreground">Add Custom Exercise</div>
          <Input
            placeholder="Exercise name"
            value={customExercise.name}
            onChange={(e) => setCustomExercise({ ...customExercise, name: e.target.value })}
          />
          <div className="flex gap-2">
            <select
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={customExercise.training_type}
              onChange={(e) => setCustomExercise({ ...customExercise, training_type: e.target.value })}
            >
              <option value="">Select Type</option>
              {selectedTrainingTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={customExercise.equipment}
              onChange={(e) => setCustomExercise({ ...customExercise, equipment: e.target.value })}
            >
              <option value="Machine">Machine</option>
              <option value="Dumbbell">Dumbbell</option>
              <option value="Barbell">Barbell</option>
              <option value="Bodyweight">Bodyweight</option>
              <option value="Cable">Cable</option>
              <option value="Kettlebell">Kettlebell</option>
            </select>
          </div>
          <Input
            placeholder="Video demo URL (optional - YouTube, Instagram, etc.)"
            value={customExercise.video_url}
            onChange={(e) => setCustomExercise({ ...customExercise, video_url: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={addCustomExercise} className="flex-1">Add Exercise</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddCustom(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Selected exercises display */}
      {selectedExercises.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-primary/10 border border-primary/20">
          {selectedExercises.map((ex) => (
            <Badge 
              key={ex.id} 
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-destructive/20 bg-primary/20 text-primary"
              onClick={() => onExercisesChange(selectedExercises.filter(e => e.id !== ex.id))}
            >
              {ex.video_url && <Video className="h-3 w-3" />}
              {ex.name}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Exercise list grouped by training type */}
      <ScrollArea className="h-64 rounded-lg border border-border/50">
        <div className="p-2 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading exercises...</div>
          ) : (
            Object.entries(groupedExercises).map(([type, exList]) => (
              <div key={type} className="space-y-2">
                <div className="sticky top-0 bg-background/95 backdrop-blur-sm py-1 px-2 -mx-2 z-10">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    {type}
                    <span className="text-muted-foreground font-normal">({exList.length} exercises)</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {exList.map((ex) => {
                    const isSelected = selectedExercises.some(e => e.id === ex.id);
                    return (
                      <button
                        type="button"
                        key={ex.id}
                        onClick={() => toggleExercise(ex)}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg text-left transition-all w-full group",
                          isSelected 
                            ? "bg-primary/15 border border-primary/40 shadow-sm" 
                            : "hover:bg-muted/50 border border-transparent"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                          isSelected 
                            ? "bg-primary border-primary" 
                            : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-medium text-sm truncate flex items-center gap-2",
                            isSelected && "text-primary"
                          )}>
                            {ex.name}
                            {ex.video_url && (
                              <a
                                href={normalizeVideoUrl(ex.video_url) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary/80 hover:bg-secondary text-secondary-foreground text-[10px] font-medium transition-colors"
                                title="Watch demo video"
                              >
                                <Video className="h-3 w-3" />
                                🎥 Demo
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{ex.equipment}</span>
                            {ex.is_custom && <Badge variant="outline" className="text-[9px] py-0 px-1">Custom</Badge>}
                          </div>
                        </div>
                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={(e) => openEditModal(ex, e)}
                          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                          title="Edit exercise"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Edit Exercise Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Exercise
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Exercise Name</Label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Exercise name"
              />
            </div>
            <div className="space-y-2">
              <Label>Equipment</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editFormData.equipment}
                onChange={(e) => setEditFormData({ ...editFormData, equipment: e.target.value })}
              >
                <option value="Machine">Machine</option>
                <option value="Dumbbell">Dumbbell</option>
                <option value="Barbell">Barbell</option>
                <option value="Bodyweight">Bodyweight</option>
                <option value="Cable">Cable</option>
                <option value="Kettlebell">Kettlebell</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Demo URL
              </Label>
              <Input
                value={editFormData.video_url}
                onChange={(e) => setEditFormData({ ...editFormData, video_url: e.target.value })}
                placeholder="Paste YouTube, Instagram, or video link..."
              />
              <p className="text-xs text-muted-foreground">
                Add a link to help clients see proper form for this exercise
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                onClick={saveExerciseChanges} 
                className="flex-1"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
