import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarDays, Gift, User, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavMemberProps {
  hideNav?: boolean;
}

export function MobileNavMember({ hideNav = false }: MobileNavMemberProps) {
  const location = useLocation();

  // Don't render if hidden
  if (hideNav) return null;

  const isHome = location.pathname === '/member/dashboard';

  // Nav order: Home, Appointments, (QR in center on Home only), Vouchers, Profile
  const leftItems = [
    { icon: Home, label: 'Home', path: '/member/dashboard' },
    { icon: CalendarDays, label: 'Appointments', path: '/member/appointments' },
  ];

  const rightItems = [
    { icon: Gift, label: 'Vouchers', path: '/member/perks' },
    { icon: User, label: 'Profile', path: '/member/profile' },
  ];

  const NavItem = ({ icon: Icon, label, path }: { icon: any; label: string; path: string }) => {
    const isActive = location.pathname === path;
    return (
      <Link
        to={path}
        className={cn(
          "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px]",
          isActive 
            ? "text-primary" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-between h-16 max-w-md mx-auto px-4">
        {/* Left items */}
        <div className="flex items-center gap-1">
          {leftItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>

        {/* Center placeholder - only show gap on Home (where floating QR appears) */}
        {isHome ? (
          <div className="w-14" />
        ) : (
          <div className="w-4" />
        )}

        {/* Right items */}
        <div className="flex items-center gap-1">
          {rightItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>
      </div>
    </nav>
  );
}
