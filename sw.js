// ==================== OARCEL DOCUMENT MANAGER WITH PERMANENT STORAGE ====================

const content = document.getElementById("content");
const pathText = document.getElementById("path");
const pathContainer = document.getElementById("pathContainer");
const backBtn = document.getElementById("backBtn");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const viewer = document.getElementById("viewer");
const frame = document.getElementById("pdfFrame");
const toast = document.getElementById("toast");
const folderCountSpan = document.getElementById("folderCount");
const fileCountSpan = document.getElementById("fileCount");

// View mode state
let currentViewMode = "grid";

// Load saved files from localStorage (permanent!)
let files = {};

// Load saved data on startup
function loadSavedFiles() {
    const saved = localStorage.getItem('oarcel_pdfs');
    if (saved) {
        files = JSON.parse(saved);
        console.log('Loaded saved files:', files);
    }
    render();
}

// Save files to localStorage
function saveFiles() {
    localStorage.setItem('oarcel_pdfs', JSON.stringify(files));
    console.log('Files saved permanently');
}

// ==================== FOLDER STRUCTURE ====================
const fileSystem = {
    "REMELT": {
        "A": {}, "B": {}, "C": {}, "D": {}, "E": {}, "F": {}, "G": {}, "H": {},
        "I": {}, "J": {}, "K": {}, "L": {}, "M": {}, "N": {}, "O": {}, "P": {},
        "Q": {}, "R": {}, "S": {}, "T": {}, "U": {}, "V": {}, "W": {}, "X": {},
        "Y": {}, "Z": {}
    },
    "CASTER": {
        "📊 Quality Reports": {}, "⚙️ Mechanical": {}, "🔧 Maintenance": {},
        "📈 Production Data": {}, "🔬 Testing": {}, "📋 Checklists": {},
        "⚠️ Safety": {}, "📚 Training": {}
    },
    "HRM": {
        "📄 Employee Records": {}, "📋 Attendance": {}, "🏆 Performance": {},
        "📚 Training Logs": {}, "⚠️ Safety Compliance": {}, "📜 Policies": {},
        "📊 Reports": {}, "🎓 Certifications": {}
    },
    "CRM": {
        "💻 PLC Programs": {}, "📐 CAD Drawings": {}, "🔌 Electrical": {},
        "📡 SCADA": {}, "🔧 Automation": {}, "📊 Reports": {},
        "⚙️ Configurations": {}, "📚 Manuals": {}
    },
    "ANNEALING": {
        "🌡️ Temperature Control": {}, "⚙️ Process Parameters": {}, "📊 Quality Assurance": {},
        "🔧 Maintenance": {}, "⚠️ Safety": {}, "📈 Production Logs": {},
        "🔬 Testing": {}, "📚 SOP Documents": {}
    },
    "TLL": {
        "💻 PLC Programs": {}, "📐 CAD Drawings": {}, "🔧 Maintenance": {},
        "📈 Production Logs": {}, "⚙️ Process Optimization": {}, "📊 Quality Reports": {},
        "📚 Manuals": {}, "⚠️ Safety": {}
    },
    "SLITTER": {
        "⚙️ Blade Maintenance": {}, "📊 Quality Control": {}, "📈 Production Reports": {},
        "🔧 Mechanical": {}, "⚠️ Safety": {}, "📋 Checklists": {},
        "📚 Training": {}, "🔬 Testing": {}
    },
    "UTILITY": {
        "⚡ Power Supply": {}, "💧 Water System": {}, "🔧 Compressed Air": {},
        "🌡️ HVAC": {}, "📊 Reports": {}, "⚠️ Safety": {},
        "📚 Manuals": {}, "🔬 Testing": {}
    }
};

let currentPath = [];

function showToast(message, isError = false) {
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i><span>${message}</span>`;
    toast.style.background = isError ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #10b981, #059669)";
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 2500);
}

function updateStats() {
    let folderCount = 0, fileCount = 0;
    function countRecursive(obj) {
        for (let key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                folderCount++;
                countRecursive(obj[key]);
            }
        }
    }
    countRecursive(fileSystem);
    for (let key in files) fileCount += files[key].length;
    folderCountSpan.textContent = folderCount;
    fileCountSpan.textContent = fileCount;
}

function getCurrentFolder() {
    let folder = fileSystem;
    for (let p of currentPath) {
        if (folder[p]) folder = folder[p];
        else return null;
    }
    return folder;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function createCard(icon, title, onClick, isFolder = true) {
    const card = document.createElement("div");
    card.className = "card";
    const iconColor = isFolder ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)";
    const iconClass = isFolder ? "fa-folder" : "fa-file-pdf";
    
    if (currentViewMode === "list") {
        card.innerHTML = `
            <i class="fas ${iconClass}" style="background: ${iconColor}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i>
            <span>${escapeHtml(title)}</span>
        `;
    } else {
        card.innerHTML = `
            <i class="fas ${iconClass}" style="background: ${iconColor}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.2rem;"></i>
            <span>${escapeHtml(title)}</span>
        `;
    }
    card.onclick = onClick;
    return card;
}

function render() {
    content.innerHTML = "";
    const folder = getCurrentFolder();
    if (!folder) { currentPath = []; render(); return; }
    
    content.className = `content ${currentViewMode === "grid" ? "grid-view" : "list-view"}`;
    pathText.innerText = currentPath.length === 0 ? "Home" : currentPath.join(" / ");
    backBtn.classList.toggle("hidden", currentPath.length === 0);
    
    const isLeafFolder = Object.keys(folder).length === 0;
    uploadBtn.classList.toggle("hidden", !isLeafFolder);
    
    for (let key in folder) {
        content.appendChild(createCard(key, key, () => { currentPath.push(key); render(); }, true));
    }
    
    if (isLeafFolder) {
        const pathKey = currentPath.join("/");
        const folderFiles = files[pathKey] || [];
        if (folderFiles.length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "empty-state";
            emptyDiv.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>No PDFs yet. Click Upload to add files. Files are saved permanently!</p>';
            content.appendChild(emptyDiv);
        }
        folderFiles.forEach(f => {
            content.appendChild(createCard(f.name, f.name, () => openPDF(f.url), false));
        });
    }
    updateStats();
}

function triggerUpload() { fileInput.click(); }

fileInput.addEventListener("change", (e) => {
    const pathKey = currentPath.join("/");
    if (!files[pathKey]) files[pathKey] = [];
    
    let uploadedCount = 0;
    for (let file of e.target.files) {
        if (file.type === "application/pdf") {
            const fileUrl = URL.createObjectURL(file);
            files[pathKey].push({ 
                name: file.name, 
                url: fileUrl,
                date: new Date().toISOString(),
                size: file.size
            });
            uploadedCount++;
        }
    }
    
    if (uploadedCount > 0) {
        saveFiles(); // PERMANENTLY SAVE!
        showToast(`${uploadedCount} PDF${uploadedCount > 1 ? 's' : ''} saved permanently!`);
    }
    
    render();
    fileInput.value = "";
});

function goBack() { if (currentPath.length > 0) { currentPath.pop(); render(); } }
function openPDF(url) { frame.src = url; viewer.classList.remove("hidden"); document.body.style.overflow = "hidden"; }
function closeViewer() { viewer.classList.add("hidden"); frame.src = ""; document.body.style.overflow = "auto"; }
function setViewMode(mode) { currentViewMode = mode; render(); document.getElementById("gridViewBtn").classList.toggle("active", mode === "grid"); document.getElementById("listViewBtn").classList.toggle("active", mode === "list"); }

pathContainer.addEventListener("click", () => { currentPath = []; render(); });
document.getElementById("gridViewBtn").addEventListener("click", () => setViewMode("grid"));
document.getElementById("listViewBtn").addEventListener("click", () => setViewMode("list"));

window.goBack = goBack;
window.triggerUpload = triggerUpload;
window.closeViewer = closeViewer;
window.openPDF = openPDF;

// Load saved files on startup!
loadSavedFiles();
