import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Shield, UserPlus } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function ITAdmin() {
  const { isItAdmin, loading } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const handleSeedTestUsers = async () => {
    setSeeding(true);
    try {
      const res = await supabase.functions.invoke('seed-test-users');
      
      if (res.error) {
        throw new Error(res.error.message);
      }

      if (res.data?.error) {
        throw new Error(res.data.error);
      }

      const results = res.data?.results || [];
      const created = results.filter((r: any) => r.status === 'created').length;
      const existing = results.filter((r: any) => r.status === 'already_exists').length;
      const errors = results.filter((r: any) => r.status === 'error').length;

      if (created > 0) {
        toast.success(`Created ${created} test user(s)`);
      }
      if (existing > 0) {
        toast.info(`${existing} user(s) already exist`);
      }
      if (errors > 0) {
        toast.error(`${errors} user(s) failed to create`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to seed test users');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isItAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout title="IT ADMIN">
      <div className="space-y-6">
        <Card className="glass border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-display">IT Administration</CardTitle>
                <CardDescription>Superuser system management tools</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Seed Test Data
            </CardTitle>
            <CardDescription>Create test accounts for development</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Test accounts (password: password123):</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>active@wsfitness.my - Active member (CT 16)</li>
                <li>expired@wsfitness.my - Expired member (CT-1)</li>
                <li>vendor@wsfitness.my - Vendor (Protein Lab Test)</li>
              </ul>
            </div>
            <Button onClick={handleSeedTestUsers} disabled={seeding}>
              {seeding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {seeding ? 'Creating...' : 'Create Test Users'}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>Use the <strong>Users</strong> tab to manage user accounts, credentials, and roles.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}