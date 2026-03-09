import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export function PullToRefreshIndicator({ 
  pullDistance, 
  isRefreshing,
  threshold = 80 
}: PullToRefreshIndicatorProps) {
  const progress = Math.min(pullDistance / threshold, 1);
  const isTriggered = pullDistance >= threshold;
  
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div 
      className="absolute left-0 right-0 flex items-center justify-center z-30 pointer-events-none"
      style={{ 
        top: 0,
        height: `${Math.max(pullDistance, isRefreshing ? 48 : 0)}px`,
        transition: isRefreshing ? 'none' : 'height 0.2s ease-out',
      }}
    >
      <div 
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border shadow-lg",
          isTriggered || isRefreshing ? "scale-100" : "scale-75",
          "transition-transform duration-200"
        )}
        style={{
          opacity: Math.max(progress * 1.2, isRefreshing ? 1 : 0),
        }}
      >
        <Loader2 
          className={cn(
            "h-5 w-5 text-primary",
            isRefreshing && "animate-spin"
          )}
          style={{
            transform: isRefreshing ? 'none' : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
    </div>
  );
}
