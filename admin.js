/**
 * BIT Lecture Notes — Admin Panel Logic
 * Handles password gate, PDF upload, VIP code generation, and management.
 */

// ─── DOM ──────────────────────────────────────────────────
const loginWrap    = document.getElementById('login-wrap');
const adminPanel   = document.getElementById('admin-panel');
const pwInput      = document.getElementById('admin-password');
const loginBtn     = document.getElementById('btn-login');
const loginErr     = document.getElementById('login-error');
const toast        = document.getElementById('toast');

// Upload form
const uploadForm     = document.getElementById('upload-form');
const fileInput      = document.getElementById('pdf-file');
const fileNameEl     = document.getElementById('file-name-display');
const uploadProgress = document.getElementById('upload-progress');
const progressFill   = document.getElementById('progress-fill');
const progressLabel  = document.getElementById('progress-label');
const uploadFeedback = document.getElementById('upload-feedback');
const btnUpload      = document.getElementById('btn-upload');

// Code generation
const codeCountInput = document.getElementById('code-count');
const btnGenerate    = document.getElementById('btn-generate');
const codesOutput    = document.getElementById('codes-output');

// Notes list
const notesAdminList = document.getElementById('notes-admin-list');

// ─── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  setupLoginGate();
  setupFileInput();
  setupUpload();
  setupCodeGeneration();
});

// ─── Login Gate ───────────────────────────────────────────
function setupLoginGate() {
  loginBtn?.addEventListener('click', attemptLogin);
  pwInput?.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });
}

function attemptLogin() {
  const pw = pwInput.value;
  if (pw === ADMIN_PASSWORD) {
    loginWrap.style.display = 'none';
    adminPanel.classList.add('visible');
    loadAdminData();
  } else {
    if (loginErr) loginErr.textContent = '❌ Incorrect password. Please try again.';
    pwInput.value = '';
    pwInput.focus();
  }
}

// ─── Load Admin Data ──────────────────────────────────────
async function loadAdminData() {
  await Promise.all([loadNotesList(), loadCodesList()]);
}

async function loadNotesList() {
  if (!notesAdminList) return;
  notesAdminList.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">Loading…</div>`;
  try {
    const notes = await fetchNotes();
    if (notes.length === 0) {
      notesAdminList.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">No notes uploaded yet.</div>`;
      return;
    }
    const icons = ['📘', '📗', '📙', '📕', '📓', '📔'];
    notesAdminList.innerHTML = notes.map(note => {
      const icon = icons[Math.abs(note.title.charCodeAt(0)) % icons.length];
      const yearLabel = ['', '1st Year', '2nd Year', '3rd Year'][note.year] || `Year ${note.year}`;
      const date = new Date(note.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return `
        <div class="note-admin-item" id="note-item-${note.id}">
          <span class="note-admin-icon">${icon}</span>
          <div class="note-admin-info">
            <h4>${escapeHtml(note.title)}</h4>
            <p>${escapeHtml(note.subject)} · ${yearLabel} · Sem ${note.semester}${note.module_code ? ' · ' + escapeHtml(note.module_code) : ''} · ${date}</p>
          </div>
          <button class="btn-icon-del" onclick="handleDeleteNote('${note.id}', '${escapeHtml(note.storage_path)}')" title="Delete note">🗑️</button>
        </div>`;
    }).join('');
  } catch (err) {
    notesAdminList.innerHTML = `<div style="color:var(--accent-red);font-size:0.85rem;">Failed to load notes. Configure Supabase first.</div>`;
  }
}

async function loadCodesList() {
  if (!codesOutput) return;
  codesOutput.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">Loading…</div>`;
  try {
    const codes = await fetchAllVIPCodes();
    renderCodesList(codes);
  } catch (err) {
    codesOutput.innerHTML = `<div style="color:var(--accent-red);font-size:0.85rem;">Failed to load codes. Configure Supabase first.</div>`;
  }
}

function renderCodesList(codes) {
  if (!codesOutput) return;
  if (codes.length === 0) {
    codesOutput.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">No codes generated yet.</div>`;
    return;
  }
  codesOutput.innerHTML = codes.slice(0, 50).map(c => `
    <div class="code-item">
      <span class="code-text">${c.code}</span>
      <span class="code-status ${c.is_used ? 'used' : 'unused'}">${c.is_used ? 'Used' : 'Active'}</span>
      <button class="copy-btn" onclick="copyToClipboard('${c.code}')" title="Copy code">📋</button>
    </div>`).join('');
  if (codes.length > 50) {
    codesOutput.innerHTML += `<div style="color:var(--text-muted);font-size:0.78rem;padding:0.4rem;text-align:center;">Showing 50 of ${codes.length} codes</div>`;
  }
}

// ─── File Input Display ───────────────────────────────────
function setupFileInput() {
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (fileNameEl) fileNameEl.textContent = file ? `📎 ${file.name}` : '';
  });
}

// ─── PDF Upload ───────────────────────────────────────────
function setupUpload() {
  uploadForm?.addEventListener('submit', async e => {
    e.preventDefault();
    await handleUpload();
  });
}

async function handleUpload() {
  const title      = document.getElementById('note-title').value.trim();
  const subject    = document.getElementById('note-subject').value.trim();
  const moduleCode = document.getElementById('note-module').value.trim();
  const year       = parseInt(document.getElementById('note-year').value);
  const semester   = parseInt(document.getElementById('note-semester').value);
  const file       = fileInput.files[0];

  if (!title || !subject || !year || !semester || !file) {
    setUploadFeedback('Please fill in all required fields and select a PDF.', 'error');
    return;
  }

  if (file.type !== 'application/pdf') {
    setUploadFeedback('Please select a valid PDF file.', 'error');
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    setUploadFeedback('File size exceeds the 50 MB limit.', 'error');
    return;
  }

  if (btnUpload) { btnUpload.disabled = true; btnUpload.textContent = 'Uploading…'; }
  if (uploadProgress) uploadProgress.classList.add('visible');
  setUploadFeedback('', '');

  const filename    = generateObfuscatedFilename();
  const storagePath = `notes/${filename}`;

  try {
    animateProgress(0, 60, 1200);
    await uploadPDF(file, storagePath);
    animateProgress(60, 90, 400);

    await insertNote({ title, subject, module_code: moduleCode || null, year, semester, storage_path: storagePath });
    animateProgress(90, 100, 200);

    setTimeout(() => {
      if (uploadProgress) uploadProgress.classList.remove('visible');
      setUploadFeedback('✅ Note uploaded successfully!', 'success');
      uploadForm.reset();
      if (fileNameEl) fileNameEl.textContent = '';
      if (progressFill) progressFill.style.width = '0%';
      if (btnUpload) { btnUpload.disabled = false; btnUpload.textContent = '📤 Upload Note'; }
      loadNotesList();
      showToast('✅ Note uploaded!', 'success');
    }, 700);

  } catch (err) {
    console.error('Upload error:', err);
    setUploadFeedback(`❌ Upload failed: ${err.message || 'Unknown error'}`, 'error');
    if (uploadProgress) uploadProgress.classList.remove('visible');
    if (progressFill) progressFill.style.width = '0%';
    if (btnUpload) { btnUpload.disabled = false; btnUpload.textContent = '📤 Upload Note'; }
  }
}

function animateProgress(from, to, duration) {
  const start = Date.now();
  const step = () => {
    const elapsed = Date.now() - start;
    const p = Math.min(from + (to - from) * (elapsed / duration), to);
    if (progressFill) progressFill.style.width = `${p}%`;
    if (progressLabel) progressLabel.textContent = `${Math.round(p)}%`;
    if (p < to) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function setUploadFeedback(msg, type) {
  if (!uploadFeedback) return;
  uploadFeedback.textContent = msg;
  uploadFeedback.className = `modal-feedback ${type}`;
  uploadFeedback.style.display = msg ? 'flex' : 'none';
}

// ─── Delete Note ──────────────────────────────────────────
async function handleDeleteNote(id, storagePath) {
  if (!confirm('Delete this note? This will also remove the PDF from storage.')) return;
  try {
    await deleteNote(id);
    try { await deleteStorageFile(storagePath); } catch (e) { /* ignore storage errors */ }
    document.getElementById(`note-item-${id}`)?.remove();
    showToast('Note deleted.', 'info');
  } catch (err) {
    showToast('Failed to delete note.', 'error');
  }
}

// ─── VIP Code Generation ──────────────────────────────────
function setupCodeGeneration() {
  btnGenerate?.addEventListener('click', handleGenerateCodes);
}

async function handleGenerateCodes() {
  const count = parseInt(codeCountInput?.value) || 10;
  if (count < 1 || count > 100) {
    showToast('Enter a number between 1 and 100.', 'error');
    return;
  }

  if (btnGenerate) { btnGenerate.disabled = true; btnGenerate.textContent = 'Generating…'; }

  try {
    const codes = [];
    for (let i = 0; i < count; i++) codes.push(generateRandomCode());
    await insertVIPCodes(codes);
    showToast(`✅ ${count} VIP code${count > 1 ? 's' : ''} generated!`, 'success');
    await loadCodesList();
  } catch (err) {
    console.error(err);
    showToast('Failed to generate codes. Check Supabase config.', 'error');
  } finally {
    if (btnGenerate) { btnGenerate.disabled = false; btnGenerate.textContent = '⚡ Generate Codes'; }
  }
}

// ─── Utilities ────────────────────────────────────────────
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied: ${text}`, 'success', 2000);
  } catch {
    showToast('Copy failed. Please copy manually.', 'error');
  }
}

function showToast(msg, type = 'info', duration = 3500) {
  if (!toast) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
