-- ============================================================================
-- MIGRATION 16: Super Admin Pause/Delete + Realtime Sync
-- Date: 2026-02-23
-- For: Supabase-based mosque pause, delete, and realtime sync
-- ============================================================================

-- 1. Add is_paused column to locations (replaces localStorage-based hide/pause)
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS is_paused boolean DEFAULT false;

-- 2. Enable Supabase Realtime on locations and prayer_times tables
-- This allows the app to receive live updates when data changes.
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.prayer_times;
