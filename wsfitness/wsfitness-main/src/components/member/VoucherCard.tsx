import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Gift, Copy, Check, Store } from 'lucide-react';
import { toast } from 'sonner';

interface VoucherCardProps {
  id: string;
  title: string;
  description?: string;
  code: string;
  value: number;
  vendorName?: string;
  status: 'valid' | 'redeemed' | 'expired';
}

export function VoucherCard({
  title,
  description,
  code,
  value,
  vendorName,
  status,
}: VoucherCardProps) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Voucher code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const isAvailable = status === 'valid';

  return (
    <>
      <Card 
        className={`relative overflow-hidden transition-all ${
          isAvailable 
            ? 'bg-card hover:bg-card/80 cursor-pointer border-border' 
            : 'bg-muted/50 opacity-60 border-muted'
        }`}
        onClick={() => isAvailable && setShowCode(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl ${isAvailable ? 'bg-primary/20' : 'bg-muted'}`}>
              <Gift className={`h-5 w-5 ${isAvailable ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-foreground truncate">{title}</h3>
                {status === 'redeemed' && (
                  <Badge variant="secondary" className="text-xs">Redeemed</Badge>
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{description}</p>
              )}
              <div className="flex items-center gap-2">
                {vendorName && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Store className="h-3 w-3" />
                    <span>{vendorName}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-display text-primary">
                RM{value}
              </span>
              <p className="text-xs text-muted-foreground">OFF</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCode} onOpenChange={setShowCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            
            <div className="p-4 bg-muted rounded-xl text-center space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Your Voucher Code</p>
              <p className="text-2xl font-mono font-bold text-primary tracking-wider">{code}</p>
            </div>

            <Button 
              onClick={handleCopy} 
              className="w-full bg-gradient-neon hover:opacity-90"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Show this code to the vendor to redeem your perk
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
