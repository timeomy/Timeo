import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "ROLE_LOOKUP_FAILED"
  | "PROFILE_LOOKUP_FAILED"
  | "INVALID_EMAIL"
  | "DUPLICATE_EMAIL"
  | "INVALID_PASSWORD"
  | "NO_UPDATES"
  | "AUTH_UPDATE_FAILED"
  | "PROFILE_UPDATE_FAILED"
  | "INTERNAL_ERROR";

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * IMPORTANT:
 * We intentionally return HTTP 200 for expected/business errors (duplicate email, validation, permissions)
 * to avoid client-side "blank screen" overlays that may occur on non-2xx Edge Function responses.
 * The real HTTP intent is provided via `httpStatus`.
 */
const err = (code: ErrorCode, message: string, httpStatus: number) =>
  json({ success: false, error: message, code, httpStatus }, 200);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verify auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("update-user: missing authorization header");
      return err("UNAUTHORIZED", "Missing authorization", 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user: requestingUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      console.log("update-user: auth error", authError);
      return err("UNAUTHORIZED", "Unauthorized", 401);
    }

    // Check role (admin/it_admin)
    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    if (rolesError) {
      console.error("update-user: role lookup failed", rolesError);
      return err("ROLE_LOOKUP_FAILED", "Role lookup failed", 500);
    }

    const roles = (rolesData ?? []).map((r) => r.role);
    const isItAdmin = roles.includes("it_admin");
    const isAdmin = roles.includes("admin");

    if (!isItAdmin && !isAdmin) {
      console.log("update-user: access denied - not IT admin or admin");
      return err("FORBIDDEN", "Access denied. Admin access required.", 403);
    }

    // Parse & validate payload
    let body: any;
    try {
      body = await req.json();
    } catch {
      return err("BAD_REQUEST", "Invalid JSON body", 400);
    }

    const userId = typeof body?.userId === "string" ? body.userId : "";
    const email = typeof body?.email === "string" ? body.email : undefined;
    const password = typeof body?.password === "string" ? body.password : undefined;

    if (!userId) {
      return err("BAD_REQUEST", "User ID is required", 400);
    }

    // Get target user's current info for audit log
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from("profiles")
      .select("name, email")
      .eq("id", userId)
      .maybeSingle();

    if (targetProfileError) {
      console.error("update-user: target profile lookup failed", targetProfileError);
      return err("PROFILE_LOOKUP_FAILED", "Failed to load target profile", 500);
    }

    if (!targetProfile) {
      return err("NOT_FOUND", "User not found", 404);
    }

    // Build update object
    const updateData: { email?: string; password?: string } = {};

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const trimmedEmail = email.trim().toLowerCase();

      if (!emailRegex.test(trimmedEmail)) {
        return err("INVALID_EMAIL", "Invalid email format", 400);
      }

      // Check if email is already used by another account
      const { data: existingProfile, error: existingError } = await supabaseAdmin
        .from("profiles")
        .select("id, name")
        .eq("email", trimmedEmail)
        .neq("id", userId)
        .maybeSingle();

      if (existingError) {
        console.error("update-user: duplicate check failed", existingError);
        return err("INTERNAL_ERROR", "Failed to validate email uniqueness", 500);
      }

      if (existingProfile) {
        console.log("update-user: duplicate email", {
          email: trimmedEmail,
          existingUserId: existingProfile.id,
        });
        return err(
          "DUPLICATE_EMAIL",
          `This email is already used by another account (${existingProfile.name || "Unknown"}).`,
          409,
        );
      }

      updateData.email = trimmedEmail;
    }

    if (password && password.trim()) {
      if (password.length < 6) {
        return err("INVALID_PASSWORD", "Password must be at least 6 characters", 400);
      }
      updateData.password = password;
    }

    if (Object.keys(updateData).length === 0) {
      return err("NO_UPDATES", "No updates provided", 400);
    }

    console.log("update-user: updating user", {
      userId,
      hasEmail: !!updateData.email,
      hasPassword: !!updateData.password,
    });

    // Update auth user
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);

    if (updateError) {
      console.error("update-user: failed to update auth user", updateError);
      return err("AUTH_UPDATE_FAILED", updateError.message, 400);
    }

    // If email was updated, also update the profiles table
    let updatedEmail: string | null = null;
    if (updateData.email) {
      const { data: updatedProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ email: updateData.email })
        .eq("id", userId)
        .select("email")
        .maybeSingle();

      if (profileError || !updatedProfile?.email) {
        console.error("update-user: failed to update profile email", profileError);
        return err("PROFILE_UPDATE_FAILED", "Failed to update profile email.", 500);
      }

      updatedEmail = updatedProfile.email;
    }

    // Actor name for audit log (best-effort)
    const { data: actorProfile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", requestingUser.id)
      .maybeSingle();

    // Log the action with specific action types (best-effort; do not fail request)
    if (updateData.email) {
      await supabaseAdmin.from("audit_logs").insert({
        action_type: "email_changed",
        actor_id: requestingUser.id,
        actor_name: actorProfile?.name || "Unknown",
        target_user_id: userId,
        target_user_name: targetProfile.name,
        details: {
          old_email: targetProfile.email || "none",
          new_email: updateData.email,
        },
      });
    }

    if (updateData.password) {
      await supabaseAdmin.from("audit_logs").insert({
        action_type: "password_reset",
        actor_id: requestingUser.id,
        actor_name: actorProfile?.name || "Unknown",
        target_user_id: userId,
        target_user_name: targetProfile.name,
        details: { changed_by_admin: "true" },
      });
    }

    console.log("update-user: user updated successfully", { userId });

    return json({ success: true, updatedEmail }, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("update-user: unexpected error", message);
    return err("INTERNAL_ERROR", message, 500);
  }
});
