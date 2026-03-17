/**
 * BIT Lecture Notes — Supabase Configuration
 * ─────────────────────────────────────────────
 * 1. Go to https://supabase.com and create a free project.
 * 2. In your project dashboard → Settings → API
 * 3. Copy "Project URL" and "anon / public" key below.
 * 4. See SUPABASE_SETUP.md for full setup instructions.
 *
 * ⚠️  SAFE TO COMMIT: The anon key is designed to be public.
 *    Row Level Security (RLS) policies protect your data.
 *    NEVER paste your service_role key here.
 */

const SUPABASE_URL  = 'https://kxdytjuvvphmdiycbqcb.supabase.co';
const SUPABASE_ANON = '42d04438-37e2-468f-a71d-223072b3b1cb';

/**
 * Admin Panel Password
 * ─────────────────────
 * Change this to something unique before deploying.
 * This is a lightweight gate — upgrade to Supabase Auth for production.
 */
const ADMIN_PASSWORD = 'admin@BIT2024';

/**
 * Storage bucket name (must match what you create in Supabase Storage)
 */
const STORAGE_BUCKET = 'pdfs';

/**
 * Signed URL expiry in seconds (30 minutes)
 * Users will need to reload the viewer after this time.
 */
const SIGNED_URL_EXPIRY = 1800;
