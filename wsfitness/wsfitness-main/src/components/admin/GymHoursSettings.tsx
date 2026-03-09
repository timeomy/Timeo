import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Clock, Save, Shield, Coffee } from 'lucide-react';

interface GymHoursData {
  session1_start: string;
  session1_end: string;
  session2_start: string;
  session2_end: string;
  staff_early_minutes: number;
}

// Generate time slots with 30-min increments
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Format time to 12h display
const formatTimeDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export function GymHoursSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [form, setForm] = useState<GymHoursData>({
    session1_start: '07:30',
    session1_end: '12:00',
    session2_start: '14:00',
    session2_end: '22:00',
    staff_early_minutes: 30,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('id, session1_start, session1_end, session2_start, session2_end, staff_early_minutes')
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setSettingsId(data.id);
        setForm({
          session1_start: data.session1_start ?? '07:30',
          session1_end: data.session1_end ?? '12:00',
          session2_start: data.session2_start ?? '14:00',
          session2_end: data.session2_end ?? '22:00',
          staff_early_minutes: data.staff_early_minutes ?? 30,
        });
      }
      setLoading(false);
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!settingsId) {
      toast.error('Company settings not found. Please save company details first.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          session1_start: form.session1_start,
          session1_end: form.session1_end,
          session2_start: form.session2_start,
          session2_end: form.session2_end,
          staff_early_minutes: form.staff_early_minutes,
        })
        .eq('id', settingsId);

      if (error) throw error;
      toast.success('Gym hours saved successfully');
    } catch (error: any) {
      console.error('Error saving gym hours:', error);
      toast.error(error.message || 'Failed to save gym hours');
    } finally {
      setSaving(false);
    }
  };

  // Calculate staff early access time
  const [startHour, startMin] = form.session1_start.split(':').map(Number);
  const staffEarlyTotalMin = startHour * 60 + startMin - form.staff_early_minutes;
  const staffEarlyHour = Math.floor(staffEarlyTotalMin / 60);
  const staffEarlyMin = staffEarlyTotalMin % 60;

  if (loading) {
    return (
      <Card className="ios-card border-border/50">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ios-card border-border/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Gym Operating Hours</CardTitle>
        </div>
        <CardDescription>
          Configure split shift schedules with morning and afternoon sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session 1 - Morning */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <Label className="font-medium">Session 1 (Morning)</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Opens</Label>
              <Select
                value={form.session1_start}
                onValueChange={(v) => setForm(prev => ({ ...prev, session1_start: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.filter(t => {
                    const h = parseInt(t.split(':')[0]);
                    return h >= 5 && h <= 12;
                  }).map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Closes</Label>
              <Select
                value={form.session1_end}
                onValueChange={(v) => setForm(prev => ({ ...prev, session1_end: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.filter(t => {
                    const h = parseInt(t.split(':')[0]);
                    return h >= 10 && h <= 14;
                  }).map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Rest Period Indicator */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Coffee className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400">
            Rest Period: {formatTimeDisplay(form.session1_end)} – {formatTimeDisplay(form.session2_start)}
          </span>
        </div>

        {/* Session 2 - Afternoon */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <Label className="font-medium">Session 2 (Afternoon / Evening)</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Opens</Label>
              <Select
                value={form.session2_start}
                onValueChange={(v) => setForm(prev => ({ ...prev, session2_start: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.filter(t => {
                    const h = parseInt(t.split(':')[0]);
                    return h >= 12 && h <= 18;
                  }).map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Closes</Label>
              <Select
                value={form.session2_end}
                onValueChange={(v) => setForm(prev => ({ ...prev, session2_end: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.filter(t => {
                    const h = parseInt(t.split(':')[0]);
                    return h >= 18 || h === 0;
                  }).map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Staff Early Access */}
        <div className="space-y-3">
          <Label className="font-medium">Staff Early Access</Label>
          <Select
            value={form.staff_early_minutes.toString()}
            onValueChange={(v) => setForm(prev => ({ ...prev, staff_early_minutes: parseInt(v) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes before</SelectItem>
              <SelectItem value="30">30 minutes before</SelectItem>
              <SelectItem value="45">45 minutes before</SelectItem>
              <SelectItem value="60">1 hour before</SelectItem>
              <SelectItem value="90">1.5 hours before</SelectItem>
              <SelectItem value="120">2 hours before</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Card */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Current Configuration</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Morning Session:</span>
              <p className="font-medium">
                {formatTimeDisplay(form.session1_start)} – {formatTimeDisplay(form.session1_end)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Afternoon Session:</span>
              <p className="font-medium">
                {formatTimeDisplay(form.session2_start)} – {formatTimeDisplay(form.session2_end)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Staff Early Access:</span>
              <p className="font-medium">
                {staffEarlyHour}:{staffEarlyMin.toString().padStart(2, '0')} {staffEarlyHour < 12 ? 'AM' : 'PM'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Early Window:</span>
              <p className="font-medium">{form.staff_early_minutes} minutes</p>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving || !settingsId}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Gym Hours
        </Button>
      </CardContent>
    </Card>
  );
}