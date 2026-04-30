// ==================== OARCEL PWA v2 (PRODUCTION-READY ARCHITECTURE) ====================

// ---------------- DEVICE DETECTION ----------------
function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// ---------------- DATA LAYER (SCALABLE) ----------------
let FILES = [];

async function loadFiles() {
  try {
    const res = await fetch('files.json');
    FILES = await res.json();
    renderFiles(FILES);
  } catch (e) {
    showError('Failed to load documents');
  }
}

// ---------------- PDF HANDLING ----------------
function getDirectLink(link) {
  const match = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return link;
}

function openPdf(link) {
  if (!link) return;

  const url = getDirectLink(link);

  showLoading(true);

  if (isMobile()) {
    window.open(url, '_blank');
    showLoading(false);
    return;
  }

  const iframe = document.getElementById('pdfIframe');
  const viewer = document.getElementById('viewerWrapper');

  iframe.onload = () => showLoading(false);
  iframe.onerror = () => showError('Failed to load PDF');

  iframe.src = url;
  viewer.style.display = 'block';
}

function closeViewer() {
  const iframe = document.getElementById('pdfIframe');
  const viewer = document.getElementById('viewerWrapper');

  iframe.src = 'about:blank';
  viewer.style.display = 'none';
}

// ---------------- UI: RENDER ----------------
function renderFiles(list) {
  const container = document.getElementById('content');
  container.innerHTML = '';

  if (!list.length) {
    container.innerHTML = `<div class="empty">No documents found</div>`;
    return;
  }

  list.forEach(file => {
    const card = document.createElement('div');
    card.className = 'card';

    card.innerHTML = `
      <div class="icon">📄</div>
      <div class="title">${file.name}</div>
      <div class="category">${file.category || ''}</div>
    `;

    card.onclick = () => openPdf(file.link);

    container.appendChild(card);
  });
}

// ---------------- SEARCH (FAST INDEXED) ----------------
function setupSearch() {
  const input = document.getElementById('search');

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();

    const filtered = FILES.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.category && f.category.toLowerCase().includes(q))
    );

    renderFiles(filtered);
  });
}

// ---------------- LOADING + ERROR ----------------
function showLoading(state) {
  let loader = document.getElementById('loader');

  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loader';
    loader.innerText = 'Loading...';
    loader.style.position = 'fixed';
    loader.style.top = '50%';
    loader.style.left = '50%';
    loader.style.transform = 'translate(-50%, -50%)';
    loader.style.background = '#000';
    loader.style.color = '#fff';
    loader.style.padding = '10px 20px';
    loader.style.borderRadius = '8px';
    loader.style.zIndex = '9999';
    document.body.appendChild(loader);
  }

  loader.style.display = state ? 'block' : 'none';
}

function showError(msg) {
  alert(msg);
}

// ---------------- MOBILE OPTIMIZATION ----------------
function optimizeMobile() {
  if (!isMobile()) return;

  const bg = document.querySelector('.animated-bg');
  if (bg) bg.remove();
}

// ---------------- OFFLINE (SERVICE WORKER) ----------------
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ---------------- INIT ----------------
document.addEventListener('DOMContentLoaded', () => {
  optimizeMobile();
  setupSearch();
  loadFiles();

  const closeBtn = document.getElementById('closeViewerBtn');
  if (closeBtn) closeBtn.onclick = closeViewer;
});

// ==================== FILES.JSON FORMAT ====================
/*
[
  {
    "name": "Burner Guide",
    "category": "Maintenance",
    "link": "https://drive.google.com/file/d/XXXX/preview"
  }
]
*/

// ==================== SERVICE WORKER (sw.js) ====================
/*
self.addEventListener('install', e => self.skipWaiting());

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
*/
