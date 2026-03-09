import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  CreditCard,
  Loader2,
  ArrowLeft,
  Shield,
  Infinity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DuitNowPayment } from './DuitNowPayment';
import { DynamicPlanSelector } from './DynamicPlanSelector';

// Dynamic plan type from database
interface SelectedPlan {
  id: string;
  title: string;
  price: number;
  duration_months: number;
  access_level: string;
}

interface MembershipBillingProps {
  status: 'active' | 'expired';
  expiryDate: string | null;
  planType?: string;
  userId?: string;
  isStaff?: boolean;
}

type CheckoutStep = 'select_plan' | 'payment';

export function MembershipBilling({ status, expiryDate, planType = 'Standard', userId, isStaff = false }: MembershipBillingProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('select_plan');
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const [renewLoading, setRenewLoading] = useState(false);

  // Staff always have active status
  const isActive = isStaff || status === 'active';
  const daysUntilExpiry = expiryDate ? differenceInDays(new Date(expiryDate), new Date()) : null;
  const isExpiringSoon = !isStaff && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0;

  const getStatusDisplay = () => {
    // Staff get special display
    if (isStaff) {
      return {
        text: 'Staff Access',
        subtext: 'Unlimited gym access',
        color: 'text-primary',
        icon: Shield,
        bgColor: 'bg-primary/10',
      };
    }
    
    if (!isActive) {
      return {
        text: 'Expired',
        subtext: expiryDate ? `Expired on ${format(new Date(expiryDate), 'MMM d, yyyy')}` : 'Membership expired',
        color: 'text-destructive',
        icon: XCircle,
        bgColor: 'bg-destructive/10',
      };
    }
    if (isExpiringSoon) {
      return {
        text: 'Expiring Soon',
        subtext: `${daysUntilExpiry} day${daysUntilExpiry === 1 ? '' : 's'} left - Renew now!`,
        color: 'text-orange-500',
        icon: AlertTriangle,
        bgColor: 'bg-orange-500/10',
      };
    }
    return {
      text: 'Active',
      subtext: expiryDate ? `Expires on ${format(new Date(expiryDate), 'MMM d, yyyy')}` : 'No expiry set',
      color: 'text-emerald-500',
      icon: CheckCircle,
      bgColor: 'bg-emerald-500/10',
    };
  };

  const statusInfo = getStatusDisplay();
  const StatusIcon = statusInfo.icon;

  const handleOpenRenew = () => {
    setDialogOpen(true);
    setCheckoutStep('select_plan');
    setSelectedPlan(null);
  };

  const handleSelectPlan = (plan: SelectedPlan) => {
    setSelectedPlan(plan);
    setCheckoutStep('payment');
  };

  const handleBackToPlanSelection = () => {
    setCheckoutStep('select_plan');
    setSelectedPlan(null);
  };

  const handleRenewClick = async () => {
    setRenewLoading(true);
    await new Promise(resolve => setTimeout(resolve, 100));
    setRenewLoading(false);
    handleOpenRenew();
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setCheckoutStep('select_plan');
      setSelectedPlan(null);
    }
  };

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Membership & Billing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Card */}
          <div className={cn('rounded-xl p-4', statusInfo.bgColor)}>
            <div className="flex items-center gap-3">
              <StatusIcon className={cn('h-8 w-8', statusInfo.color)} />
              <div>
                <p className={cn('text-lg font-semibold', statusInfo.color)}>
                  {statusInfo.text}
                </p>
                <p className="text-sm text-muted-foreground">{statusInfo.subtext}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              {isStaff ? (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Infinity className="h-3 w-3 text-primary" />
                  <span>No expiry • <span className="font-medium text-foreground">Staff Benefits</span></span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Plan: <span className="font-medium text-foreground">{planType}</span>
                </p>
              )}
            </div>
          </div>

          {/* Renew Button */}
          <Button
            onClick={handleRenewClick}
            disabled={renewLoading}
            size="lg"
            className="w-full bg-gradient-neon hover:opacity-90 text-lg py-6"
          >
            {renewLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              'Buy / Renew Membership'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card pb-8 z-[100]">
          {checkoutStep === 'select_plan' && (
            <DynamicPlanSelector onSelectPlan={handleSelectPlan} />
          )}
          
          {checkoutStep === 'payment' && selectedPlan && (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToPlanSelection}
                className="gap-1 -ml-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Plans
              </Button>
              
              <DuitNowPayment
                planType={selectedPlan.title}
                planId={selectedPlan.id}
                accessLevel={selectedPlan.access_level}
                amount={selectedPlan.price}
                onSuccess={() => {
                  setDialogOpen(false);
                  setCheckoutStep('select_plan');
                  setSelectedPlan(null);
                }}
                onCancel={() => setDialogOpen(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
