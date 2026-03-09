import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const itAdminEmail = 'itadmin@wsfitness.my'
    const itAdminPassword = 'wsfit2024!'

    // Check if IT Admin already exists
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const existingUser = authUsers?.users?.find(u => u.email === itAdminEmail)

    if (existingUser) {
      // Ensure profile and role exist
      await supabase.from('profiles').upsert({ 
        id: existingUser.id, 
        name: 'IT Admin' 
      })
      
      // Check and add role if missing
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('role', 'it_admin')
        .limit(1)
      
      if (!existingRole || existingRole.length === 0) {
        await supabase.from('user_roles').insert({
          user_id: existingUser.id,
          role: 'it_admin'
        })
      }

      return new Response(
        JSON.stringify({ 
          message: 'IT Admin already exists and is configured',
          email: itAdminEmail,
          password: itAdminPassword
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create IT Admin user
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: itAdminEmail,
      password: itAdminPassword,
      email_confirm: true,
      user_metadata: { name: 'IT Admin' }
    })

    if (createError) {
      throw createError
    }

    if (userData.user) {
      // Update profile
      await supabase.from('profiles').update({ 
        name: 'IT Admin' 
      }).eq('id', userData.user.id)

      // Add IT Admin role
      await supabase.from('user_roles').insert({
        user_id: userData.user.id,
        role: 'it_admin'
      })
    }

    return new Response(
      JSON.stringify({ 
        message: 'IT Admin created successfully!',
        email: itAdminEmail,
        password: itAdminPassword
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
