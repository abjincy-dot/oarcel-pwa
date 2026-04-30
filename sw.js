// ==================== FIXED MOBILE-FIRST PDF MANAGER ====================

// Detect mobile device
function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

// Open PDF properly (NO iframe for mobile)
function openPdf(link) {
  if (!link) return;

  let fileIdMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  let directUrl = link;

  if (fileIdMatch && fileIdMatch[1]) {
    const id = fileIdMatch[1];
    // Direct lightweight URL instead of heavy preview
    directUrl = `https://drive.google.com/uc?export=download&id=${id}`;
  }

  // MOBILE: open in native viewer
  if (isMobile()) {
    window.open(directUrl, '_blank');
    return;
  }

  // DESKTOP: safe iframe usage
  const viewer = document.getElementById("viewerWrapper");
  const iframe = document.getElementById("pdfIframe");

  iframe.src = directUrl;
  viewer.style.display = "block";
}

// Close viewer
function closeViewer() {
  const viewer = document.getElementById("viewerWrapper");
  const iframe = document.getElementById("pdfIframe");

  iframe.src = "about:blank";
  viewer.style.display = "none";
}

// Render files (simplified + faster)
function renderFiles(fileList) {
  const container = document.getElementById("content");
  container.innerHTML = "";

  fileList.forEach(file => {
    const div = document.createElement("div");
    div.className = "card pdf-card";

    div.innerHTML = `
      <div class="card-icon"><i class="fas fa-file-pdf"></i></div>
      <div class="card-title">${file.name}</div>
    `;

    div.onclick = () => openPdf(file.link);

    container.appendChild(div);
  });
}

// Example usage (plug your data here)
const files = [
  {
    name: "Sample PDF",
    link: "https://drive.google.com/file/d/1eQ4v4vf_k4Bz0Dhbv6APR6IeUqI0pDsk/preview"
  }
];

// Init
renderFiles(files);

// Event
const closeBtn = document.getElementById("closeViewerBtn");
if (closeBtn) closeBtn.onclick = closeViewer;
