import { useEffect } from 'react';
import { GymLayout } from '@/components/layout/GymLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { Navigate } from 'react-router-dom';
import { Loader2, Users, Store, ClipboardCheck, Dumbbell, Gift, FileSpreadsheet, Database, ArrowRightLeft, Receipt, CreditCard } from 'lucide-react';
import { CoachClientExportWithDates } from '@/components/admin/CoachClientExportWithDates';
import { MemberExportCard } from '@/components/admin/MemberExportCard';
import { MembershipPlansExportCard } from '@/components/admin/MembershipPlansExportCard';
import { VendorExportCard } from '@/components/admin/VendorExportCard';
import { AttendanceExportCard } from '@/components/admin/AttendanceExportCard';
import { VoucherExportCard } from '@/components/admin/VoucherExportCard';
import { DataExportSection } from '@/components/admin/DataExportSection';
import { FullUserMigrationExport } from '@/components/admin/FullUserMigrationExport';
import { FullDatabaseExport } from '@/components/admin/FullDatabaseExport';
import { BillingExportCard } from '@/components/admin/BillingExportCard';
import { CoachesExportCard } from '@/components/admin/CoachesExportCard';
import { ClientsExportCard } from '@/components/admin/ClientsExportCard';
import { GateLogsExportCard } from '@/components/admin/GateLogsExportCard';
import { ZahGateConfigExport } from '@/components/admin/ZahGateConfigExport';
export default function Reports() {
  const { role, loading: authLoading } = useAuth();
  const isAdminOrIT = role === 'admin' || role === 'it_admin';

  useEffect(() => {
    document.title = 'Reports & Analytics | WSFitness';
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdminOrIT) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <GymLayout title="Reports" subtitle="Export data and generate reports">
      <section className="space-y-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground">Reports & Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Export data and generate reports for analysis
          </p>
        </header>

        {/* Full Database Export - Migration */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Database Migration
          </h3>
          <FullDatabaseExport />
          <FullUserMigrationExport />
        </section>

        {/* Member Data */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Member Data
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <MemberExportCard />
            <MembershipPlansExportCard />
          </div>
        </section>

        {/* Coaches & Clients */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Coaches & PT Clients
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CoachesExportCard />
            <ClientsExportCard />
          </div>
          <CoachClientExportWithDates />
        </section>

        {/* Gate Logs */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Gate Access Logs
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <GateLogsExportCard />
            <ZahGateConfigExport />
          </div>
        </section>

        {/* Billing & Payments */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Billing & Payments
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <BillingExportCard />
          </div>
        </section>

        {/* Financials */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Financials
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <VoucherExportCard />
            <VendorExportCard />
          </div>
        </section>

        {/* Operations */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Operations
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <AttendanceExportCard />
          </div>
        </section>

        {/* Data Export - All Tables */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Raw Data Export
          </h3>
          <DataExportSection />
        </section>
      </section>
    </GymLayout>
  );
}
