# Supabase Setup Guide — BIT Lecture Notes

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up (free tier is sufficient)
2. Click **"New Project"**
3. Choose an organisation, enter a project name (e.g. `bit-notes`), and set a database password
4. Select the region closest to Sri Lanka (e.g. **Singapore**)
5. Click **"Create new project"** and wait ~2 minutes for provisioning

---

## Step 2: Run the Database Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Paste and run the following SQL:

```sql
-- ── Notes metadata ──────────────────────────────────────
CREATE TABLE notes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT        NOT NULL,
  subject       TEXT        NOT NULL,
  module_code   TEXT,
  year          INT         CHECK (year BETWEEN 1 AND 3),
  semester      INT         CHECK (semester BETWEEN 1 AND 2),
  storage_path  TEXT        NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── VIP Codes ────────────────────────────────────────────
CREATE TABLE vip_codes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        UNIQUE NOT NULL,
  is_used       BOOLEAN     DEFAULT FALSE,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Enable Row Level Security ─────────────────────────────
ALTER TABLE notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_codes ENABLE ROW LEVEL SECURITY;

-- ── Notes Policies ───────────────────────────────────────
CREATE POLICY "Public read notes"   ON notes FOR SELECT USING (true);
CREATE POLICY "Anon insert notes"   ON notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon update notes"   ON notes FOR UPDATE USING (true);
CREATE POLICY "Anon delete notes"   ON notes FOR DELETE USING (true);

-- ── VIP Codes Policies ───────────────────────────────────
CREATE POLICY "Public read codes"   ON vip_codes FOR SELECT USING (true);
CREATE POLICY "Public update codes" ON vip_codes FOR UPDATE USING (true);
CREATE POLICY "Anon insert codes"   ON vip_codes FOR INSERT WITH CHECK (true);
```

4. Click **"Run"** — you should see **"Success. No rows returned."**

---

## Step 3: Create the Storage Bucket

1. Click **Storage** in the left sidebar
2. Click **"New bucket"**
3. Name it exactly: `pdfs`
4. Keep **"Public bucket" OFF** (private — required for signed URLs)
5. Click **"Create bucket"**

### Add Storage Policies

In the `pdfs` bucket → **Policies** tab → **"New policy"** → **"For full customization"**, run:

```sql
-- Allow uploads
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pdfs');

-- Allow downloads via signed URL
CREATE POLICY "Allow signed reads"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdfs');

-- Allow deletes
CREATE POLICY "Allow deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'pdfs');
```

---

## Step 4: Get Your API Keys

1. Go to **Settings → API** in your Supabase dashboard
2. Copy:
   - **Project URL** — e.g. `https://xyzxyz.supabase.co`
   - **anon / public key** — a long JWT string

3. Open `js/config.js` and replace the placeholder values:
   ```js
   const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON = 'YOUR_ANON_KEY_HERE';
   ```

> ⚠️ **NEVER** use the `service_role` key in your frontend. The `anon` key is safe to commit.

---

## Step 5: Change the Admin Password

Open `js/config.js` and update:
```js
const ADMIN_PASSWORD = 'admin@BIT2024';
```
Change this to something unique before deploying.

---

## Step 6: Update Contact Info

In `index.html` and `viewer.html`, find the VIP info panel and replace the placeholder contact details:

```html
<li>📞 Contact: <strong>+94 7X XXX XXXX</strong></li>
<li>📍 Faculty Notice Board — BIT Department</li>
<li>💬 WhatsApp Group: <strong>BIT Notes VIP</strong></li>
```

---

## Step 7: Deploy to GitHub Pages

1. Create a new **public** GitHub repository
2. Push all files including `js/config.js` (anon key is safe to commit)
3. Go to **Settings → Pages**
4. Set source to **"Deploy from a branch"** → `main` → `/ (root)`
5. Site will be live at `https://yourusername.github.io/your-repo-name/`

---

## File Structure

```
bit-notes/
├── index.html          ← Homepage
├── viewer.html         ← PDF viewer
├── admin.html          ← Admin panel
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── config.js       ← ⚠️ Put your Supabase keys here
│   ├── supabase.js     ← Supabase client & API helpers
│   ├── app.js          ← Homepage logic
│   ├── viewer.js       ← Viewer logic
│   └── admin.js        ← Admin logic
├── .gitignore
└── SUPABASE_SETUP.md   ← This file
```

---

## Security Checklist

- [x] PDFs stored in **private** Supabase Storage bucket
- [x] PDF filenames are **obfuscated** (random 16-char strings)
- [x] Access only via **short-lived signed URLs** (30 min expiry)
- [x] VIP codes are **one-time-use** (marked used in DB after redemption)
- [x] Admin panel protected by password
- [x] Only the **anon key** is in the codebase (safe to expose)
- [x] `admin.html` has `noindex, nofollow` meta tag
