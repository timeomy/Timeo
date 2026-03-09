import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DatabasePlan {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_months: number;
  duration_days: number;
  sessions: number | null;
  access_level: string;
  is_active: boolean;
  display_order: number;
}

export function useMembershipPlans() {
  return useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        throw error;
      }

      return data as DatabasePlan[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function formatPlanDisplay(plan: DatabasePlan): string {
  return `${plan.title} (RM${plan.price.toFixed(0)})`;
}

// Unicode superscript number map
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
};

/**
 * Extract session count from a plan title by:
 * 1. Looking up the plan in DB (if plans array provided)
 * 2. Parsing Unicode superscript numbers (e.g., ˣ⁴⁸ → 48)
 * 3. Regex fallback for older formats (e.g., "X48", "- 16 Sessions")
 */
export function extractSessionsFromPlan(
  planTitle: string,
  plans?: DatabasePlan[]
): number | null {
  // 1. DB lookup by title
  if (plans) {
    const match = plans.find(p => p.title === planTitle);
    if (match?.sessions != null) return match.sessions;
  }

  // 2. Parse Unicode superscript: look for ˣ followed by superscript digits
  const superscriptRegex = /ˣ([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/;
  const supMatch = planTitle.match(superscriptRegex);
  if (supMatch) {
    const digits = supMatch[1].split('').map(ch => SUPERSCRIPT_MAP[ch] || '').join('');
    const num = parseInt(digits, 10);
    if (!isNaN(num) && num > 0) return num;
  }

  // 3. Standalone superscript digits after ¹ˣ pattern (e.g., "COACH TRAINING ¹ˣ" = 1 session)
  if (/¹ˣ/.test(planTitle)) return 1;

  // 4. Legacy regex: "X48", "- 16", "16 Sessions"
  const legacyMatch = planTitle.match(/(?:X|-)(\d+)/i) || planTitle.match(/(\d+)\s*Sessions?/i);
  if (legacyMatch) {
    const num = parseInt(legacyMatch[1], 10);
    if (!isNaN(num) && num > 0) return num;
  }

  return null;
}
