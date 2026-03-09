import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Members', href: '/admin/members', match: '/admin/members' },
  { label: 'Check-in', href: '/admin/check-ins', match: '/admin/check-ins' },
  { label: 'Attendance', href: '/admin/attendance', match: '/admin/attendance' },
  { label: 'Memberships', href: '/admin/memberships', match: '/admin/memberships' },
  { label: 'Documents', href: '/admin/documents', match: '/admin/documents' },
];

export function MemberTabNav() {
  const location = useLocation();
  
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/50 mb-4">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.match || 
          (tab.match === '/admin/members' && location.pathname === '/admin/members');
        
        return (
          <Link
            key={tab.href}
            to={tab.href}
            className={cn(
              'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2',
              isActive
                ? 'text-primary border-primary'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}