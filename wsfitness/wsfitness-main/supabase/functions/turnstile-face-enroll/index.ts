import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrollRequest {
  user_id: string;
  device_sn: string;
}

interface EnrollResponse {
  success: boolean;
  person_id?: string;
  error?: string;
}

// Generate a short person_id (max 19 chars) from user_id
function generatePersonId(userId: string): string {
  // Take first 16 chars of UUID (removing dashes) for device compatibility
  return userId.replace(/-/g, "").substring(0, 16).toUpperCase();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate authorization
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ success: false, error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  
  // Verify the caller is staff/admin
  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
  
  if (authError || !caller) {
    return new Response(JSON.stringify({ success: false, error: "Invalid authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check if caller has staff/admin role
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id);

  const callerRoles = roles?.map(r => r.role) || [];
  const isAuthorized = callerRoles.some(r => ["admin", "it_admin", "staff"].includes(r));

  if (!isAuthorized) {
    return new Response(JSON.stringify({ success: false, error: "Insufficient permissions" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: EnrollRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { user_id, device_sn } = body;

  if (!user_id || !device_sn) {
    return new Response(JSON.stringify({ success: false, error: "Missing user_id or device_sn" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Enrolling user ${user_id} on device ${device_sn}`);

  // Verify device exists
  const { data: device, error: deviceError } = await supabaseAdmin
    .from("turnstile_face_devices")
    .select("id, name, is_active")
    .eq("device_sn", device_sn)
    .single();

  if (deviceError || !device) {
    return new Response(JSON.stringify({ success: false, error: "Device not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch member profile for name and avatar
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user_id)
    .single();

  if (profileError || !profile) {
    return new Response(JSON.stringify({ success: false, error: "User profile not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!profile.avatar_url) {
    return new Response(JSON.stringify({ success: false, error: "User has no profile photo. Photo required for face enrollment." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Generate stable person_id
  const personId = generatePersonId(user_id);

  // Check for existing enrollment
  const { data: existingEnrollment } = await supabaseAdmin
    .from("turnstile_face_enrollments")
    .select("id, revoked_at")
    .eq("device_sn", device_sn)
    .eq("user_id", user_id)
    .single();

  if (existingEnrollment && !existingEnrollment.revoked_at) {
    return new Response(JSON.stringify({ 
      success: true, 
      person_id: personId,
      message: "Already enrolled" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // NOTE: In production, you would call the device's API here to upload the face
  // For now, we just save the enrollment mapping
  // The device upload would be:
  // POST to device: { cmd: "upload person", id: personId, name: profile.name, reg_image: base64Image, customer_text: user_id }

  console.log(`Would upload to device: person_id=${personId}, name=${profile.name}, customer_text=${user_id}`);

  // Save enrollment record
  if (existingEnrollment) {
    // Reactivate revoked enrollment
    const { error: updateError } = await supabaseAdmin
      .from("turnstile_face_enrollments")
      .update({
        revoked_at: null,
        enrolled_at: new Date().toISOString(),
      })
      .eq("id", existingEnrollment.id);

    if (updateError) {
      console.error("Failed to reactivate enrollment:", updateError);
      return new Response(JSON.stringify({ success: false, error: "Failed to reactivate enrollment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    // Create new enrollment
    const { error: insertError } = await supabaseAdmin
      .from("turnstile_face_enrollments")
      .insert({
        user_id,
        device_sn,
        person_id: personId,
        customer_text: user_id,
      });

    if (insertError) {
      console.error("Failed to create enrollment:", insertError);
      return new Response(JSON.stringify({ success: false, error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  console.log(`Successfully enrolled user ${user_id} with person_id ${personId}`);

  return new Response(JSON.stringify({ 
    success: true, 
    person_id: personId,
    member_name: profile.name,
    device_name: device.name
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
