-- Migration 003: add dedicated checkin reminder columns to settings
-- These mirror the values stored in the notifications JSONB blob for
-- easier querying and future push-notification scheduling.
--
-- Safe to run multiple times (IF NOT EXISTS / idempotent).

-- Also backfills setup_completed from migration 002 in case that was skipped.
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS setup_completed          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkin_reminder_enabled boolean,
  ADD COLUMN IF NOT EXISTS checkin_reminder_time    text;
