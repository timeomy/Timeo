import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { price_id, user_id, provider = 'toyyibpay' } = await req.json();

    // Validate required fields
    if (!price_id || !user_id) {
      console.error('Missing required fields:', { price_id, user_id });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: price_id and user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating checkout session:', { price_id, user_id, provider });

    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map price_id to amount (in a real app, fetch from a prices table or config)
    const priceMap: Record<string, number> = {
      'monthly_standard': 99.00,
      'monthly_premium': 149.00,
      'yearly_standard': 999.00,
      'yearly_premium': 1499.00,
    };

    const amount = priceMap[price_id] || 99.00;

    // Create a pending payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id,
        amount,
        currency: 'MYR',
        status: 'pending',
        provider,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Payment record created:', payment.id);

    let checkoutUrl: string;

    // =================================================================
    // PAYMENT PROVIDER INTEGRATION
    // Replace the mock URLs below with actual API calls
    // =================================================================

    if (provider === 'stripe') {
      // TODO: Stripe Integration
      // -------------------------
      // const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
      // const session = await stripe.checkout.sessions.create({
      //   payment_method_types: ['card'],
      //   line_items: [{ price: price_id, quantity: 1 }],
      //   mode: 'payment',
      //   success_url: `${origin}/member/dashboard?payment=success`,
      //   cancel_url: `${origin}/member/profile?payment=cancelled`,
      //   metadata: { payment_id: payment.id, user_id },
      // });
      // checkoutUrl = session.url;

      // Mock response for now
      checkoutUrl = `https://checkout.stripe.com/mock?payment_id=${payment.id}`;
      
    } else if (provider === 'toyyibpay') {
      // TODO: ToyyibPay Integration
      // ----------------------------
      // const toyyibpaySecretKey = Deno.env.get('TOYYIBPAY_SECRET_KEY');
      // const toyyibpayCategory = Deno.env.get('TOYYIBPAY_CATEGORY_CODE');
      // 
      // const formData = new FormData();
      // formData.append('userSecretKey', toyyibpaySecretKey);
      // formData.append('categoryCode', toyyibpayCategory);
      // formData.append('billName', 'WS Fitness Membership');
      // formData.append('billDescription', `Membership - ${price_id}`);
      // formData.append('billPriceSetting', '1');
      // formData.append('billPayorInfo', '1');
      // formData.append('billAmount', (amount * 100).toString()); // in cents
      // formData.append('billReturnUrl', `${origin}/member/dashboard?payment=success`);
      // formData.append('billCallbackUrl', `${supabaseUrl}/functions/v1/payment-webhook`);
      // formData.append('billExternalReferenceNo', payment.id);
      // 
      // const response = await fetch('https://toyyibpay.com/index.php/api/createBill', {
      //   method: 'POST',
      //   body: formData,
      // });
      // const billData = await response.json();
      // checkoutUrl = `https://toyyibpay.com/${billData[0].BillCode}`;

      // Mock response for now
      checkoutUrl = `https://toyyibpay.com/mock-bill?payment_id=${payment.id}`;
      
    } else if (provider === 'tng') {
      // TODO: Touch 'n Go eWallet Integration
      // -------------------------------------
      // This typically uses ToyyibPay as the payment gateway
      // with TNG as the payment channel
      
      // Mock response for now
      checkoutUrl = `https://toyyibpay.com/mock-tng?payment_id=${payment.id}`;
      
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid payment provider' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checkout URL generated:', checkoutUrl);

    return new Response(
      JSON.stringify({ 
        checkout_url: checkoutUrl,
        payment_id: payment.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-checkout-session:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
