import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate an 8-digit hexadecimal member ID (gate-compatible format)
function generateMemberId(): string {
  const chars = '0123456789ABCDEF'; // Only hexadecimal characters for gate compatibility
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result; // No prefix, just 8 hex chars (e.g., 4A1B9C2D)
}

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

    // Verify the requesting user is an admin or IT admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("create-user: missing authorization header");
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !requestingUser) {
      console.error("create-user: auth error", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if requesting user is admin or IT admin
    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    if (rolesError) {
      console.error("create-user: role lookup failed", rolesError);
      return new Response(JSON.stringify({ error: "Role lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roles = (rolesData ?? []).map((r) => r.role);
    const isAdmin = roles.includes("admin");
    const isItAdmin = roles.includes("it_admin");

    if (!isAdmin && !isItAdmin) {
      console.error("create-user: access denied for user", requestingUser.id);
      return new Response(JSON.stringify({ error: "Access denied. Admin only." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("create-user: received body", JSON.stringify(body));
    
    const { 
      email: inputEmail, 
      password: inputPassword, 
      name: inputName,
      fullName,
      role, 
      requireEmailConfirmation, 
      phone_number, 
      plan_type, 
      expiry_date,
      valid_from,
      valid_until, 
      business_name,
      legacy_id,
      avatar_url,
      member_id: providedMemberId,
      skip_email
    } = body;

    // Accept either 'name' or 'fullName' (frontend sends 'fullName')
    const name = fullName || inputName;

    // Support both expiry_date and valid_until (valid_until takes precedence)
    const finalExpiryDate = valid_until || expiry_date;
    const finalValidFrom = valid_from || null;

    // Validate required inputs (only name and role are truly required now)
    if (!name || !role) {
      console.error("create-user: missing required fields", { name: !!name, role: !!role });
      return new Response(JSON.stringify({ error: "Missing required fields: fullName and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auto-generate email if not provided
    // Format: firstname + first letter of lastname + @wsfitness.my
    let email = inputEmail?.trim();
    if (!email) {
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0].toLowerCase().replace(/[^a-z]/g, '');
      const lastInitial = nameParts.length > 1 
        ? nameParts[nameParts.length - 1].charAt(0).toLowerCase().replace(/[^a-z]/g, '') 
        : '';
      email = `${firstName}${lastInitial}@wsfitness.my`;
      console.log("create-user: auto-generated email", email);
    }

    // Default password if not provided
    const password = inputPassword?.trim() || "123456";
    if (!inputPassword) {
      console.log("create-user: using default password");
    }

    // Default plan_type for members if not provided, Staff for staff role
    let finalPlanType = plan_type;
    if (role === "member" && !plan_type) {
      finalPlanType = "Membership 1M";
    } else if (role === "staff") {
      finalPlanType = "Staff";
    }

    // Additional validation for vendor
    if (role === "vendor" && !business_name) {
      console.error("create-user: business_name required for vendor role");
      return new Response(JSON.stringify({ error: "Business name required for vendors" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only IT Admin can create IT Admin users
    if (role === "it_admin" && !isItAdmin) {
      console.error("create-user: only IT Admin can create IT Admin users");
      return new Response(JSON.stringify({ error: "Only IT Admins can create IT Admin users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate member_id ONLY for staff (immediate approval) or if explicitly provided
    // Members should NOT get member_id until admin approval
    let memberId: string | null = providedMemberId || null;
    
    // Only generate member_id for staff (they don't need approval)
    if (role === "staff" && !memberId) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const candidateId = generateMemberId();
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("member_id", candidateId)
          .maybeSingle();
        
        if (!existing) {
          memberId = candidateId;
          console.log("create-user: generated member_id for staff", memberId);
          break;
        }
        console.log("create-user: member_id collision, retrying", candidateId);
      }
      
      if (!memberId) {
        console.error("create-user: failed to generate unique member_id after 3 attempts");
        return new Response(JSON.stringify({ error: "Failed to generate unique member ID. Please try again." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create user with admin API
    console.log("create-user: creating auth user", email);
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: !requireEmailConfirmation,
      user_metadata: { name },
    });

    if (createError) {
      console.error("create-user: auth user creation failed", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newUser.user) {
      console.error("create-user: no user returned from createUser");
      return new Response(JSON.stringify({ error: "User creation failed - no user returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("create-user: auth user created", newUser.user.id);

    // Update profile with email, phone, member_id (if member), legacy_id, and avatar_url
    const profileUpdate: Record<string, unknown> = { 
      email, 
      name, 
      phone_number: phone_number || null 
    };
    
    if (memberId) {
      profileUpdate.member_id = memberId;
    }
    
    if (legacy_id) {
      profileUpdate.legacy_id = legacy_id;
    }
    
    if (avatar_url) {
      profileUpdate.avatar_url = avatar_url;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("create-user: profile update failed", profileError);
      // Don't fail the whole operation, profile can be updated later
    } else {
      console.log("create-user: profile updated successfully");
    }

    // The trigger auto-creates 'coach' role, update if different
    if (role !== "coach") {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", newUser.user.id);
      
      if (roleError) {
        console.error("create-user: role update failed", roleError);
      } else {
        console.log("create-user: role updated to", role);
      }
    }

    // If member or staff, create membership record
    if (role === "member" || role === "staff") {
      // Staff members are immediately active with no expiry
      // Members start as pending_approval and need admin approval
      const isStaff = role === "staff";
      const memberStatus = isStaff ? "active" : "pending_approval";
      
      const { error: membershipError } = await supabaseAdmin.from("memberships").insert({
        user_id: newUser.user.id,
        plan_type: isStaff ? "Staff" : (finalPlanType || "Pending Approval"),
        valid_from: isStaff ? (finalValidFrom || new Date().toISOString().split('T')[0]) : null,
        expiry_date: isStaff ? null : null, // Members get expiry on approval, staff never expires
        status: memberStatus,
      });

      if (membershipError) {
        console.error("create-user: membership creation failed", membershipError);
      } else {
        console.log("create-user: membership created with status", memberStatus);
      }
    }

    // If vendor, create vendor record
    if (role === "vendor") {
      const { error: vendorError } = await supabaseAdmin.from("vendors").insert({
        user_id: newUser.user.id,
        business_name: business_name,
      });

      if (vendorError) {
        console.error("create-user: vendor creation failed", vendorError);
      } else {
        console.log("create-user: vendor record created");
      }
    }

    // Get actor name for audit log
    const { data: actorProfile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", requestingUser.id)
      .single();

    // Log the action
    await supabaseAdmin.from("audit_logs").insert({
      action_type: "user_created",
      actor_id: requestingUser.id,
      actor_name: actorProfile?.name || "Unknown",
      target_user_id: newUser.user.id,
      target_user_name: name,
      details: { email, new_role: role, plan_type, business_name, member_id: memberId },
    });

    console.log("create-user: user created successfully", { 
      userId: newUser.user.id, 
      email, 
      role,
      member_id: memberId 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email,
          member_id: memberId 
        } 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-user: unexpected error", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
