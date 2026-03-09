import { QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrFabProps {
  onClick: () => void;
}

export function QrFab({ onClick }: QrFabProps) {
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60]">
      <Button
        onClick={onClick}
        size="lg"
        className="h-14 w-14 rounded-full bg-primary shadow-[0_0_30px_hsl(var(--primary)/0.6)] hover:shadow-[0_0_40px_hsl(var(--primary)/0.8)] hover:bg-primary/90 transition-all duration-300 border-4 border-background"
      >
        <QrCode className="h-6 w-6 text-primary-foreground" />
      </Button>
    </div>
  );
}
