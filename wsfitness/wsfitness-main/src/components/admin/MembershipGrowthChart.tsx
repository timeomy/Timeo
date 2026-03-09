import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface ChartData {
  month: string;
  members: number;
}

export function MembershipGrowthChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembershipData = async () => {
      try {
        // Fetch all memberships with their created_at dates
        const { data: memberships, error } = await supabase
          .from('memberships')
          .select('created_at')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Group memberships by month and calculate cumulative count
        const monthlyData: ChartData[] = [];
        const now = new Date();
        
        // Get data for last 12 months
        for (let i = 11; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const monthEnd = endOfMonth(monthDate);
          
          // Count memberships created up to this month's end
          const cumulativeCount = (memberships || []).filter(m => 
            new Date(m.created_at) <= monthEnd
          ).length;
          
          monthlyData.push({
            month: format(monthDate, 'MMM'),
            members: cumulativeCount,
          });
        }

        setData(monthlyData);
      } catch (error) {
        console.error('Failed to fetch membership data:', error);
        // Fallback to empty data
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembershipData();
  }, []);

  return (
    <Card className="bg-card border-border/30 h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-display font-bold text-foreground">
          Membership Growth
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="hsl(var(--border))" 
                  vertical={false} 
                />
                <XAxis 
                  dataKey="month" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value: number) => [`${value} members`, 'Total']}
                />
                <Line
                  type="monotone"
                  dataKey="members"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
