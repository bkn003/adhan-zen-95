import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { sendFcm } from "../_shared/fcm.ts";

/**
 * Per-minute adhan / pre-prayer reminder sender for browser (PWA) devices.
 *
 * Android devices schedule exact local alarms themselves and are marked
 * `self_scheduled = true`, so they are skipped here — nobody gets double alerts.
 *
 * For every web token we resolve the mosque (selected mosque, else mohalla),
 * read today's published timings for that mosque and push:
 *   - a heads-up reminder `preMinutes` before the adhan
 *   - the adhan alert
 *   - the jamaat (iqamah) alert
 * honouring the user's per-prayer toggles and quiet hours.
 *
 * Duplicate protection: every send writes a unique (token, send_key) row.
 */

const PRAYERS: Array<{ key: string; label: string; adhan: string; iqamah: string }> = [
  { key: "fajr", label: "Fajr", adhan: "fajr_adhan", iqamah: "fajr_iqamah" },
  { key: "dhuhr", label: "Zuhr", adhan: "dhuhr_adhan", iqamah: "dhuhr_iqamah" },
  { key: "asr", label: "Asr", adhan: "asr_adhan", iqamah: "asr_iqamah" },
  { key: "maghrib", label: "Maghrib", adhan: "maghrib_adhan", iqamah: "maghrib_iqamah" },
  { key: "isha", label: "Isha", adhan: "isha_adhan", iqamah: "isha_iqamah" },
];

const to12h = (t: string) => {
  const [hRaw, m] = t.split(":");
  let h = parseInt(hRaw, 10);
  if (Number.isNaN(h)) return t;
  const mer = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${mer}`;
};

const toMinutes = (t?: string | null) => {
  if (!t) return null;
  const [h, m] = String(t).split(":");
  const hh = parseInt(h, 10);
  const mm = parseInt(m, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
};

/** Local wall-clock date + minutes-of-day for a time zone. */
function localNow(tz: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const hour = parseInt(parts.hour === "24" ? "0" : parts.hour, 10);
  const minute = parseInt(parts.minute, 10);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + minute,
  };
}

function inQuiet(minutes: number, q?: { enabled?: boolean; start?: string; end?: string }) {
  if (!q?.enabled) return false;
  const s = toMinutes(q.start ?? "22:00") ?? 0;
  const e = toMinutes(q.end ?? "05:00") ?? 0;
  return s <= e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

interface TokenRow {
  expo_push_token: string;
  location_id: string | null;
  mohalla_location_id: string | null;
  timezone: string | null;
  reminder_prefs: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Shared-secret gate (same key as the other cron jobs).
  const secret = Deno.env.get("WARM_CACHE_KEY");
  const provided = req.headers.get("x-watch-key") ?? new URL(req.url).searchParams.get("key");
  if (secret && provided && provided !== secret) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("expo_push_token, location_id, mohalla_location_id, timezone, reminder_prefs")
      .eq("disabled", false)
      .eq("self_scheduled", false)
      .eq("provider", "fcm-web");

    const rows = (tokens ?? []) as TokenRow[];
    if (!rows.length) return json({ success: true, tokens: 0, sent: 0 });

    const locationIds = [
      ...new Set(rows.map((r) => r.location_id ?? r.mohalla_location_id).filter(Boolean) as string[]),
    ];
    if (!locationIds.length) return json({ success: true, tokens: rows.length, sent: 0 });

    // Pull a small window around "today" so every time zone is covered.
    const day = 86_400_000;
    const iso = (d: number) => new Date(d).toISOString().slice(0, 10);
    const { data: times } = await supabase
      .from("prayer_times")
      .select(
        "location_id, date_from, date_to, fajr_adhan, fajr_iqamah, dhuhr_adhan, dhuhr_iqamah, asr_adhan, asr_iqamah, maghrib_adhan, maghrib_iqamah, isha_adhan, isha_iqamah",
      )
      .in("location_id", locationIds)
      .lte("date_from", iso(Date.now() + day))
      .gte("date_to", iso(Date.now() - day));

    const { data: locs } = await supabase.from("locations").select("id, mosque_name").in("id", locationIds);
    const nameOf = new Map((locs ?? []).map((l) => [String(l.id), String(l.mosque_name)]));

    const rowFor = (locationId: string, date: string) =>
      (times ?? []).find(
        (t) =>
          String(t.location_id) === locationId &&
          String(t.date_from ?? "") <= date &&
          String(t.date_to ?? "") >= date,
      );

    interface Job {
      token: string;
      title: string;
      body: string;
      sendKey: string;
      data: Record<string, string>;
    }
    const jobs: Job[] = [];

    for (const row of rows) {
      const locationId = row.location_id ?? row.mohalla_location_id;
      if (!locationId) continue;

      const tz = row.timezone || "Asia/Kolkata";
      const { date, minutes } = localNow(tz);
      const schedule = rowFor(locationId, date);
      if (!schedule) continue;

      const cfg = (row.reminder_prefs ?? {}) as {
        prefs?: {
          adhan?: Record<string, boolean>;
          iqamah?: Record<string, boolean>;
          periods?: Record<string, boolean>;
          preMinutes?: number;
        };
        quietHours?: { enabled?: boolean; start?: string; end?: string };
      };
      const prefs = cfg.prefs ?? {};
      const periods = prefs.periods ?? {};
      const preMinutes = Number.isFinite(prefs.preMinutes) ? Number(prefs.preMinutes) : 15;
      if (inQuiet(minutes, cfg.quietHours)) continue;

      const mosque = nameOf.get(locationId) ?? "Your mosque";

      for (const p of PRAYERS) {
        const adhanMin = toMinutes(schedule[p.adhan as keyof typeof schedule] as string | null);
        const iqamahMin = toMinutes(schedule[p.iqamah as keyof typeof schedule] as string | null);
        const adhanTxt = adhanMin != null ? to12h(String(schedule[p.adhan as keyof typeof schedule]).slice(0, 5)) : "";
        const iqamahTxt = iqamahMin != null ? to12h(String(schedule[p.iqamah as keyof typeof schedule]).slice(0, 5)) : "";
        const adhanOn = periods.adhan !== false && prefs.adhan?.[p.key] !== false;
        const iqamahOn = periods.iqamah !== false && prefs.iqamah?.[p.key] !== false;

        if (adhanMin != null && periods.preReminder !== false && adhanOn && minutes === adhanMin - preMinutes) {
          jobs.push({
            token: row.expo_push_token,
            title: `${p.label} in ${preMinutes} min`,
            body: `${mosque} — Azaan ${adhanTxt}${iqamahTxt ? ` · Jamaat ${iqamahTxt}` : ""}`,
            sendKey: `${date}:${p.key}:pre`,
            data: { type: "prayer_pre_reminder", prayer: p.key, location_id: locationId },
          });
        }
        if (adhanMin != null && adhanOn && minutes === adhanMin) {
          jobs.push({
            token: row.expo_push_token,
            title: `🕌 ${p.label} Azaan — ${adhanTxt}`,
            body: `${mosque}${iqamahTxt ? ` — Jamaat at ${iqamahTxt}` : ""}`,
            sendKey: `${date}:${p.key}:adhan`,
            data: { type: "prayer_adhan", prayer: p.key, location_id: locationId },
          });
        }
        if (iqamahMin != null && iqamahOn && minutes === iqamahMin) {
          jobs.push({
            token: row.expo_push_token,
            title: `${p.label} Jamaat — ${iqamahTxt}`,
            body: `${mosque} — the jamaat is starting now.`,
            sendKey: `${date}:${p.key}:iqamah`,
            data: { type: "prayer_iqamah", prayer: p.key, location_id: locationId },
          });
        }
      }
    }

    let sent = 0;
    const invalid: string[] = [];

    for (const job of jobs) {
      // Dedupe: the unique index makes a repeat insert fail, so we skip the send.
      const { error: dupe } = await supabase
        .from("reminder_sends")
        .insert({ token: job.token, send_key: job.sendKey });
      if (dupe) continue;

      try {
        const res = await sendFcm([job.token], job.title, job.body, job.data);
        sent += res.sent;
        invalid.push(...res.invalidTokens);
      } catch (e) {
        console.warn("reminder send failed", e instanceof Error ? e.message : e);
      }
    }

    if (invalid.length) {
      await supabase.from("push_tokens").delete().in("expo_push_token", [...new Set(invalid)]);
    }

    // Housekeeping: drop dedupe rows older than 3 days.
    await supabase
      .from("reminder_sends")
      .delete()
      .lt("created_at", new Date(Date.now() - 3 * day).toISOString());

    return json({ success: true, tokens: rows.length, candidates: jobs.length, sent });
  } catch (e) {
    console.error("prayer-reminders failed", e);
    return json({ error: e instanceof Error ? e.message : "failed" }, 500);
  }
});
