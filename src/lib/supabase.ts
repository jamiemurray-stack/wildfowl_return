import { createClient } from '@supabase/supabase-js'

// Public, RLS-protected credentials for the Grange & District Wildfowlers
// Supabase project. A Supabase "publishable" key is designed to live in the
// browser bundle — data is protected by Row Level Security on the database,
// not by hiding this value. Override via env vars if you fork this app.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://kndezixrxsqxundgrnmj.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'sb_publishable_jQHuVmfKV90BtuQftDS3Ew_6qZsYrf1'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})
