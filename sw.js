// ==================== OARCEL PDF MANAGER APPLICATION ====================

// Industrial Data Model with expanded subfolders
const fileSystem = {
  "✨ REMELT": {
    "🔥 Burner Systems": {
      "Gas Burners": [
        "https://drive.google.com/file/d/1eQ4v4vf_k4Bz0Dhbv6APR6IeUqI0pDsk/preview"
      ],
      "Oil Burners": [
        "https://drive.google.com/file/d/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1uV/preview"
      ],
      "Burner Controls": [],
      "Flame Monitoring": []
    },
    "❄️ Cooling Systems": {
      "Water Cooling": [
        "https://drive.google.com/file/d/1xY2zA3bC4dE5fG6hI7jK8lM9nO0pQ1rS/preview"
      ],
      "Air Cooling": [],
      "Heat Exchangers": [],
      "Cooling Towers": []
    },
    "🔧 Maintenance": {
      "Preventive Maintenance": [
        "https://drive.google.com/file/d/1Z9yX8wV7uT6sR5qP4oN3mL2kJ1hG0fD/preview"
      ],
      "Predictive Maintenance": [],
      "Repair Logs": [],
      "Spare Parts": []
    },
    "⚠️ Safety": {
      "Safety Protocols": [],
      "Emergency Shutdown": [],
      "PPE Requirements": [],
      "Hazard Analysis": []
    },
    "📊 Operations": {
      "Daily Reports": [],
      "Production Logs": [],
      "Efficiency Reports": [],
      "Downtime Analysis": []
    },
    "🔬 Quality Control": {
      "Material Testing": [],
      "Chemical Analysis": [],
      "Temperature Logs": [],
      "Defect Analysis": []
    },
    "📈 Performance": {
      "KPI Tracking": [],
      "Energy Consumption": [],
      "Optimization Reports": [],
      "Benchmarking": []
    },
    "🛠️ Equipment": {
      "Furnace Specs": [],
      "Instrumentation": [],
      "Calibration Records": [],
      "Equipment Manuals": []
    },
    "📚 Training": {
      "Operator Training": [],
      "Safety Training": [],
      "Technical Guides": [],
      "SOP Documents": []
    },
    "📜 Documentation": {
      "Technical Drawings": [],
      "P&ID Diagrams": [],
      "Electrical Schematics": [],
      "Certifications": []
    }
  },
  "⚙️ CASTER": {
    "⚡ Motor Specs": [
      "https://drive.google.com/file/d/1MotorGuide2024_ABC123XYZ/preview"
    ],
    "🔩 Gearbox Maintenance": [
      "https://drive.google.com/file/d/1GearPro_Manual_88x2/preview",
      "https://drive.google.com/file/d/1LubricationGuide_Rolling/preview"
    ],
    "📊 Calibration Reports": [],
    "🔧 Hydraulic Systems": [],
    "❄️ Cooling Systems": [],
    "📈 Production Reports": []
  },
  "✅ HRM": {
    "📋 Inspection Checklists": [
      "https://drive.google.com/file/d/1QC_Checklist_SteelMill_v2/preview",
      "https://drive.google.com/file/d/1NDT_Ultrasonic_Testing/preview"
    ],
    "🏆 Certifications": [
      "https://drive.google.com/file/d/1ISO9001_Cert_2025/preview"
    ],
    "📊 Quality Reports": [],
    "🔬 Testing Procedures": [],
    "📈 Statistical Analysis": []
  },
  "💡 CRM": {
    "💻 PLC Schematics": [
      "https://drive.google.com/file/d/1PLC_Siemens_S7_Diagram/preview"
    ],
    "⚡ Motor Control Centers": [],
    "📐 CAD Drawings": [
      "https://drive.google.com/file/d/1CAD_Drawing_Mill_v2/preview"
    ],
    "🔌 Electrical Panels": [],
    "📡 SCADA Systems": [],
    "🔧 Automation Guides": []
  },
  "🛡️ ANEALING": {
    "🧪 Chemical Handling": [
      "https://drive.google.com/file/d/1SDS_Chemical_Safety_2024/preview"
    ],
    "🚨 Emergency Procedures": [
      "https://drive.google.com/file/d/1Fire_Emergency_Rolling/preview",
      "https://drive.google.com/file/d/1FirstAid_SteelPlant/preview"
    ],
    "📜 Regulatory Docs": [],
    "🌡️ Temperature Control": [],
    "⚙️ Process Parameters": [],
    "📊 Quality Assurance": []
  },
  "💡 TLL": {
    "💻 PLC Schematics": [
      "https://drive.google.com/file/d/1PLC_Siemens_S7_Diagram/preview"
    ],
    "⚡ Motor Control Centers": [],
    "📐 CAD Drawings": [
      "https://drive.google.com/file/d/1CAD_Drawing_Mill_v2/preview"
    ],
    "🔧 Maintenance Manuals": [],
    "📈 Production Logs": [],
    "⚙️ Process Optimization": []
  },
  "🛡️ SLITER": {
    "🧪 Chemical Handling": [
      "https://drive.google.com/file/d/1SDS_Chemical_Safety_2024/preview"
    ],
    "🚨 Emergency Procedures": [
      "https://drive.google.com/file/d/1Fire_Emergency_Rolling/preview",
      "https://drive.google.com/file/d/1FirstAid_SteelPlant/preview"
    ],
    "📜 Regulatory Docs": [],
    "⚙️ Blade Maintenance": [],
    "📊 Quality Control": [],
    "📈 Production Reports": []
  }
};

// Beautiful filename extraction
function getSmartFileName(link) {
  if (!link || typeof link !== 'string') return "Document.pdf";
  
  const cleanLink = link.split('?')[0];
  const driveMatch = cleanLink.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  
  if (driveMatch) {
    let id = driveMatch[1];
    const nameMap = {
      "eQ4v4vf": "Burner_Tuning_Guide_v2.1",
      "MotorGuide": "Motor_Specifications_2024",
      "GearPro": "Gearbox_Lubrication_Schedule",
      "LubricationGuide": "Roll_Mill_Lubrication_Manual",
      "QC_Checklist": "Steel_Inspection_Checklist",
      "NDT_Ultrasonic": "Ultrasonic_Testing_Procedure",
      "ISO9001": "ISO_9001_Certificate_2025",
      "PLC_Siemens": "PLC_Programming_Manual_S7",
      "SDS_Chemical": "Chemical_Safety_DataSheet",
      "Fire_Emergency": "Fire_Response_Protocol",
      "FirstAid": "FirstAid_SteelPlant_Manual",
      "Cooling": "Cooling_System_Operations",
      "Maintenance": "Preventive_Maintenance_Schedule",
      "CAD_Drawing": "CAD_Engineering_Drawings"
    };
    
    for (const [key, value] of Object.entries(nameMap)) {
      if (id.includes(key)) return `${value}.pdf`;
    }
    return `Technical_Doc_${id.slice(-6)}.pdf`;
  }
  return "Engineering_Reference.pdf";
}

// Flatten files for search
function flattenAllFiles(node, currentPath = []) {
  let filesList = [];
  for (let key in node) {
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(link => {
        if (link && typeof link === 'string') {
          filesList.push({
            name: getSmartFileName(link),
            link: link,
            folderPath: [...currentPath, key].join(" › ")
          });
        }
      });
    } else if (value && typeof value === 'object') {
      filesList.push(...flattenAllFiles(value, [...currentPath, key]));
    }
  }
  return filesList;
}

let currentPath = [];
let allFilesCache = null;

function getAllFilesIndex() {
  if (!allFilesCache) {
    allFilesCache = flattenAllFiles(fileSystem);
  }
  return allFilesCache;
}

function getCurrentNode() {
  let node = fileSystem;
  for (let segment of currentPath) {
    if (node[segment] && !Array.isArray(node[segment])) {
      node = node[segment];
    } else {
      return null;
    }
  }
  return node;
}

function updateStats() {
  const allFiles = getAllFilesIndex();
  const statsBar = document.getElementById("statsBar");
  const totalPDFs = allFiles.length;
  const totalFolders = Object.keys(fileSystem).length;
  
  let totalSubfolders = 0;
  function countSubfolders(node) {
    for (let key in node) {
      const val = node[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        totalSubfolders++;
        countSubfolders(val);
      }
    }
  }
  countSubfolders(fileSystem);
  
  statsBar.innerHTML = `
    <i class="fas fa-file-pdf"></i> <span>${totalPDFs}</span> Documents
    <i class="fas fa-folder"></i> <span>${totalFolders}</span> Departments
    <i class="fas fa-folder-open"></i> <span>${totalSubfolders}</span> Subfolders
    <i class="fas fa-industry"></i> <span>OARCEL</span> Edition
  `;
}

function createCard(icon, title, onClick, className, subtitle = null) {
  const div = document.createElement("div");
  div.className = `card ${className}`;
  div.style.animationDelay = `${Math.random() * 0.2}s`;
  div.innerHTML = `
    <div class="card-icon">
      <i class="${icon}"></i>
    </div>
    <div class="card-title">${escapeHtml(title)}</div>
    ${subtitle ? `<div class="card-subtitle"><i class="fas fa-folder-open"></i> ${escapeHtml(subtitle)}</div>` : '<div class="card-subtitle"><i class="fas fa-file"></i> Click to view</div>'}
  `;
  div.onclick = onClick;
  return div;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openPdfViewer(link) {
  const viewerWrapper = document.getElementById("viewerWrapper");
  const pdfIframe = document.getElementById("pdfIframe");
  if (!link) return;
  
  let embedUrl = link;
  if (link.includes("drive.google.com")) {
    if (link.includes("/preview")) {
      embedUrl = link;
    } else {
      const fileIdMatch = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
      } else {
        embedUrl = link.includes("?") ? link + "&embedded=true" : link + "?embedded=true";
      }
    }
  }
  
  pdfIframe.src = embedUrl;
  viewerWrapper.style.display = "block";
  viewerWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeViewer() {
  const viewerWrapper = document.getElementById("viewerWrapper");
  const pdfIframe = document.getElementById("pdfIframe");
  viewerWrapper.style.display = "none";
  pdfIframe.src = "about:blank";
}

function goHome() {
  currentPath = [];
  document.getElementById("search").value = "";
  closeViewer();
  render();
}

function render() {
  const contentDiv = document.getElementById("content");
  const breadcrumbSpan = document.getElementById("breadcrumb");
  const searchQuery = document.getElementById("search").value.trim().toLowerCase();
  const viewerWrapper = document.getElementById("viewerWrapper");
  
  if (viewerWrapper.style.display === "block") {
    viewerWrapper.style.display = "none";
    const iframe = document.getElementById("pdfIframe");
    if (iframe) iframe.src = "about:blank";
  }
  
  let breadText = `<i class="fas fa-home"></i> Dashboard`;
  if (currentPath.length > 0) {
    breadText += ` / ${currentPath.join(" / ")}`;
  }
  breadcrumbSpan.innerHTML = breadText;
  
  contentDiv.innerHTML = "";
  
  // Search mode
  if (searchQuery !== "") {
    const allFiles = getAllFilesIndex();
    const filtered = allFiles.filter(file => 
      file.name.toLowerCase().includes(searchQuery) || 
      file.folderPath.toLowerCase().includes(searchQuery)
    );
    
    if (filtered.length === 0) {
      contentDiv.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>No matching documents found</p></div>`;
      updateStats();
      return;
    }
    
    filtered.forEach(file => {
      const displayName = file.name.replace('.pdf', '');
      const card = createCard(
        "fas fa-file-pdf", 
        displayName, 
        () => openPdfViewer(file.link), 
        "pdf-card",
        file.folderPath
      );
      contentDiv.appendChild(card);
    });
    updateStats();
    return;
  }
  
  // Folder navigation
  const currentNode = getCurrentNode();
  if (!currentNode) {
    currentPath = [];
    render();
    return;
  }
  
  const folderKeys = Object.keys(currentNode).filter(key => {
    const val = currentNode[key];
    return val && typeof val === 'object' && !Array.isArray(val);
  });
  
  folderKeys.forEach(folder => {
    const card = createCard(
      "fas fa-folder", 
      folder, 
      () => {
        currentPath.push(folder);
        render();
      }, 
      "folder-card"
    );
    contentDiv.appendChild(card);
  });
  
  // Render files
  const allEntries = Object.keys(currentNode);
  let fileLinks = [];
  for (let key of allEntries) {
    const val = currentNode[key];
    if (Array.isArray(val)) {
      val.forEach(link => {
        if (link && typeof link === 'string') fileLinks.push(link);
      });
    }
  }
  
  if (fileLinks.length === 0 && folderKeys.length === 0) {
    contentDiv.innerHTML = `<div class="empty-state"><i class="fas fa-folder-open"></i><p>This folder is empty</p></div>`;
  } else {
    fileLinks.forEach(link => {
      const fileName = getSmartFileName(link);
      const displayName = fileName.replace('.pdf', '');
      const card = createCard(
        "fas fa-file-pdf", 
        displayName, 
        () => openPdfViewer(link), 
        "pdf-card"
      );
      contentDiv.appendChild(card);
    });
  }
  
  updateStats();
}

// PWA Installation Prompt
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');
const closeInstallBtn = document.getElementById('closeInstallBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installPrompt.style.display = 'block';
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    installPrompt.style.display = 'none';
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response: ${outcome}`);
      deferredPrompt = null;
    }
  });
}

if (closeInstallBtn) {
  closeInstallBtn.addEventListener('click', () => {
    installPrompt.style.display = 'none';
  });
}

// Event Listeners
document.getElementById("breadcrumb").addEventListener("click", goHome);
document.getElementById("closeViewerBtn").addEventListener("click", closeViewer);

// Real-time search with debounce
let searchTimeout;
const searchInput = document.getElementById("search");
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    render();
  }, 180);
});

// ESC to close viewer
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const viewerWrap = document.getElementById("viewerWrapper");
    if (viewerWrap.style.display === "block") {
      closeViewer();
    }
  }
});

// Network status detection
window.addEventListener('online', () => {
  console.log('Back online');
});

window.addEventListener('offline', () => {
  console.log('You are offline');
});

// Initialize
render();
