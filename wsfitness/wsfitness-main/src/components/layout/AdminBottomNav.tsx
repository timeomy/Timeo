import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ScanLine, Calendar, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  isCenter?: boolean;
}

const navItems: NavItem[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/admin/schedule', icon: Calendar, label: 'Schedule' },
  { href: '/admin/check-ins', icon: ScanLine, label: 'Check-In', isCenter: true },
  { href: '/admin/members', icon: Users, label: 'Members' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function AdminBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border/30 md:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== '/admin/dashboard' && location.pathname.startsWith(item.href));
          
          if (item.isCenter) {
            // Center floating button for Check-In
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center -mt-6 w-16 h-16 rounded-full shadow-lg transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-primary/30" 
                    : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:shadow-primary/40 hover:scale-105"
                )}
              >
                <item.icon className="h-6 w-6" />
                <span className="text-[10px] font-medium mt-0.5">{item.label}</span>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mb-1",
                isActive && "text-primary"
              )} />
              <span className={cn(
                "text-[10px]",
                isActive ? "font-semibold" : "font-medium"
              )}>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
      {/* Safe area spacing for iOS */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
}
