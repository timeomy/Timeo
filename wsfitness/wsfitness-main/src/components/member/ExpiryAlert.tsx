import { differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ExpiryAlertProps {
  expiryDate: string | null;
  status: 'active' | 'expired';
}

export function ExpiryAlert({ expiryDate, status }: ExpiryAlertProps) {
  if (!expiryDate) return null;

  const daysUntilExpiry = differenceInDays(parseISO(expiryDate), new Date());

  // Show alert if expired or expiring within 14 days
  if (status === 'expired' || daysUntilExpiry < 0) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Membership Expired</AlertTitle>
        <AlertDescription>
          Your membership has expired. Please renew to continue enjoying gym access and perks.
        </AlertDescription>
      </Alert>
    );
  }

  if (daysUntilExpiry <= 14) {
    return (
      <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
        <Clock className="h-4 w-4 text-amber-500" />
        <AlertTitle className="text-amber-600">Membership Expiring Soon</AlertTitle>
        <AlertDescription className="text-amber-600/80">
          {daysUntilExpiry === 0
            ? 'Your membership expires today!'
            : daysUntilExpiry === 1
              ? 'Your membership expires tomorrow!'
              : `Your membership expires in ${daysUntilExpiry} days.`}
          {' '}Contact us to renew.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
