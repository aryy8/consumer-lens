-- =============================================================================
-- CONSUMER LENS: SUPABASE DATABASE INITIALIZATION SCHEMA
-- Run this entire script in Supabase SQL Editor (SQL Editor -> New query -> Run)
-- =============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'inspector' | 'supervisor' | 'admin'
  district TEXT NOT NULL,
  state TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. INSPECTIONS TABLE (Includes multi-image JSONB support)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'compliant' | 'non-compliant' | 'pending'
  date DATE NOT NULL,
  state TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  inspector_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL, -- 'image' | 'url'
  image TEXT, -- primary image URL or base64 data URL
  images JSONB DEFAULT '[]'::jsonb, -- array of all product packaging photos
  product_link TEXT,
  notes TEXT NOT NULL DEFAULT '',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. REPORTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  inspector TEXT NOT NULL,
  date DATE NOT NULL,
  score INTEGER NOT NULL,
  status TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inspections_date ON inspections(date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_state ON inspections(state);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_reports_inspection_id ON reports(inspection_id);

-- -----------------------------------------------------------------------------
-- 5. SEED INITIAL USERS (Password for all accounts is: demo)
-- -----------------------------------------------------------------------------
INSERT INTO users (employee_id, name, role, district, state, password_hash, active)
VALUES 
  ('ADM001', 'Anjali Sharma', 'admin', 'New Delhi', 'Delhi', '$2b$10$DolTBa0P8S20CFyDJbsvSOXjrofZyY80dYLZoeaxrnrCa1CHf8L.e', true),
  ('SUP001', 'Vikram Menon', 'supervisor', 'Pune', 'Maharashtra', '$2b$10$DolTBa0P8S20CFyDJbsvSOXjrofZyY80dYLZoeaxrnrCa1CHf8L.e', true),
  ('INS001', 'Rajesh Kumar', 'inspector', 'Pune', 'Maharashtra', '$2b$10$DolTBa0P8S20CFyDJbsvSOXjrofZyY80dYLZoeaxrnrCa1CHf8L.e', true),
  ('INS002', 'Priya Nair', 'inspector', 'Ernakulam', 'Kerala', '$2b$10$DolTBa0P8S20CFyDJbsvSOXjrofZyY80dYLZoeaxrnrCa1CHf8L.e', true),
  ('INS003', 'Amit Deshmukh', 'inspector', 'Nagpur', 'Maharashtra', '$2b$10$DolTBa0P8S20CFyDJbsvSOXjrofZyY80dYLZoeaxrnrCa1CHf8L.e', true),
  ('INS004', 'Sunita Rao', 'inspector', 'Bengaluru Urban', 'Karnataka', '$2b$10$DolTBa0P8S20CFyDJbsvSOXjrofZyY80dYLZoeaxrnrCa1CHf8L.e', true)
ON CONFLICT (employee_id) DO NOTHING;
