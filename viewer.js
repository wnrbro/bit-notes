/**
 * BIT Lecture Notes — PDF Viewer Logic
 * Handles note loading, signed URL generation, PDF.js embed,
 * and the VIP code → download flow.
 */

// ─── State ────────────────────────────────────────────────
let currentNote      = null;
let currentSignedUrl = null;
let downloadUnlocked = false;

// ─── DOM ──────────────────────────────────────────────────
const viewerLoading = document.getElementById('viewer-loading');
const viewerFrame   = document.getElementById('viewer-frame');
const noteTitleEl   = document.getElementById('viewer-note-title');
const noteMetaEl    = document.getElementById('viewer-note-meta');
const downloadBtn   = document.getElementById('btn-download');
const codeModal     = document.getElementById('code-modal');
const codeInput     = document.getElementById('vip-code-input');
const redeemBtn     = document.getElementById('btn-redeem');
const feedbackEl    = document.getElementById('modal-feedback');
const vipInfoPanel  = document.getElementById('vip-info-panel');
const toast         = document.getElementById('toast');

// ─── Init ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initSupabase();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  if (!id) {
    showError('No note specified. <a href="index.html" style="color:var(--accent-blue);">← Go back</a>');
    return;
  }

  await loadNoteViewer(id);
  setupDownloadBtn();
  setupCodeModal();
});

// ─── Load Note + PDF ──────────────────────────────────────
async function loadNoteViewer(id) {
  try {
    currentNote = await fetchNoteById(id);

    if (!currentNote) {
      showError('Note not found. <a href="index.html" style="color:var(--accent-blue);">← Go back</a>');
      return;
    }

    // Update header
    noteTitleEl.textContent = currentNote.title;
    const yearLabel = ['', '1st Year', '2nd Year', '3rd Year'][currentNote.year] || `Year ${currentNote.year}`;
    noteMetaEl.textContent = `${currentNote.subject}  ·  ${yearLabel}  ·  Semester ${currentNote.semester}`;
    document.title = `${currentNote.title} — BIT Notes`;

    // Get signed URL
    currentSignedUrl = await getSignedUrl(currentNote.storage_path);

    // Load via PDF.js hosted viewer
    const pdfJsUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(currentSignedUrl)}`;
    viewerFrame.src = pdfJsUrl;

    viewerFrame.addEventListener('load', () => {
      viewerLoading.style.display = 'none';
      viewerFrame.style.display = 'block';
    }, { once: true });

  } catch (err) {
    console.error(err);
    showError('Failed to load the PDF. Please check your connection or contact the admin.');
  }
}

function showError(msg) {
  if (viewerLoading) {
    viewerLoading.innerHTML = `
      <div style="text-align:center; padding:2rem; color:var(--accent-red);">
        <div style="font-size:2.5rem; margin-bottom:1rem;">⚠️</div>
        <p style="color:var(--text-secondary);">${msg}</p>
      </div>`;
  }
}

// ─── Download Button ──────────────────────────────────────
function setupDownloadBtn() {
  downloadBtn?.addEventListener('click', () => {
    if (downloadUnlocked) {
      triggerDownload();
    } else {
      openCodeModal();
    }
  });
}

function triggerDownload() {
  if (!currentSignedUrl) {
    showToast('Download URL expired. Please reload the page.', 'error');
    return;
  }
  const a = document.createElement('a');
  a.href = currentSignedUrl;
  a.download = (currentNote?.title || 'lecture-note').replace(/[^a-z0-9\s]/gi, '') + '.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('✅ Download started!', 'success');
}

// ─── VIP Code Modal ───────────────────────────────────────
function setupCodeModal() {
  document.getElementById('modal-close')?.addEventListener('click', closeCodeModal);

  codeModal?.addEventListener('click', e => {
    if (e.target === codeModal) closeCodeModal();
  });

  redeemBtn?.addEventListener('click', handleRedeem);

  codeInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRedeem();
  });

  document.getElementById('vip-info-toggle')?.addEventListener('click', () => {
    vipInfoPanel?.classList.toggle('visible');
  });

  // Escape closes modal
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && codeModal?.classList.contains('active')) closeCodeModal();
  });
}

function openCodeModal() {
  codeModal?.classList.add('active');
  codeInput?.focus();
}

function closeCodeModal() {
  codeModal?.classList.remove('active');
  if (codeInput) codeInput.value = '';
  setFeedback('', '');
}

// ─── Code Validation & Download ───────────────────────────
let isRedeeming = false;

async function handleRedeem() {
  if (isRedeeming) return;
  const code = codeInput?.value.trim();

  if (!code) {
    setFeedback('Please enter your VIP code.', 'error');
    return;
  }

  if (!/^BIT-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(code)) {
    setFeedback('Invalid format. Use: BIT-XXXX-XXXX', 'error');
    return;
  }

  isRedeeming = true;
  if (redeemBtn) {
    redeemBtn.disabled = true;
    redeemBtn.textContent = 'Validating…';
  }

  try {
    const result = await validateVIPCode(code);

    if (!result.valid) {
      setFeedback(
        result.reason === 'used'
          ? '❌ This code has already been used.'
          : '❌ Invalid code. Please check and try again.',
        'error'
      );
    } else {
      await markCodeAsUsed(code);

      setFeedback('✅ Code accepted! Starting download…', 'success');
      downloadUnlocked = true;

      if (downloadBtn) {
        downloadBtn.innerHTML = `<span>⬇️</span> Download PDF`;
        downloadBtn.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.1))';
        downloadBtn.style.borderColor = 'rgba(16,185,129,0.5)';
        downloadBtn.style.color = 'var(--accent-green)';
      }

      setTimeout(() => {
        closeCodeModal();
        triggerDownload();
      }, 1200);
    }
  } catch (err) {
    console.error('Redeem error:', err);
    setFeedback('❌ An error occurred. Please try again.', 'error');
  } finally {
    isRedeeming = false;
    if (redeemBtn) {
      redeemBtn.disabled = false;
      redeemBtn.textContent = 'Unlock Download';
    }
  }
}

// ─── Utilities ────────────────────────────────────────────
function setFeedback(msg, type) {
  if (!feedbackEl) return;
  feedbackEl.textContent = msg;
  feedbackEl.className = `modal-feedback ${type}`;
  feedbackEl.style.display = msg ? 'flex' : 'none';
}

function showToast(msg, type = 'info', duration = 3500) {
  if (!toast) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${msg}`;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}
