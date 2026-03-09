import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_USERS = [
  {
    email: "active@wsfitness.my",
    password: "password123",
    name: "Alice Active",
    role: "member",
    plan_type: "CT 16",
    status: "active",
    expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
  },
  {
    email: "expired@wsfitness.my",
    password: "password123",
    name: "Bob Expired",
    role: "member",
    plan_type: "CT-1",
    status: "expired",
    expiry_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
  },
  {
    email: "vendor@wsfitness.my",
    password: "password123",
    name: "Vendor User",
    role: "vendor",
    business_name: "Protein Lab Test",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the requesting user is an IT admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if requesting user is IT admin or admin
    const { data: rolesData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    const roles = (rolesData ?? []).map((r) => r.role);
    const isItAdmin = roles.includes("it_admin");
    const isAdmin = roles.includes("admin");

    if (!isItAdmin && !isAdmin) {
      return new Response(JSON.stringify({ error: "Access denied. Admin only." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { email: string; status: string; error?: string }[] = [];

    for (const testUser of TEST_USERS) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === testUser.email);

        if (existingUser) {
          results.push({ email: testUser.email, status: "already_exists" });
          continue;
        }

        // Create user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: testUser.email,
          password: testUser.password,
          email_confirm: true,
          user_metadata: { name: testUser.name },
        });

        if (createError) {
          results.push({ email: testUser.email, status: "error", error: createError.message });
          continue;
        }

        if (newUser.user) {
          // Update profile
          await supabaseAdmin
            .from("profiles")
            .update({ email: testUser.email, name: testUser.name })
            .eq("id", newUser.user.id);

          // Update role (trigger creates 'coach' by default)
          await supabaseAdmin
            .from("user_roles")
            .update({ role: testUser.role })
            .eq("user_id", newUser.user.id);

          // Create membership for members
          if (testUser.role === "member") {
            await supabaseAdmin.from("memberships").insert({
              user_id: newUser.user.id,
              plan_type: testUser.plan_type,
              expiry_date: testUser.expiry_date,
              status: testUser.status,
            });
          }

          // Create vendor record for vendors
          if (testUser.role === "vendor" && testUser.business_name) {
            await supabaseAdmin.from("vendors").insert({
              user_id: newUser.user.id,
              business_name: testUser.business_name,
            });
          }

          results.push({ email: testUser.email, status: "created" });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ email: testUser.email, status: "error", error: message });
      }
    }

    console.log("seed-test-users: completed", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});