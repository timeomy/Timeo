import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, Package, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAccessLevels, type AccessLevel } from '@/hooks/useAccessLevels';

interface MembershipPlan {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_months: number;
  duration_days: number;
  access_level: string;
  is_active: boolean;
  display_order: number;
}

interface DynamicPlanSelectorProps {
  onSelectPlan: (plan: MembershipPlan) => void;
}

// Color mapping for dynamic access levels
const COLOR_MAP: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  amber: {
    border: 'border-2 border-amber-500/60 hover:border-amber-400',
    bg: 'bg-gradient-to-br from-amber-500/5 to-orange-500/5',
    text: 'text-amber-500',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  emerald: {
    border: 'border-2 border-emerald-500/60 hover:border-emerald-400',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  red: {
    border: 'border-2 border-red-500/60 hover:border-red-400',
    bg: 'bg-red-500/5',
    text: 'text-red-400',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  purple: {
    border: 'border-2 border-purple-500/60 hover:border-purple-400',
    bg: 'bg-purple-500/5',
    text: 'text-purple-400',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  blue: {
    border: 'border-2 border-blue-500/60 hover:border-blue-400',
    bg: 'bg-blue-500/5',
    text: 'text-blue-400',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  cyan: {
    border: 'border-2 border-cyan-500/60 hover:border-cyan-400',
    bg: 'bg-cyan-500/5',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  },
  orange: {
    border: 'border-2 border-orange-500/60 hover:border-orange-400',
    bg: 'bg-orange-500/5',
    text: 'text-orange-400',
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  },
  pink: {
    border: 'border-2 border-pink-500/60 hover:border-pink-400',
    bg: 'bg-pink-500/5',
    text: 'text-pink-400',
    badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  },
  slate: {
    border: 'border-2 border-slate-400/60 hover:border-slate-300',
    bg: 'bg-slate-500/5',
    text: 'text-slate-400',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
  violet: {
    border: 'border-2 border-violet-500/60 hover:border-violet-400',
    bg: 'bg-violet-500/5',
    text: 'text-violet-400',
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  },
  teal: {
    border: 'border-2 border-teal-500/60 hover:border-teal-400',
    bg: 'bg-teal-500/5',
    text: 'text-teal-400',
    badge: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  },
  indigo: {
    border: 'border-2 border-indigo-500/60 hover:border-indigo-400',
    bg: 'bg-indigo-500/5',
    text: 'text-indigo-400',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
};

function getStylesForLevel(level: AccessLevel | undefined) {
  if (!level) return null;
  return COLOR_MAP[level.color] || COLOR_MAP.slate;
}

export function DynamicPlanSelector({ onSelectPlan }: DynamicPlanSelectorProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { data: accessLevels = [], isLoading: loadingLevels } = useAccessLevels();

  useEffect(() => {
    fetchPlans();
  }, []);

  // Set default category to first one that has plans
  useEffect(() => {
    if (plans.length > 0 && accessLevels.length > 0 && !activeCategory) {
      const firstWithPlans = accessLevels.find(l => l.is_active && plans.some(p => p.access_level === l.key));
      setActiveCategory(firstWithPlans?.key || accessLevels[0]?.key || null);
    }
  }, [plans, accessLevels, activeCategory]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => `RM ${Number(price).toFixed(2)}`;

  const getDurationLabel = (plan: MembershipPlan) => {
    const months = plan.duration_months;
    const days = plan.duration_days || 0;
    const parts: string[] = [];
    if (months === 12 && days === 0) return '1 Year';
    if (months > 0) parts.push(months === 1 ? '1 Month' : `${months} Months`);
    if (days > 0) parts.push(days === 1 ? '1 Day' : `${days} Days`);
    return parts.join(' + ') || '0 Days';
  };

  const getAccessLabel = (access: string) => {
    const level = accessLevels.find(l => l.key === access);
    return level ? `${level.emoji} ${level.label}` : access.replace('_', ' ');
  };

  const filteredPlans = activeCategory ? plans.filter((plan) => plan.access_level === activeCategory) : plans;

  // Categories that have plans
  const categoriesWithPlans = accessLevels.filter(l => l.is_active && plans.some(p => p.access_level === l.key));

  if (loading || loadingLevels) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Select Your Plan</h2>
          <p className="text-sm text-muted-foreground mt-1">Loading available plans...</p>
        </div>
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">No Plans Available</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Please contact the gym for membership options.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Select Your Plan</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the membership that fits your fitness goals
        </p>
      </div>

      {/* Category Tabs - dynamic from DB */}
      {categoriesWithPlans.length > 1 && (
        <div className="flex flex-wrap gap-2 justify-center pb-2">
          {categoriesWithPlans.map((cat) => {
            const isActive = activeCategory === cat.key;
            const isPromo = cat.key === 'promo';
            const colorStyles = COLOR_MAP[cat.color] || COLOR_MAP.slate;

            return (
              <Button
                key={cat.key}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  'gap-1.5 text-xs transition-all',
                  isPromo && !isActive && 'border-amber-500/50 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400',
                  isPromo && isActive && 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/25'
                )}
              >
                <span>{cat.emoji}</span>
                {cat.label}
              </Button>
            );
          })}
        </div>
      )}

      {/* Plans List */}
      <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
        {filteredPlans.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No plans in this category</p>
          </div>
        ) : (
          filteredPlans.map((plan) => {
            const level = accessLevels.find(l => l.key === plan.access_level);
            const styles = getStylesForLevel(level);
            const isPromo = plan.access_level === 'promo';

            return (
              <Card
                key={plan.id}
                className={cn(
                  "transition-all cursor-pointer hover:shadow-md",
                  styles ? cn(styles.border, styles.bg) : "border-border/30 hover:border-primary/50 bg-card/50 hover:bg-card"
                )}
                onClick={() => onSelectPlan(plan)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isPromo && <Flame className="h-4 w-4 text-amber-500" />}
                          <h4 className={cn("font-medium", styles ? styles.text : "text-foreground")}>
                            {plan.title}
                          </h4>
                          <Badge
                            variant="secondary"
                            className={cn("text-xs shrink-0", styles && styles.badge)}
                          >
                            {getAccessLabel(plan.access_level)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Valid for {getDurationLabel(plan)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={cn("text-lg font-bold", styles ? styles.text : "text-primary")}>
                          {formatPrice(plan.price)}
                        </p>
                        <Button
                          size="sm"
                          className={cn(
                            "mt-1 h-7 text-xs gap-1",
                            isPromo && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                          )}
                        >
                          <CheckCircle className="h-3 w-3" />
                          Select
                        </Button>
                      </div>
                    </div>

                    {plan.description && (
                      <div
                        className="text-sm text-muted-foreground border-t border-border/30 pt-3"
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {plan.description}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="text-center pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          ⚠️ All plans are <span className="font-semibold">Non-refundable & Non-exchangeable</span>
        </p>
      </div>
    </div>
  );
}
