-- ============================================================
-- Migration 004 — extend training_logs to absorb diary_workouts
-- Run in Supabase SQL Editor before deploying this app version.
-- Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS).
-- ============================================================

ALTER TABLE public.training_logs
  ADD COLUMN IF NOT EXISTS completed    boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reflection   text;
