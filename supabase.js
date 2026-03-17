/**
 * Supabase Client Initialization
 * Uses the CDN-loaded supabase global from the HTML <script> tag.
 */

let supabase = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase CDN not loaded. Check your internet connection.');
    return null;
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return supabase;
}

function getSupabase() {
  if (!supabase) return initSupabase();
  return supabase;
}

// ─── Notes API ────────────────────────────────────────────

async function fetchNotes() {
  const db = getSupabase();
  const { data, error } = await db
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchNoteById(id) {
  const db = getSupabase();
  const { data, error } = await db
    .from('notes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

async function insertNote(noteData) {
  const db = getSupabase();
  const { data, error } = await db
    .from('notes')
    .insert([noteData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteNote(id) {
  const db = getSupabase();
  const { error } = await db.from('notes').delete().eq('id', id);
  if (error) throw error;
}

// ─── Storage API ──────────────────────────────────────────

async function uploadPDF(file, storagePath) {
  const db = getSupabase();
  const { data, error } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf',
    });

  if (error) throw error;
  return data;
}

async function getSignedUrl(storagePath) {
  const db = getSupabase();
  const { data, error } = await db.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (error) throw error;
  return data.signedUrl;
}

async function deleteStorageFile(storagePath) {
  const db = getSupabase();
  const { error } = await db.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);
  if (error) throw error;
}

// ─── VIP Codes API ────────────────────────────────────────

async function validateVIPCode(code) {
  const db = getSupabase();
  const { data, error } = await db
    .from('vip_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return { valid: false, reason: 'invalid' };
  if (data.is_used) return { valid: false, reason: 'used', data };
  return { valid: true, data };
}

async function markCodeAsUsed(code) {
  const db = getSupabase();
  const { error } = await db
    .from('vip_codes')
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq('code', code.toUpperCase());

  if (error) throw error;
}

async function insertVIPCodes(codes) {
  const db = getSupabase();
  const rows = codes.map(c => ({ code: c, is_used: false }));
  const { data, error } = await db
    .from('vip_codes')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}

async function fetchAllVIPCodes() {
  const db = getSupabase();
  const { data, error } = await db
    .from('vip_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─── Utility ──────────────────────────────────────────────

function generateRandomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part1 = '', part2 = '';
  for (let i = 0; i < 4; i++) part1 += chars[Math.floor(Math.random() * chars.length)];
  for (let i = 0; i < 4; i++) part2 += chars[Math.floor(Math.random() * chars.length)];
  return `BIT-${part1}-${part2}`;
}

function generateObfuscatedFilename() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let name = '';
  for (let i = 0; i < 16; i++) name += chars[Math.floor(Math.random() * chars.length)];
  return name + '.pdf';
}
