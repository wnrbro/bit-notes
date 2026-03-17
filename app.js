/**
 * BIT Lecture Notes — Homepage Logic
 * Handles note fetching, rendering, filtering, and searching.
 */

// ─── State ────────────────────────────────────────────────
let allNotes = [];
let activeYear = 'all';
let activeSemester = 'all';
let searchQuery = '';

// ─── DOM References ───────────────────────────────────────
const notesGrid       = document.getElementById('notes-grid');
const resultCount     = document.getElementById('result-count');
const searchInput     = document.getElementById('search-input');
const yearPills       = document.querySelectorAll('.pill[data-year]');
const semesterPills   = document.querySelectorAll('.pill[data-sem]');
const codeModal       = document.getElementById('code-modal');
const vipInfoPanel    = document.getElementById('vip-info-panel');
const toast           = document.getElementById('toast');

// ─── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();
  await loadNotes();
  setupFilters();
  setupSearch();
  setupModal();
});

// ─── Load & Render Notes ─────────────────────────────────
async function loadNotes() {
  renderSkeletons();
  try {
    allNotes = await fetchNotes();
    // Update stats counter
    const statEl = document.getElementById('stat-notes');
    if (statEl) statEl.textContent = allNotes.length;
    renderNotes();
  } catch (err) {
    console.error('Failed to fetch notes:', err);
    notesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load notes</h3>
        <p>Please configure your Supabase credentials in <code>js/config.js</code></p>
      </div>`;
    if (resultCount) resultCount.textContent = '0 notes found';
  }
}

function renderSkeletons() {
  notesGrid.innerHTML = Array(6).fill(0).map(() => `
    <div class="note-card" style="pointer-events:none; animation:none;">
      <div class="card-thumb skeleton" style="height:130px; border-radius:0;"></div>
      <div class="card-body" style="gap:0.75rem;">
        <div class="skeleton" style="height:10px; width:55%; border-radius:4px;"></div>
        <div class="skeleton" style="height:15px; width:88%; border-radius:4px;"></div>
        <div class="skeleton" style="height:10px; width:45%; border-radius:4px;"></div>
      </div>
      <div class="card-footer" style="gap:0.5rem;">
        <div class="skeleton" style="height:30px; width:120px; border-radius:8px;"></div>
      </div>
    </div>`).join('');
}

function getFilteredNotes() {
  return allNotes.filter(note => {
    const matchYear = activeYear === 'all' || note.year == activeYear;
    const matchSem  = activeSemester === 'all' || note.semester == activeSemester;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      note.title.toLowerCase().includes(q) ||
      note.subject.toLowerCase().includes(q) ||
      (note.module_code && note.module_code.toLowerCase().includes(q));
    return matchYear && matchSem && matchSearch;
  });
}

function renderNotes() {
  const filtered = getFilteredNotes();
  if (resultCount) resultCount.textContent = `${filtered.length} note${filtered.length !== 1 ? 's' : ''} found`;

  if (filtered.length === 0) {
    notesGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No notes found</h3>
        <p>Try adjusting your filters or search query.</p>
      </div>`;
    return;
  }

  notesGrid.innerHTML = filtered.map(note => renderCard(note)).join('');
}

function renderCard(note) {
  const yearLabel = ['', '1st Year', '2nd Year', '3rd Year'][note.year] || `Year ${note.year}`;
  const semLabel  = `Sem ${note.semester}`;
  const icons     = ['📘', '📗', '📙', '📕', '📓', '📔'];
  const icon      = icons[Math.abs(note.title.charCodeAt(0)) % icons.length];

  return `
    <div class="note-card" onclick="openViewer('${note.id}')" role="button" tabindex="0"
         onkeydown="if(event.key==='Enter') openViewer('${note.id}')">
      <div class="card-thumb">
        <span class="card-thumb-icon">${icon}</span>
        <span class="card-year-badge">${yearLabel} · ${semLabel}</span>
      </div>
      <div class="card-body">
        ${note.module_code ? `<div class="card-module">${escapeHtml(note.module_code)}</div>` : ''}
        <div class="card-title">${escapeHtml(note.title)}</div>
        <div class="card-meta">
          <span class="card-tag">📚 ${escapeHtml(note.subject)}</span>
          <span class="card-tag">📅 ${yearLabel}</span>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn-view" onclick="event.stopPropagation(); openViewer('${note.id}')">
          👁️ View Notes
        </button>
        <span class="vip-badge">⭐ VIP</span>
      </div>
    </div>`;
}

function openViewer(id) {
  window.location.href = `viewer.html?id=${id}`;
}

// ─── Filters ──────────────────────────────────────────────
function setupFilters() {
  yearPills.forEach(pill => {
    pill.addEventListener('click', () => {
      yearPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeYear = pill.dataset.year;
      renderNotes();
    });
  });

  semesterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      semesterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeSemester = pill.dataset.sem;
      renderNotes();
    });
  });
}

// ─── Search ───────────────────────────────────────────────
function setupSearch() {
  if (!searchInput) return;
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim();
      renderNotes();
    }, 200);
  });
}

// ─── VIP Code Modal ───────────────────────────────────────
function setupModal() {
  document.getElementById('nav-vip-btn')?.addEventListener('click', openCodeModal);
  document.getElementById('modal-close')?.addEventListener('click', closeCodeModal);
  codeModal?.addEventListener('click', e => {
    if (e.target === codeModal) closeCodeModal();
  });
  document.getElementById('vip-info-toggle')?.addEventListener('click', () => {
    vipInfoPanel?.classList.toggle('visible');
  });

  // Keyboard: Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && codeModal?.classList.contains('active')) closeCodeModal();
  });
}

function openCodeModal() {
  codeModal?.classList.add('active');
  document.getElementById('vip-code-input')?.focus();
}

function closeCodeModal() {
  codeModal?.classList.remove('active');
  const inp = document.getElementById('vip-code-input');
  if (inp) inp.value = '';
  setFeedback('', '');
}

// ─── VIP Redeem (validate only on homepage) ───────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-redeem')?.addEventListener('click', async () => {
    const code = document.getElementById('vip-code-input')?.value.trim();
    if (!code) { setFeedback('Please enter your code.', 'error'); return; }
    if (!/^BIT-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) {
      setFeedback('Invalid format. Use: BIT-XXXX-XXXX', 'error'); return;
    }
    const btn = document.getElementById('btn-redeem');
    btn.disabled = true;
    btn.textContent = 'Validating…';
    try {
      const r = await validateVIPCode(code);
      if (!r.valid) {
        setFeedback(r.reason === 'used' ? '❌ Code already used.' : '❌ Invalid code.', 'error');
      } else {
        setFeedback('✅ Valid! Open a note and click Download to redeem.', 'success');
      }
    } catch {
      setFeedback('❌ Error checking code. Configure Supabase first.', 'error');
    }
    btn.disabled = false;
    btn.textContent = 'Unlock Download';
  });

  document.getElementById('vip-code-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-redeem')?.click();
  });
});

// ─── Toast ────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 3500) {
  if (!toast) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

function setFeedback(msg, type) {
  const el = document.getElementById('modal-feedback');
  if (!el) return;
  el.textContent = msg;
  el.className = `modal-feedback ${type}`;
  el.style.display = msg ? 'flex' : 'none';
}

// ─── Utility ──────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
