import { Badge } from '@/components/ui/badge';
import { Shield, Star } from 'lucide-react';
import type { SpecialRole } from '@/hooks/useStaffStatus';

interface StaffBadgeProps {
  className?: string;
  showIcon?: boolean;
  role?: SpecialRole;
}

export function StaffBadge({ className = '', showIcon = true, role = 'staff' }: StaffBadgeProps) {
  const isStudio = role === 'studio';
  
  return (
    <Badge 
      variant="secondary" 
      className={`${isStudio ? 'bg-violet-500/20 text-violet-400 border-violet-500/30 hover:bg-violet-500/30' : 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'} ${className}`}
    >
      {showIcon && (isStudio ? <Star className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />)}
      {isStudio ? 'Studio' : 'Staff'}
    </Badge>
  );
}
