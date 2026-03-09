import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is admin/it_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller role using their JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "it_admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List of all public tables to export
    const tables = [
      "profiles",
      "user_roles",
      "memberships",
      "membership_plans",
      "access_levels",
      "check_ins",
      "clients",
      "client_coach_history",
      "training_logs",
      "training_programs",
      "exercises",
      "gym_classes",
      "class_enrollments",
      "instructor_availability",
      "vendors",
      "vouchers",
      "member_vouchers",
      "redemption_logs",
      "payments",
      "payment_requests",
      "renewal_logs",
      "invoices",
      "invoice_items",
      "notifications",
      "company_settings",
      "invite_codes",
      "member_id_counter",
      "document_templates",
      "member_document_signatures",
      "audit_logs",
      "auth_events",
      "login_logs",
      "turnstile_events",
      "turnstile_verifications",
      "turnstile_face_devices",
      "turnstile_face_enrollments",
      "turnstile_face_logs",
      "turnstile_command_queue",
    ];

    const exportData: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      supabase_project_id: "vbeygycoopxwmvjtxdyp",
      tables: {},
    };

    for (const table of tables) {
      try {
        // Use service role to bypass RLS, paginate to get all rows
        let allRows: unknown[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await adminClient
            .from(table)
            .select("*")
            .range(from, from + pageSize - 1);

          if (error) {
            (exportData.tables as Record<string, unknown>)[table] = {
              error: error.message,
              row_count: 0,
            };
            hasMore = false;
          } else {
            allRows = allRows.concat(data || []);
            hasMore = (data?.length || 0) === pageSize;
            from += pageSize;
          }
        }

        if (!(exportData.tables as Record<string, unknown>)[table]) {
          (exportData.tables as Record<string, unknown>)[table] = {
            row_count: allRows.length,
            rows: allRows,
          };
        }
      } catch (e) {
        (exportData.tables as Record<string, unknown>)[table] = {
          error: String(e),
          row_count: 0,
        };
      }
    }

    // Also try to get auth.users data (emails, metadata) via admin API
    try {
      const allAuthUsers: unknown[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

        if (error || !users || users.length === 0) {
          hasMore = false;
        } else {
          allAuthUsers.push(
            ...users.map((u) => ({
              id: u.id,
              email: u.email,
              phone: u.phone,
              email_confirmed_at: u.email_confirmed_at,
              phone_confirmed_at: u.phone_confirmed_at,
              created_at: u.created_at,
              updated_at: u.updated_at,
              last_sign_in_at: u.last_sign_in_at,
              user_metadata: u.user_metadata,
              app_metadata: u.app_metadata,
              // Note: password hashes are NOT accessible via the API
            }))
          );
          hasMore = users.length === 1000;
          page++;
        }
      }

      (exportData as Record<string, unknown>)["auth_users"] = {
        row_count: allAuthUsers.length,
        note: "Password hashes are NOT exportable via Supabase API. Users will need to reset passwords.",
        rows: allAuthUsers,
      };
    } catch (e) {
      (exportData as Record<string, unknown>)["auth_users"] = {
        error: String(e),
        note: "Could not export auth users",
      };
    }

    const jsonStr = JSON.stringify(exportData, null, 2);

    return new Response(jsonStr, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="wsfitness_full_export_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
