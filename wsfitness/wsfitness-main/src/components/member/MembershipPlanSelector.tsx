import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Dumbbell, Zap, Music, Bike, Calendar, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  membershipCategories, 
  MembershipPlan, 
  formatPrice 
} from '@/lib/membershipPlans';

interface MembershipPlanSelectorProps {
  onSelectPlan: (plan: MembershipPlan) => void;
}

// Category icons and labels for quick navigation
const categoryConfig: Record<string, { icon: React.ElementType; label: string }> = {
  yoga: { icon: Zap, label: 'Yoga' },
  zumba: { icon: Music, label: 'Zumba' },
  spinning: { icon: Bike, label: 'Spinning' },
  walkin: { icon: Calendar, label: 'Day Pass' },
  membership: { icon: Dumbbell, label: 'Gym Access' },
  coach_training: { icon: GraduationCap, label: 'Training' },
};

export function MembershipPlanSelector({ onSelectPlan }: MembershipPlanSelectorProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const categoryEl = categoryRefs.current[categoryId];
    if (categoryEl && scrollContainerRef.current) {
      categoryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Select Your Plan</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the membership that fits your fitness goals
        </p>
      </div>

      {/* Quick Navigation Bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-2 border-b border-border/50">
        <div className="flex flex-wrap gap-2 justify-center">
          {membershipCategories.map((category) => {
            const config = categoryConfig[category.id];
            const Icon = config?.icon || Dumbbell;
            const isActive = activeCategory === category.id;
            
            return (
              <Button
                key={category.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => scrollToCategory(category.id)}
                className={cn(
                  "gap-1.5 text-xs",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {config?.label || category.name}
              </Button>
            );
          })}
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="space-y-6 max-h-[50vh] overflow-y-auto pr-2"
      >
        {membershipCategories.map((category) => (
          <div 
            key={category.id} 
            ref={(el) => { categoryRefs.current[category.id] = el; }}
            className="space-y-3 scroll-mt-4"
          >
            {/* Category Header */}
            <div className="py-2">
              <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
              {category.description && (
                <p className="text-xs text-muted-foreground">{category.description}</p>
              )}
            </div>

            {/* Plans in this category */}
            <div className="grid gap-3">
              {category.plans.map((plan) => (
                <PlanCard 
                  key={plan.id} 
                  plan={plan} 
                  onSelect={() => onSelectPlan(plan)} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          ⚠️ All plans are <span className="font-semibold">Non-refundable & Non-exchangeable</span>
        </p>
      </div>
    </div>
  );
}

interface PlanCardProps {
  plan: MembershipPlan;
  onSelect: () => void;
}

function PlanCard({ plan, onSelect }: PlanCardProps) {
  const isDayPass = plan.id === 'walkin-day';
  
  return (
    <Card 
      className={cn(
        "border-border/30 hover:border-primary/50 transition-all cursor-pointer",
        "bg-card/50 hover:bg-card hover:shadow-md",
        isDayPass && "border-amber-500/30 bg-amber-500/5"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-foreground">
                {plan.name}
              </h4>
              {plan.sessions && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {plan.sessions} {plan.sessions === 1 ? 'Session' : 'Sessions'}
                </Badge>
              )}
              {isDayPass && (
                <Badge variant="outline" className="text-xs shrink-0 border-amber-500/50 text-amber-600">
                  Auto-expires today
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Valid for {plan.validityLabel}</span>
            </div>
          </div>
          
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-primary">
              {formatPrice(plan.price)}
            </p>
            <Button size="sm" className="mt-1 h-7 text-xs gap-1">
              <CheckCircle className="h-3 w-3" />
              Select
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}