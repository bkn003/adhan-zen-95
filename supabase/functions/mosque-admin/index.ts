import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, username, password, location_id, data } = await req.json();

    if (action === "login") {
      // Verify credentials using the DB function
      const { data: result, error } = await supabase.rpc("verify_mosque_admin", {
        p_username: username,
        p_password: password,
      });

      if (error || !result) {
        return new Response(
          JSON.stringify({ error: "Invalid username or password" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate a simple session token
      const token = crypto.randomUUID();
      
      return new Response(
        JSON.stringify({ location_id: result, token }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_location") {
      // Verify the admin is logged in by re-checking credentials
      if (!username || !password || !location_id) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: verifiedId } = await supabase.rpc("verify_mosque_admin", {
        p_username: username,
        p_password: password,
      });

      if (!verifiedId || verifiedId !== location_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update location data
      const { error: updateError } = await supabase
        .from("locations")
        .update(data)
        .eq("id", location_id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update_prayer_times") {
      if (!username || !password || !location_id) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: verifiedId } = await supabase.rpc("verify_mosque_admin", {
        p_username: username,
        p_password: password,
      });

      if (!verifiedId || verifiedId !== location_id) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // data should be { id, ...fields } for upsert
      const { id: ptId, ...ptFields } = data;

      if (ptId) {
        // Update existing
        const { error } = await supabase
          .from("prayer_times")
          .update(ptFields)
          .eq("id", ptId)
          .eq("location_id", location_id);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from("prayer_times")
          .insert({ ...ptFields, location_id });

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "set_credentials") {
      // This should only be used initially or by super admin
      // For now, allow setting if no credentials exist yet
      if (!location_id || !username || !password) {
        return new Response(
          JSON.stringify({ error: "Missing fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if credentials already exist
      const { data: loc } = await supabase
        .from("locations")
        .select("admin_username")
        .eq("id", location_id)
        .single();

      if (loc?.admin_username) {
        // Credentials already exist, need old credentials to change
        const { old_username, old_password } = data || {};
        if (!old_username || !old_password) {
          return new Response(
            JSON.stringify({ error: "Existing credentials required to change" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: verifiedId } = await supabase.rpc("verify_mosque_admin", {
          p_username: old_username,
          p_password: old_password,
        });

        if (!verifiedId || verifiedId !== location_id) {
          return new Response(
            JSON.stringify({ error: "Invalid current credentials" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Set new credentials
      const { data: result } = await supabase.rpc("set_mosque_admin_credentials", {
        p_location_id: location_id,
        p_username: username,
        p_password: password,
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
