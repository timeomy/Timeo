import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all payment requests that are:
    // - status is 'pending_verification' or 'pending_payment'
    // - created_at is older than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: expiredOrders, error: fetchError } = await supabase
      .from('payment_requests')
      .select('id, order_id, user_id, created_at')
      .in('status', ['pending_verification', 'pending_payment'])
      .lt('created_at', twentyFourHoursAgo);

    if (fetchError) {
      console.error('Error fetching expired orders:', fetchError);
      throw fetchError;
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('No expired orders to cancel');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired orders to cancel',
          cancelled_count: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Update all expired orders to 'cancelled'
    const orderIds = expiredOrders.map(order => order.id);
    
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .in('id', orderIds);

    if (updateError) {
      console.error('Error updating expired orders:', updateError);
      throw updateError;
    }

    console.log(`Successfully cancelled ${expiredOrders.length} expired orders`);
    console.log('Cancelled order IDs:', expiredOrders.map(o => o.order_id).join(', '));

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cancelled ${expiredOrders.length} expired orders`,
        cancelled_count: expiredOrders.length,
        cancelled_orders: expiredOrders.map(o => ({
          id: o.id,
          order_id: o.order_id,
          created_at: o.created_at
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error('Cleanup orders error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to cleanup expired orders';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
