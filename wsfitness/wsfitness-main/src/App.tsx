import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";

// Eager: only the Index shell (lightweight — Landing is lazy inside it)
import Index from "./pages/Index";

// Lazy: Auth and everything else
const Auth = lazy(() => import("./pages/Auth"));

// Lazy-load everything else
const Landing = lazy(() => import("./pages/Landing"));
const UpdatePassword = lazy(() => import("./pages/UpdatePassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const TrainingLogs = lazy(() => import("./pages/TrainingLogs"));
const Users = lazy(() => import("./pages/Users"));
const ITAdmin = lazy(() => import("./pages/ITAdmin"));
const Coaches = lazy(() => import("./pages/Coaches"));
const Settings = lazy(() => import("./pages/Settings"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Member Portal
const MemberDashboard = lazy(() => import("./pages/member/MemberDashboard"));
const MemberPerks = lazy(() => import("./pages/member/MemberPerks"));
const MemberProfile = lazy(() => import("./pages/member/MemberProfile"));
const MemberClasses = lazy(() => import("./pages/member/MemberClasses"));
const MemberSchedule = lazy(() => import("./pages/member/MemberSchedule"));
const MemberAppointments = lazy(() => import("./pages/member/MemberAppointments"));

// Vendor Portal
const VendorDashboard = lazy(() => import("./pages/vendor/VendorDashboard"));
const VendorStats = lazy(() => import("./pages/vendor/VendorStats"));
const VendorProfile = lazy(() => import("./pages/vendor/VendorProfile"));
const VendorHistory = lazy(() => import("./pages/vendor/VendorHistory"));
const VendorPerformance = lazy(() => import("./pages/vendor/VendorPerformance"));

// Admin Portal
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const MemberAdmin = lazy(() => import("./pages/admin/MemberAdmin"));
const VendorsAdmin = lazy(() => import("./pages/admin/VendorsAdmin"));
const CheckInsAdmin = lazy(() => import("./pages/admin/CheckInsAdmin"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const GateIntegration = lazy(() => import("./pages/admin/GateIntegration"));
const GymSchedule = lazy(() => import("./pages/admin/GymSchedule"));
const Billing = lazy(() => import("./pages/admin/Billing"));
const PointOfSale = lazy(() => import("./pages/admin/PointOfSale"));
const Marketing = lazy(() => import("./pages/admin/Marketing"));
const MemberAttendance = lazy(() => import("./pages/admin/MemberAttendance"));
const Memberships = lazy(() => import("./pages/admin/Memberships"));
const MemberDocuments = lazy(() => import("./pages/admin/MemberDocuments"));
const Programs = lazy(() => import("./pages/admin/Programs"));
const PlanManager = lazy(() => import("./pages/admin/PlanManager"));
const MergeCenter = lazy(() => import("./pages/admin/MergeCenter"));
const FaceTurnstileDevices = lazy(() => import("./pages/admin/FaceTurnstileDevices"));
const FaceTurnstileEnrollments = lazy(() => import("./pages/admin/FaceTurnstileEnrollments"));
const FaceTurnstileLogs = lazy(() => import("./pages/admin/FaceTurnstileLogs"));
const TurnstileLogs = lazy(() => import("./pages/admin/TurnstileLogs"));
const GateDevices = lazy(() => import("./pages/admin/GateDevices"));
const GateEvents = lazy(() => import("./pages/admin/GateEvents"));
const GateVerifications = lazy(() => import("./pages/admin/GateVerifications"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, requiresMfa } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (requiresMfa) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}

function RoleProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: ('admin' | 'it_admin' | 'staff' | 'coach' | 'member' | 'vendor' | 'day_pass' | 'studio')[];
}) {
  const { user, loading, requiresMfa, role, isItAdmin } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (requiresMfa) return <Navigate to="/auth" replace />;

  const userRole = isItAdmin ? 'it_admin' : role;
  const hasAccess = userRole && allowedRoles.includes(userRole as any);

  if (!hasAccess) {
    if (userRole === 'member' || userRole === 'staff' || userRole === 'day_pass' || userRole === 'studio') {
      return <Navigate to="/member/dashboard" replace />;
    } else if (userRole === 'vendor') {
      return <Navigate to="/vendor/dashboard" replace />;
    } else if (userRole === 'coach') {
      return <Navigate to="/coach/dashboard" replace />;
    } else if (userRole === 'admin' || userRole === 'it_admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Coaching system */}
        <Route path="/dashboard" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin', 'coach']}><Dashboard /></RoleProtectedRoute>} />
        <Route path="/coach/dashboard" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin', 'coach']}><Dashboard /></RoleProtectedRoute>} />
        <Route path="/clients" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin', 'coach']}><Clients /></RoleProtectedRoute>} />
        <Route path="/logs" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin', 'coach']}><TrainingLogs /></RoleProtectedRoute>} />
        <Route path="/users" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><Users /></RoleProtectedRoute>} />
        <Route path="/coaches" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><Coaches /></RoleProtectedRoute>} />
        <Route path="/it-admin" element={<RoleProtectedRoute allowedRoles={['it_admin']}><ITAdmin /></RoleProtectedRoute>} />
        <Route path="/audit-logs" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><AuditLogs /></RoleProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Member Portal */}
        <Route path="/member/dashboard" element={<RoleProtectedRoute allowedRoles={['member', 'staff', 'studio', 'day_pass', 'admin', 'it_admin']}><MemberDashboard /></RoleProtectedRoute>} />
        <Route path="/member/appointments" element={<RoleProtectedRoute allowedRoles={['member', 'staff', 'studio', 'day_pass', 'admin', 'it_admin']}><MemberAppointments /></RoleProtectedRoute>} />
        <Route path="/member/schedule" element={<RoleProtectedRoute allowedRoles={['member', 'staff', 'studio', 'day_pass', 'admin', 'it_admin']}><MemberSchedule /></RoleProtectedRoute>} />
        <Route path="/member/perks" element={<RoleProtectedRoute allowedRoles={['member', 'staff', 'studio', 'day_pass', 'admin', 'it_admin']}><MemberPerks /></RoleProtectedRoute>} />
        <Route path="/member/profile" element={<RoleProtectedRoute allowedRoles={['member', 'staff', 'studio', 'day_pass', 'admin', 'it_admin']}><MemberProfile /></RoleProtectedRoute>} />
        <Route path="/member/classes" element={<RoleProtectedRoute allowedRoles={['member', 'staff', 'studio', 'day_pass', 'admin', 'it_admin']}><MemberClasses /></RoleProtectedRoute>} />

        {/* Vendor Portal */}
        <Route path="/vendor/dashboard" element={<RoleProtectedRoute allowedRoles={['vendor', 'admin', 'it_admin']}><VendorDashboard /></RoleProtectedRoute>} />
        <Route path="/vendor/stats" element={<RoleProtectedRoute allowedRoles={['vendor', 'admin', 'it_admin']}><VendorStats /></RoleProtectedRoute>} />
        <Route path="/vendor/history" element={<RoleProtectedRoute allowedRoles={['vendor', 'admin', 'it_admin']}><VendorHistory /></RoleProtectedRoute>} />
        <Route path="/vendor/performance" element={<RoleProtectedRoute allowedRoles={['vendor', 'admin', 'it_admin']}><VendorPerformance /></RoleProtectedRoute>} />
        <Route path="/vendor/profile" element={<RoleProtectedRoute allowedRoles={['vendor', 'admin', 'it_admin']}><VendorProfile /></RoleProtectedRoute>} />

        {/* Admin Portal */}
        <Route path="/admin/dashboard" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><AdminDashboard /></RoleProtectedRoute>} />
        <Route path="/admin/members" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><MemberAdmin /></RoleProtectedRoute>} />
        <Route path="/admin/vendors" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><VendorsAdmin /></RoleProtectedRoute>} />
        <Route path="/admin/check-ins" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><CheckInsAdmin /></RoleProtectedRoute>} />
        <Route path="/admin/attendance" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><MemberAttendance /></RoleProtectedRoute>} />
        <Route path="/admin/memberships" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><Memberships /></RoleProtectedRoute>} />
        <Route path="/admin/documents" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><MemberDocuments /></RoleProtectedRoute>} />
        <Route path="/admin/reports" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><Reports /></RoleProtectedRoute>} />
        <Route path="/admin/gate" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><GateIntegration /></RoleProtectedRoute>} />
        <Route path="/admin/schedule" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><GymSchedule /></RoleProtectedRoute>} />
        <Route path="/admin/billing" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><Billing /></RoleProtectedRoute>} />
        <Route path="/admin/pos" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><PointOfSale /></RoleProtectedRoute>} />
        <Route path="/admin/marketing" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><Marketing /></RoleProtectedRoute>} />
        <Route path="/admin/programs" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><Programs /></RoleProtectedRoute>} />
        <Route path="/admin/plans" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><PlanManager /></RoleProtectedRoute>} />
        <Route path="/admin/merge-center" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><MergeCenter /></RoleProtectedRoute>} />
        <Route path="/admin/face-turnstile" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><FaceTurnstileDevices /></RoleProtectedRoute>} />
        <Route path="/admin/face-turnstile/enrollments" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><FaceTurnstileEnrollments /></RoleProtectedRoute>} />
        <Route path="/admin/face-turnstile/logs" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><FaceTurnstileLogs /></RoleProtectedRoute>} />
        <Route path="/admin/turnstile-logs" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><TurnstileLogs /></RoleProtectedRoute>} />
        <Route path="/admin/gate-integration" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><GateIntegration /></RoleProtectedRoute>} />
        <Route path="/admin/gate-devices" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><GateDevices /></RoleProtectedRoute>} />
        <Route path="/admin/gate-events" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><GateEvents /></RoleProtectedRoute>} />
        <Route path="/admin/gate-verifications" element={<RoleProtectedRoute allowedRoles={['admin', 'it_admin']}><GateVerifications /></RoleProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="bottom-right" offset={{ bottom: 84 }} />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
