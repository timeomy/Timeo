import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, isItAdmin, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (e) {
      console.error(e);
      toast.error('Failed to log out');
    }
  };

  const isAdminOrHigher = role === 'admin' || isItAdmin;

  const navItems = isAdminOrHigher
    ? [
        { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin' },
        { href: '/settings', icon: Settings, label: 'Settings' },
      ]
    : [
        { href: role === 'coach' ? '/coach/dashboard' : '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/clients', icon: Users, label: 'Clients' },
        ...(role === 'coach' ? [{ href: '/logs', icon: ClipboardList, label: 'Logs' }] : []),
        { href: '/settings', icon: Settings, label: 'Settings' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[50px]",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all",
                isActive && "bg-primary/15"
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-muted-foreground hover:text-destructive transition-colors min-w-[50px]">
              <div className="p-1.5 rounded-xl">
                <LogOut className="h-5 w-5" />
              </div>
              <span className="text-[9px] font-medium">Logout</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out?</AlertDialogTitle>
              <AlertDialogDescription>
                You’ll need to sign in again to continue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </nav>
  );
}