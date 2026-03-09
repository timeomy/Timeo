import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-turnstile-secret",
};

interface FaceEventPayload {
  cmd: string;
  sequence_no: string;
  cap_time: string;
  device_sn?: string;
  match?: {
    person_id?: string;
    customer_text?: string;
    score?: number;
  };
}

interface GatewayCtrl {
  device_type: "gpio" | "wiegand";
  device_no: number;
  ctrl_mode: "force";
  person_id?: string;
}

interface AckResponse {
  reply: "ACK";
  cmd: string;
  code: number;
  sequence_no: string;
  cap_time: string;
  gateway_ctrl?: GatewayCtrl;
  text_display?: string;
  tts?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sharedSecret = Deno.env.get("TURNSTILE_SHARED_SECRET");

  // Validate shared secret from Cloudflare proxy
  const requestSecret = req.headers.get("x-turnstile-secret");
  if (sharedSecret && requestSecret !== sharedSecret) {
    console.error("Invalid turnstile secret");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let payload: FaceEventPayload;
  try {
    payload = await req.json();
    console.log("Received face event:", JSON.stringify(payload));
  } catch (e) {
    console.error("Invalid JSON payload:", e);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Extract required fields with defaults
  const { cmd, sequence_no = "", cap_time = "", device_sn = "unknown", match } = payload;

  // Base ACK response - always echo sequence_no and cap_time
  const baseAck: AckResponse = {
    reply: "ACK",
    cmd: cmd || "face",
    code: 0,
    sequence_no,
    cap_time,
  };

  // Check for pending commands for this device (piggyback approach)
  // This works for heartbeats, face events, and any other message from the device
  const { data: pendingCommands, error: queueError } = await supabase
    .from('turnstile_command_queue')
    .select('id, command_json')
    .eq('device_sn', device_sn)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (!queueError && pendingCommands && pendingCommands.length > 0) {
    const pendingCmd = pendingCommands[0];
    console.log(`[PIGGYBACK] Found pending command for device ${device_sn}:`, pendingCmd.id);
    
    // Mark command as sent
    await supabase
      .from('turnstile_command_queue')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', pendingCmd.id);

    // CLEAN EXIT: Return ONLY the command JSON to the device
    const body = JSON.stringify(pendingCmd.command_json);
    console.log(`[PIGGYBACK] Returning command (CLEAN EXIT):`, body);

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': body.length.toString(),
      },
    });
  }

  // Process face events normally if no pending commands
  if (cmd !== "face") {
    console.log("Non-face command received:", cmd);
    return new Response(JSON.stringify(baseAck), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get device configuration
  const { data: device } = await supabase
    .from("turnstile_face_devices")
    .select("device_type, is_active, name")
    .eq("device_sn", device_sn)
    .single();

  const deviceType = (device?.device_type as "gpio" | "wiegand") || "gpio";
  const deviceActive = device?.is_active ?? true;

  // Try to identify the user
  let userId: string | null = null;
  let personId: string | null = null;
  let memberName = "Unknown";
  let expiryDate: string | null = null;
  let membershipStatus = "unknown";

  // Priority 1: Use customer_text (UUID string) if present
  if (match?.customer_text) {
    userId = match.customer_text;
    personId = match.person_id || null;
    console.log("Identified by customer_text:", userId);
  }
  // Priority 2: Look up by person_id in enrollments table
  else if (match?.person_id) {
    personId = match.person_id;
    const { data: enrollment } = await supabase
      .from("turnstile_face_enrollments")
      .select("user_id, customer_text")
      .eq("device_sn", device_sn)
      .eq("person_id", match.person_id)
      .is("revoked_at", null)
      .single();

    if (enrollment) {
      userId = enrollment.customer_text || enrollment.user_id;
      console.log("Identified by person_id lookup:", userId);
    }
  }

  // Decision logic
  let decision: "allow" | "deny" | "error" = "deny";
  let reason = "Unknown user";
  let ackResponse = { ...baseAck };

  if (!userId) {
    decision = "deny";
    reason = "Face not enrolled";
    ackResponse.text_display = `Access denied\n${reason}\nPlease see staff`;
  } else if (!deviceActive) {
    decision = "deny";
    reason = "Device inactive";
    ackResponse.text_display = `Access denied\n${reason}`;
  } else {
    // Fetch membership data
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .single();

    memberName = profile?.name || "Member";

    const { data: membership } = await supabase
      .from("memberships")
      .select("status, expiry_date, plan_type")
      .eq("user_id", userId)
      .single();

    if (membership) {
      membershipStatus = membership.status;
      expiryDate = membership.expiry_date;

      // Check if active
      const isActive = membership.status === "active";
      const isExpired = expiryDate && new Date(expiryDate) < new Date();

      if (isActive && !isExpired) {
        decision = "allow";
        reason = "Active membership";

        // Format expiry date for display
        const expiryFormatted = expiryDate
          ? new Date(expiryDate).toISOString().split("T")[0]
          : "N/A";

        ackResponse.gateway_ctrl = {
          device_type: deviceType,
          device_no: 1,
          ctrl_mode: "force",
          person_id: personId || undefined,
        };
        ackResponse.text_display = `${memberName}\nValid until: ${expiryFormatted}`;
        ackResponse.tts = `Welcome ${memberName}`;
      } else {
        decision = "deny";
        reason = isExpired ? "Membership expired" : `Status: ${membershipStatus}`;
        const expiryFormatted = expiryDate
          ? new Date(expiryDate).toISOString().split("T")[0]
          : "N/A";
        ackResponse.text_display = `Access denied\n${reason}\nExpiry: ${expiryFormatted}`;
      }
    } else {
      decision = "deny";
      reason = "No membership found";
      ackResponse.text_display = `Access denied\n${reason}\nPlease see staff`;
    }
  }

  // Log the access attempt
  try {
    await supabase.from("turnstile_face_logs").insert({
      device_sn,
      user_id: userId,
      person_id: personId,
      cap_time,
      decision,
      reason,
      raw_payload: payload,
    });
  } catch (logError) {
    console.error("Failed to log access attempt:", logError);
  }

  console.log(`Decision: ${decision} for user ${userId || "unknown"}, reason: ${reason}`);

  return new Response(JSON.stringify(ackResponse), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
