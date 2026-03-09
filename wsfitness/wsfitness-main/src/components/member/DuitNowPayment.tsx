import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, Copy, Upload, CheckCircle, QrCode, CalendarIcon, Banknote, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import duitnowQr from '@/assets/duitnow-qr.png';

type PaymentMethod = 'transfer' | 'cash' | 'card';

interface DuitNowPaymentProps {
  planType: string;
  planId?: string; // e.g., 'walkin-day' for Day Pass
  accessLevel?: string; // e.g., 'day_pass' for Day Pass plans
  amount: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function DuitNowPayment({ planType, planId, accessLevel, amount, onSuccess, onCancel }: DuitNowPaymentProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [payerName, setPayerName] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  // Day Pass: allow selecting a visit date (default to today)
  const isDayPass = accessLevel === 'day_pass' || planId === 'walkin-day';
  const [bookingDate, setBookingDate] = useState<Date>(new Date());

  const generateOrderId = () => {
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `WSF-${date}-${random}`;
  };

  const copyAccountNumber = () => {
    navigator.clipboard.writeText('3185518113');
    toast.success('Account number copied!');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setReceiptFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!payerName.trim()) {
      toast.error('Please enter payer name');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = generateOrderId();
      let receiptUrl: string | null = null;

      // Only upload receipt if file is provided
      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const filePath = `${user.id}/${orderId}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(filePath);
        
        receiptUrl = urlData.publicUrl;
      }

      // Build notes with payment method info
      const paymentMethodLabel = paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'card' ? 'Credit Card' : 'Bank Transfer';
      const fullNotes = [
        `Payment Method: ${paymentMethodLabel}`,
        notes.trim() ? `Remarks: ${notes.trim()}` : null
      ].filter(Boolean).join(' | ');

      // Create payment request
      const { error: insertError } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          order_id: orderId,
          amount: amount,
          plan_type: planType,
          receipt_url: receiptUrl,
          payer_name: payerName,
          payment_date: paymentDate.toISOString(),
          status: paymentMethod === 'cash' ? 'pending_cash' : paymentMethod === 'card' ? 'pending_card' : 'pending_verification',
          // Store selected visit date for Day Pass
          booking_date: isDayPass ? format(bookingDate, 'yyyy-MM-dd') : null,
        });

      if (insertError) throw insertError;

      setSubmitted(true);
      const successMessage = paymentMethod === 'cash' 
        ? 'Cash payment recorded! Please pay at the counter.' 
        : paymentMethod === 'card'
        ? 'Card payment recorded! Please pay at the counter.'
        : 'Payment submitted for verification!';
      toast.success(successMessage);
      onSuccess?.();
    } catch (error: any) {
      console.error('Payment submission error:', error);
      toast.error(error.message || 'Failed to submit payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="glass border-border/50">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-display">
              {paymentMethod === 'cash' ? 'Cash Payment Recorded!' : paymentMethod === 'card' ? 'Card Payment Recorded!' : 'Payment Submitted!'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {paymentMethod === 'cash' || paymentMethod === 'card'
                ? 'Please pay at the counter to activate your renewal.'
                : 'Your payment is pending verification. We\'ll notify you once approved.'}
            </p>
          </div>
          <Button variant="outline" onClick={onCancel} className="mt-4">
            Back to Memberships
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-border/50">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl font-display flex items-center justify-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Complete Your Payment
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {planType} | Total: <span className="text-primary font-semibold">RM {amount.toFixed(2)}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Step 1: Select Payment Method</p>
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            className="grid grid-cols-3 gap-3"
          >
            <Label
              htmlFor="transfer"
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors text-center",
                paymentMethod === 'transfer' 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="transfer" id="transfer" className="sr-only" />
              <QrCode className="h-5 w-5" />
              <span className="text-sm">Bank Transfer</span>
            </Label>
            <Label
              htmlFor="cash"
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors text-center",
                paymentMethod === 'cash' 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="cash" id="cash" className="sr-only" />
              <Banknote className="h-5 w-5" />
              <span className="text-sm">Cash</span>
            </Label>
            <Label
              htmlFor="card"
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors text-center",
                paymentMethod === 'card' 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="card" id="card" className="sr-only" />
              <CreditCard className="h-5 w-5" />
              <span className="text-sm">Credit Card</span>
            </Label>
          </RadioGroup>
        </div>

        {/* Cash Payment Message */}
        {paymentMethod === 'cash' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-center">
            <Banknote className="h-8 w-8 mx-auto mb-2 text-amber-500" />
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Please pay at the counter to activate your renewal.
            </p>
          </div>
        )}

        {/* Credit Card Payment Message */}
        {paymentMethod === 'card' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
            <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Please pay at the counter with your credit/debit card.
            </p>
          </div>
        )}

        {/* Transfer Instructions */}
        {paymentMethod === 'transfer' && (
          <div className="space-y-3">
            <p className="text-sm font-medium">Step 2: Scan & Pay via DuitNow</p>
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <img 
                  src={duitnowQr} 
                  alt="DuitNow QR Code" 
                  className="w-48 h-48 object-contain"
                />
              </div>
            </div>
            
            {/* Bank Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-center">
              <p className="text-sm text-muted-foreground">Or transfer manually:</p>
              <p className="font-medium">Bank: Public Bank</p>
              <div className="flex items-center justify-center gap-2">
                <p className="font-mono text-lg">3185518113</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyAccountNumber}
                  className="h-8 px-2"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm">Recipient: <span className="font-medium">Workout Station</span></p>
            </div>
          </div>
        )}

        {/* Payment Details Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm font-medium">
            {paymentMethod === 'transfer' ? 'Step 3: Payment Details' : 'Step 2: Your Details'}
          </p>
          {paymentMethod === 'card' && (
            <p className="text-xs text-muted-foreground">
              Record the card payment details for verification purposes.
            </p>
          )}

          {/* Day Pass: Select Visit Date */}
          {isDayPass && (
            <div className="space-y-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Label className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                <CalendarIcon className="h-4 w-4" />
                Select Visit Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 border-amber-500/50",
                      !bookingDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bookingDate ? format(bookingDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={bookingDate}
                    onSelect={(date) => date && setBookingDate(date)}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Day Pass valid only on selected date (expires at 11:59 PM)
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="payer-name">Payer Name</Label>
            <Input
              id="payer-name"
              type="text"
              placeholder="Name on bank account"
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-10",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Receipt Upload - Only for transfer, and optional */}
          {paymentMethod === 'transfer' && (
            <div className="space-y-2">
              <Label htmlFor="receipt">Receipt Image (Optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label 
                  htmlFor="receipt" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {receiptFile ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-primary" />
                      <span className="text-sm text-muted-foreground">{receiptFile.name}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload receipt (optional)
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes">Remarks / Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Paid to Jack, Renewing for next month early..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isSubmitting || !payerName.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                paymentMethod === 'cash' ? 'Record Cash Payment' : paymentMethod === 'card' ? 'Record Card Payment' : 'Submit for Verification'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
