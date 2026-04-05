-- Migration: add setup_completed to settings table.
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS setup_completed boolean NOT NULL DEFAULT false;
