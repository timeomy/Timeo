import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  ScanLine, 
  Calendar, 
  CreditCard, 
  BarChart3, 
  Settings, 
  ChevronLeft,
  Dumbbell,
  Store,
  Tag,
  GitMerge,
  UserCheck,
  Scan,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import wsfitnessLogo from '@/assets/wsfitness-logo.jpg';
import { useUserRole } from '@/hooks/useUserRole';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  adminOnly?: boolean;
  coachVisible?: boolean;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true },
  { href: '/admin/members', icon: Users, label: 'Members', adminOnly: true },
  { href: '/coaches', icon: Dumbbell, label: 'Coaches', adminOnly: true },
  { href: '/clients', icon: UserCheck, label: 'Clients', coachVisible: true },
  { href: '/admin/vendors', icon: Store, label: 'Vendors', adminOnly: true },
  { href: '/admin/check-ins', icon: ScanLine, label: 'Check-In', adminOnly: true },
  { href: '/admin/schedule', icon: Calendar, label: 'Schedule', adminOnly: true },
  { href: '/admin/plans', icon: Tag, label: 'Membership Plans', adminOnly: true },
  { href: '/admin/merge-center', icon: GitMerge, label: 'Merge Center', adminOnly: true },
  { href: '/admin/pos', icon: Receipt, label: 'Point of Sale', adminOnly: true },
  { href: '/admin/billing', icon: CreditCard, label: 'Billing', adminOnly: true },
  { href: '/admin/reports', icon: BarChart3, label: 'Reports', adminOnly: true },
  { href: '/admin/face-turnstile', icon: Scan, label: 'Face Turnstile', adminOnly: true },
  { href: '/settings', icon: Settings, label: 'Settings', coachVisible: true },
];

interface GymSidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function GymSidebar({ collapsed, onCollapsedChange }: GymSidebarProps) {
  const location = useLocation();
  const { memberRole, hasAdminAccess, isCoach } = useUserRole();

  // Filter nav items based on role
  const filteredNavItems = navItems.filter(item => {
    // Coaches only see items marked as coachVisible
    if (isCoach) {
      return item.coachVisible === true;
    }
    // Admins see everything
    return true;
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border/30 flex flex-col z-50 transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border/20">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <img src={wsfitnessLogo} alt="WS Fitness" className="w-8 h-8 rounded-lg" />
        </div>
        {!collapsed && (
          <span className="text-xl font-display font-bold tracking-wider text-foreground">
            WS Fitness
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0",
                isActive && "text-primary"
              )} />
              {!collapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
              {isActive && (
                <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <button
        onClick={() => onCollapsedChange(!collapsed)}
        className="flex items-center gap-2 px-4 py-3 border-t border-border/20 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className={cn(
          "h-5 w-5 transition-transform duration-300",
          collapsed && "rotate-180"
        )} />
        {!collapsed && <span className="text-sm">Collapse</span>}
      </button>
    </aside>
  );
}
