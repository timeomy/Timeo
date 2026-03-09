import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useMembershipPlans, DatabasePlan } from '@/hooks/useMembershipPlans';
import { toast } from 'sonner';
import { sanitizeForPdf } from '@/lib/pdfSanitize';
import { format, addDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import {
  Search, User, CreditCard, Banknote, CheckCircle, Loader2,
  Receipt, Download, Printer, Crown, Clock, ShoppingCart, X
} from 'lucide-react';

interface MemberProfile {
  id: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  member_id: string | null;
  avatar_url: string | null;
}

interface CompanySettings {
  company_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  registration_number: string | null;
  tax_id: string | null;
}

interface CheckoutResult {
  invoiceNumber: string;
  paymentRequestId: string;
  memberName: string;
  memberEmail: string | null;
  planTitle: string;
  amount: number;
  paymentMethod: string;
  date: string;
  orderId: string;
}

export function AdminPlanCheckout() {
  const { user } = useAuth();
  const { data: plans, isLoading: plansLoading } = useMembershipPlans();

  // Member search
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<MemberProfile[]>([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);

  // Plan selection
  const [selectedPlan, setSelectedPlan] = useState<DatabasePlan | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  // Receipt
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    const { data } = await supabase
      .from('company_settings')
      .select('company_name, address, phone, email, registration_number, tax_id')
      .limit(1)
      .single();
    if (data) setCompanySettings(data);
  };

  // Debounced member search
  useEffect(() => {
    if (memberSearch.length < 2) {
      setMemberResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearchingMembers(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, phone_number, member_id, avatar_url')
          .or(`name.ilike.%${memberSearch}%,email.ilike.%${memberSearch}%,member_id.ilike.%${memberSearch}%,phone_number.ilike.%${memberSearch}%`)
          .limit(10);

        if (!error) setMemberResults(data || []);
      } catch (err) {
        console.error('Member search error:', err);
      } finally {
        setSearchingMembers(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [memberSearch]);

  const handleCheckout = async () => {
    if (!selectedMember || !selectedPlan) {
      toast.error('Please select a member and a plan');
      return;
    }

    setProcessing(true);

    try {
      const orderId = `POS-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date();

      // 1. Create payment_request as approved (admin checkout)
      const { data: paymentReq, error: prError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: selectedMember.id,
          order_id: orderId,
          amount: selectedPlan.price,
          plan_type: selectedPlan.title,
          status: 'approved',
          payer_name: selectedMember.name,
          payment_date: now.toISOString(),
          notes: `Admin POS checkout (${paymentMethod === 'cash' ? 'Cash' : 'Credit Card'})${notes ? ` - ${notes}` : ''}`,
        })
        .select()
        .single();

      if (prError) throw prError;

      // 2. Update membership with Sequential Stacking logic
      const isDayPass = selectedPlan.access_level === 'day_pass';
      const totalDurationDays = (selectedPlan.duration_months * 30) + selectedPlan.duration_days;

      let validFrom: string;
      let expiryDate: Date;

      if (isDayPass) {
        validFrom = format(now, 'yyyy-MM-dd');
        expiryDate = addDays(now, Math.max(totalDurationDays, 1) - 1);
        expiryDate.setHours(23, 59, 59, 999);
      } else {
        // Sequential Stacking: extend from current expiry if active
        const { data: currentMembership } = await supabase
          .from('memberships')
          .select('expiry_date')
          .eq('user_id', selectedMember.id)
          .maybeSingle();

        let baseDate = now;
        if (currentMembership?.expiry_date) {
          const currentExpiry = new Date(currentMembership.expiry_date);
          if (currentExpiry > now) baseDate = currentExpiry;
        }

        expiryDate = addDays(baseDate, totalDurationDays);
        validFrom = format(now, 'yyyy-MM-dd');
      }

      // Upsert membership - check if exists first
      const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', selectedMember.id)
        .maybeSingle();

      const membershipPayload = {
        status: 'active',
        plan_type: selectedPlan.title,
        valid_from: validFrom,
        expiry_date: isDayPass ? expiryDate.toISOString() : format(expiryDate, 'yyyy-MM-dd'),
      };

      if (existingMembership) {
        const { error: updateErr } = await supabase
          .from('memberships')
          .update(membershipPayload)
          .eq('user_id', selectedMember.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('memberships')
          .insert({ user_id: selectedMember.id, ...membershipPayload });
        if (insertErr) throw insertErr;
      }

      // 3. Generate invoice and save to invoices table
      const invoiceNumber = `INV-${orderId.replace('POS-', '')}`;

      await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        member_id: selectedMember.id,
        buyer_name: selectedMember.name,
        buyer_email: selectedMember.email,
        buyer_phone: selectedMember.phone_number,
        subtotal: selectedPlan.price,
        total_amount: selectedPlan.price,
        status: 'paid',
        seller_name: companySettings?.company_name || 'My Gym Sdn Bhd',
        seller_address: companySettings?.address,
        seller_phone: companySettings?.phone,
        seller_email: companySettings?.email,
        seller_brn: companySettings?.registration_number,
        seller_tin: companySettings?.tax_id,
        notes: `POS checkout - ${paymentMethod === 'cash' ? 'Cash' : 'Credit Card'}`,
      });

      // 4. Save invoice item
      const { data: savedInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('invoice_number', invoiceNumber)
        .single();

      if (savedInvoice) {
        await supabase.from('invoice_items').insert({
          invoice_id: savedInvoice.id,
          description: `Membership Plan: ${selectedPlan.title}`,
          quantity: 1,
          unit_price: selectedPlan.price,
          total: selectedPlan.price,
        });
      }

      // 5. Log renewal
      await supabase.from('renewal_logs').insert({
        user_id: selectedMember.id,
        performed_by: user?.id || '',
        plan_name: selectedPlan.title,
        amount: selectedPlan.price,
        new_expiry: format(expiryDate, 'yyyy-MM-dd'),
        new_status: 'active',
        type: 'pos_checkout',
        notes: `Admin POS checkout via ${paymentMethod}`,
      });

      // Set result for receipt
      setCheckoutResult({
        invoiceNumber,
        paymentRequestId: paymentReq.id,
        memberName: selectedMember.name,
        memberEmail: selectedMember.email,
        planTitle: selectedPlan.title,
        amount: selectedPlan.price,
        paymentMethod: paymentMethod === 'cash' ? 'Cash' : 'Credit Card',
        date: format(now, 'd MMMM yyyy, h:mm a'),
        orderId,
      });

      setReceiptOpen(true);
      toast.success(`Checkout complete! ${selectedPlan.title} activated for ${selectedMember.name}`);

      // Reset form
      setSelectedMember(null);
      setSelectedPlan(null);
      setMemberSearch('');
      setNotes('');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  const generateReceiptPDF = () => {
    if (!checkoutResult) return;

    // Thermal receipt style - narrow width (80mm ≈ 226pt)
    const receiptWidth = 80;
    const doc = new jsPDF({ unit: 'mm', format: [receiptWidth, 200] });
    const companyName = companySettings?.company_name || 'My Gym';
    const margin = 6;
    const contentWidth = receiptWidth - margin * 2;
    let y = 8;

    const dashedLine = (yPos: number) => {
      doc.setDrawColor(0);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(margin, yPos, receiptWidth - margin, yPos);
      doc.setLineDashPattern([], 0);
    };

    const centerText = (text: string, yPos: number, size: number, style: 'normal' | 'bold' = 'normal') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.text(text, receiptWidth / 2, yPos, { align: 'center' });
    };


    // === Header ===
    doc.setTextColor(0, 0, 0);
    dashedLine(y); y += 2;
    dashedLine(y); y += 6;

    centerText(companyName.toUpperCase(), y, 12, 'bold');
    y += 5;
    if (companySettings?.address) {
      centerText(companySettings.address, y, 6, 'normal');
      y += 3;
    }
    if (companySettings?.phone) {
      centerText(`Tel: ${companySettings.phone}`, y, 6, 'normal');
      y += 3;
    }
    y += 2;

    centerText('RECEIPT', y, 14, 'bold');
    y += 6;
    dashedLine(y); y += 2;
    dashedLine(y); y += 5;

    // === Receipt info ===
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt #: ${checkoutResult.invoiceNumber}`, margin, y);
    y += 4;
    doc.text(`Date: ${checkoutResult.date}`, margin, y);
    y += 4;
    doc.text(`Order: ${checkoutResult.orderId}`, margin, y);
    y += 4;
    doc.text(`Member: ${checkoutResult.memberName}`, margin, y);
    y += 5;

    dashedLine(y); y += 5;

    // === Line items ===
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const itemText = `1x ${sanitizeForPdf(checkoutResult.planTitle)}`;
    const priceText = `RM ${checkoutResult.amount.toFixed(2)}`;

    // Wrap item text if too long
    const maxItemWidth = contentWidth - 25;
    const itemLines = doc.splitTextToSize(itemText, maxItemWidth);
    itemLines.forEach((line: string, i: number) => {
      doc.text(line, margin, y);
      if (i === 0) {
        doc.text(priceText, receiptWidth - margin, y, { align: 'right' });
      }
      y += 4;
    });

    y += 2;
    dashedLine(y); y += 6;

    // === Total ===
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL AMOUNT', margin, y);
    doc.text(`RM ${checkoutResult.amount.toFixed(2)}`, receiptWidth - margin, y, { align: 'right' });
    y += 5;

    dashedLine(y); y += 6;

    // === Payment method ===
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(checkoutResult.paymentMethod.toUpperCase(), margin, y);
    doc.text(`RM ${checkoutResult.amount.toFixed(2)}`, receiptWidth - margin, y, { align: 'right' });
    y += 6;

    dashedLine(y); y += 8;

    // === Thank you ===
    centerText('THANK YOU', y, 14, 'bold');
    y += 8;

    dashedLine(y); y += 6;

    // === Barcode-style order ID ===
    centerText(checkoutResult.orderId, y, 7, 'normal');
    y += 8;

    doc.save(`Receipt-${checkoutResult.invoiceNumber}.pdf`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[calc(100vh-220px)] pb-24 md:pb-0">
      {/* Plans Grid - Left */}
      <div className="lg:col-span-2 space-y-4 flex flex-col">
        {/* Member Search */}
        <Card className="ios-card bg-card border-border/50">
          <CardContent className="p-4">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Select Member
            </Label>
            {selectedMember ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  {selectedMember.avatar_url ? (
                    <img src={selectedMember.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <User className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{selectedMember.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedMember.email} {selectedMember.member_id ? `• ${selectedMember.member_id}` : ''}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setSelectedMember(null); setMemberSearch(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or member ID..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-10 bg-muted/30"
                />
                {searchingMembers && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {memberResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {memberResults.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => {
                          setSelectedMember(member);
                          setMemberSearch('');
                          setMemberResults([]);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          {member.avatar_url ? (
                            <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email} {member.member_id ? `• ${member.member_id}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plans Grid */}
        <Card className="ios-card bg-card border-border/50 flex-1 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Select Membership Plan
            </CardTitle>
          </CardHeader>
          <ScrollArea className="h-full">
            <CardContent className="pb-4">
              {plansLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {plans?.map((plan) => {
                    const isSelected = selectedPlan?.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => setSelectedPlan(isSelected ? null : plan)}
                        className={`p-4 rounded-xl border transition-all text-left group relative ${
                          isSelected
                            ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                            : 'bg-muted/30 border-border/30 hover:border-primary/50 hover:bg-muted/50'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Crown className="h-4 w-4 text-primary" />
                          <span className="text-xs text-muted-foreground uppercase tracking-wider">
                            {plan.access_level.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="font-semibold text-foreground mb-1">{plan.title}</p>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{plan.description}</p>
                        )}
                        <p className="text-xl font-display text-primary">RM {plan.price.toFixed(2)}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {plan.duration_months > 0 && `${plan.duration_months} month${plan.duration_months > 1 ? 's' : ''}`}
                          {plan.duration_months > 0 && plan.duration_days > 0 && ' + '}
                          {plan.duration_days > 0 && `${plan.duration_days} day${plan.duration_days > 1 ? 's' : ''}`}
                          {plan.sessions && ` • ${plan.sessions} sessions`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      {/* Checkout Summary - Right */}
      <Card className="ios-card bg-card border-border/50 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Checkout
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 pt-0">
          {/* Summary */}
          <div className="flex-1 space-y-4">
            {/* Member */}
            <div className="p-3 rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Member</p>
              {selectedMember ? (
                <p className="font-medium">{selectedMember.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No member selected</p>
              )}
            </div>

            {/* Plan */}
            <div className="p-3 rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Plan</p>
              {selectedPlan ? (
                <div>
                  <p className="font-medium">{selectedPlan.title}</p>
                  <p className="text-sm text-primary font-display">RM {selectedPlan.price.toFixed(2)}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No plan selected</p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Payment Method
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="h-4 w-4 mr-2" />
                  Cash
                </Button>
                <Button
                  variant={paymentMethod === 'card' ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => setPaymentMethod('card')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Card
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                Notes (optional)
              </Label>
              <Textarea
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="bg-muted/30"
              />
            </div>
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
            <div className="flex justify-between text-lg font-display">
              <span>Total</span>
              <span className="text-primary">
                RM {selectedPlan ? selectedPlan.price.toFixed(2) : '0.00'}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            className="mt-4 h-14 text-lg font-display"
            onClick={handleCheckout}
            disabled={!selectedMember || !selectedPlan || processing}
          >
            {processing ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <Receipt className="h-5 w-5 mr-2" />
            )}
            {processing ? 'Processing...' : 'Complete Checkout'}
          </Button>
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Checkout Complete
            </DialogTitle>
          </DialogHeader>

          {checkoutResult && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Receipt #</span>
                  <span className="font-mono text-sm">{checkoutResult.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date</span>
                  <span className="text-sm">{checkoutResult.date}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member</span>
                  <span className="text-sm font-medium">{checkoutResult.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="text-sm">{checkoutResult.planTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payment</span>
                  <span className="text-sm">{checkoutResult.paymentMethod}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-display">
                  <span>Total</span>
                  <span className="text-primary">RM {checkoutResult.amount.toFixed(2)}</span>
                </div>
              </div>

              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 w-full justify-center py-2">
                <CheckCircle className="h-4 w-4 mr-2" />
                Membership Activated
              </Badge>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              Close
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={generateReceiptPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
