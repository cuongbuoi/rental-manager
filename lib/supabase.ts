import { createClient } from '@supabase/supabase-js';

// NOTE: In a real environment, these would come from process.env
// For this demo, we will check if they exist.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl && supabaseKey;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// SQL Schema for users to run in their Supabase SQL Editor:
/*
-- Create Pricing Table
create table pricing_configs (
  id uuid default gen_random_uuid() primary key,
  effective_date date not null,
  electricity_price numeric not null,
  water_price numeric not null,
  base_rent numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Records Table
create table rental_records (
  id uuid default gen_random_uuid() primary key,
  record_date date not null,
  electricity_index numeric not null,
  water_index numeric not null,
  is_electricity_reset boolean default false,
  is_water_reset boolean default false,
  is_paid boolean default false,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- IF YOU ALREADY HAVE THE TABLE, RUN THESE COMMANDS TO UPDATE:
-- alter table rental_records add column is_electricity_reset boolean default false;
-- alter table rental_records add column is_water_reset boolean default false;
-- alter table rental_records add column is_paid boolean default false;
*/