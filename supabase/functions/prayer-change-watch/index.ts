import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendFcm } from "../_shared/fcm.ts";

/**
 * Weekly prayer-time change watcher.
 *
 * Runs on a schedule (pg_cron). It snapshots every mosque's published timings
 * per date range, diffs them against the previous snapshot, records the change
 * history, and pushes an FCM alert to every device whose selected mosque OR
 * mohalla mosque is affected — so users are told even with the app closed.
 */

const TRACKED: Array<[string, string]> = [
  ["fajr_adhan", "Fajr Azaan"],
  ["fajr_iqamah", "Fajr Iqamah"],
  ["dhuhr_adhan", "Zuhr Azaan"],
  ["dhuhr_iqamah", "Zuhr Iqamah"],
  ["asr_adhan", "Asr Azaan"],
  ["asr_iqamah", "Asr Iqamah"],
  ["maghrib_adhan", "Maghrib Azaan"],
  ["maghrib_iqamah", "Maghrib Iqamah"],
  ["isha_adhan", "Isha Azaan"],
  ["isha_iqamah", "Isha Iqamah"],
  ["jummah_adhan", "Jummah Azaan"],
  ["jummah_iqamah", "Jummah Iqamah"],
  ["sahar_end", "Sahar End"],
  ["ifthar_time", "Iftar"],
  ["tharaweeh", "Tharaweeh"],
  ["fajr_ramadan_iqamah", "Fajr Iqamah (Ramadan)"],
  ["isha_ramadan_iqamah", "Isha Iqamah (Ramadan)"],
  ["maghrib_ramadan_adhan", "Maghrib Azaan (Ramadan)"],
  ["maghrib_ramadan_iqamah", "Maghrib Iqamah (Ramadan)"],
];

const to12h = (t?: string | null) => {
  if (!t) return "";
  const [hRaw, m] = String(t).split(":");
  let h = parseInt(hRaw, 10);
  if (Number.isNaN(h)) return String(t);
  const mer = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${mer}`;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface Change {
  location_id: string;
  month: string;
  date_range: string;
  field: string;
  label: string;
  old_value: string | null;
  new_value: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Simple shared-secret gate: only the cron job (or an admin) may trigger it.
  const secret = Deno.env.get("WARM_CACHE_KEY");
  const provided = req.headers.get("x-watch-key") ?? new URL(req.url).searchParams.get("key");
  if (secret && provided !== secret) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    let body: { months?: string[] } = {};
    try { body = await req.json(); } catch { /* cron sends minimal bodies */ }

    const now = new Date();
    const months = body.months?.length
      ? body.months
      : [MONTHS[now.getMonth()], MONTHS[(now.getMonth() + 1) % 12]];

    // ---- Load current rows (paginated past the 1000-row default) ----
    const rows: Record<string, unknown>[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("prayer_times")
        .select("*")
        .in("month", months)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }

    // ---- Load previous snapshots ----
    const snaps: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("prayer_time_snapshots")
        .select("location_id, month, date_range, values")
        .in("month", months)
        .range(from, from + PAGE - 1);
      if (error) throw error;
      snaps.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
    }

    const key = (l: string, m: string, r: string) => `${l}|${m}|${r}`;
    const prev = new Map<string, Record<string, string>>();
    for (const s of snaps) {
      prev.set(
        key(String(s.location_id), String(s.month), String(s.date_range)),
        (s.values ?? {}) as Record<string, string>,
      );
    }

    const changes: Change[] = [];
    const upserts: Array<{ location_id: string; month: string; date_range: string; values: Record<string, string> }> = [];

    for (const r of rows) {
      const locationId = String(r.location_id ?? "");
      const month = String(r.month ?? "");
      const range = String(r.date_range ?? "");
      if (!locationId || !month || !range) continue;

      const values: Record<string, string> = {};
      for (const [field] of TRACKED) {
        const v = r[field];
        if (typeof v === "string" && v) values[field] = v.slice(0, 5);
      }

      const before = prev.get(key(locationId, month, range));
      upserts.push({ location_id: locationId, month, date_range: range, values });

      if (!before) continue; // first snapshot — nothing to compare against
      for (const [field, label] of TRACKED) {
        const a = before[field] ?? null;
        const b = values[field] ?? null;
        if (a && b && a !== b) {
          changes.push({ location_id: locationId, month, date_range: range, field, label, old_value: a, new_value: b });
        }
      }
    }

    // ---- Persist snapshots + change history ----
    for (let i = 0; i < upserts.length; i += 500) {
      const slice = upserts.slice(i, i + 500).map((u) => ({ ...u, updated_at: new Date().toISOString() }));
      const { error } = await supabase
        .from("prayer_time_snapshots")
        .upsert(slice, { onConflict: "location_id,month,date_range" });
      if (error) throw error;
    }

    if (changes.length) {
      for (let i = 0; i < changes.length; i += 500) {
        const { error } = await supabase.from("prayer_time_changes").insert(changes.slice(i, i + 500));
        if (error) throw error;
      }
    }

    // ---- Notify affected devices ----
    const byLocation = new Map<string, Change[]>();
    for (const c of changes) {
      const arr = byLocation.get(c.location_id) ?? [];
      arr.push(c);
      byLocation.set(c.location_id, arr);
    }

    let pushed = 0;
    if (byLocation.size) {
      const ids = [...byLocation.keys()];
      const { data: locs } = await supabase.from("locations").select("id, mosque_name").in("id", ids);
      const nameOf = new Map((locs ?? []).map((l) => [String(l.id), String(l.mosque_name)]));

      for (const [locationId, list] of byLocation) {
        const { data: tokenRows } = await supabase
          .from("push_tokens")
          .select("expo_push_token")
          .eq("disabled", false)
          .or(`location_id.eq.${locationId},mohalla_location_id.eq.${locationId}`);

        const tokens = [...new Set((tokenRows ?? []).map((t) => String(t.expo_push_token)).filter(Boolean))];
        if (!tokens.length) continue;

        const head = list
          .slice(0, 3)
          .map((c) => `${c.label} ${to12h(c.old_value)} → ${to12h(c.new_value)}`)
          .join("\n");
        const extra = list.length > 3 ? `\n+${list.length - 3} more change(s)` : "";
        const title = `🕌 ${nameOf.get(locationId) ?? "Your mosque"} — prayer times changed`;
        const bodyText = `Dates ${list[0].date_range} ${list[0].month}\n${head}${extra}`;

        try {
          const res = await sendFcm(tokens, title, bodyText, {
            type: "prayer_time_change",
            location_id: locationId,
            date_range: list[0].date_range,
          });
          pushed += res.sent;
          if (res.invalidTokens.length) {
            await supabase.from("push_tokens").delete().in("expo_push_token", res.invalidTokens);
          }
        } catch (e) {
          console.warn("fcm send failed", e instanceof Error ? e.message : e);
        }
      }
    }

    return json({
      success: true,
      months,
      rows: rows.length,
      changes: changes.length,
      pushed,
    });
  } catch (e) {
    console.error("prayer-change-watch failed", e);
    return json({ error: e instanceof Error ? e.message : "watch failed" }, 500);
  }
});
