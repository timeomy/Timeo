import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scan, CheckCircle, XCircle, Info } from 'lucide-react';

interface Enrollment {
  id: string;
  device_sn: string;
  person_id: string;
  enrolled_at: string;
  revoked_at: string | null;
  device?: {
    name: string;
  };
}

export function TurnstileAccessCard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('turnstile_face_enrollments')
        .select(`
          id,
          device_sn,
          person_id,
          enrolled_at,
          revoked_at,
          device:turnstile_face_devices!turnstile_face_enrollments_device_sn_fkey(name)
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        // Handle the join result shape
        const enrollmentData = data.map(e => ({
          ...e,
          device: Array.isArray(e.device) ? e.device[0] : e.device,
        }));
        setEnrollments(enrollmentData);
      }
      setLoading(false);
    };

    fetchEnrollments();
  }, [user]);

  if (loading) {
    return null;
  }

  const activeEnrollments = enrollments.filter(e => !e.revoked_at);
  const isEnrolled = activeEnrollments.length > 0;

  return (
    <Card className="glass border-border/30 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${isEnrolled ? 'bg-primary/20' : 'bg-muted/30'}`}>
            <Scan className={`h-5 w-5 ${isEnrolled ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-medium text-sm">Turnstile Access</h3>
              {isEnrolled ? (
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Enrolled
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <XCircle className="h-3 w-3 mr-1" />
                  Not Enrolled
                </Badge>
              )}
            </div>
            
            {isEnrolled ? (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Face registered on {activeEnrollments.length} device{activeEnrollments.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1">
                  {activeEnrollments.map(e => (
                    <span
                      key={e.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground"
                    >
                      {e.device?.name || e.device_sn}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 mt-1 p-2 rounded-lg bg-muted/30">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  See staff at reception to enroll your face for turnstile access
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
