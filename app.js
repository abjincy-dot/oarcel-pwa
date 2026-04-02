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

// Global files object
let allFiles = {};

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

// ==================== PERMANENT STORAGE FUNCTIONS ====================

// Save all files to localStorage
function saveAllFiles() {
    try {
        // Create a clean object to save (without circular references)
        const toSave = {};
        for (const folder in allFiles) {
            toSave[folder] = allFiles[folder].map(file => ({
                name: file.name,
                dataUrl: file.dataUrl,
                date: file.date,
                size: file.size
            }));
        }
        localStorage.setItem('oarcel_all_files', JSON.stringify(toSave));
        console.log('Files saved to localStorage');
        return true;
    } catch (e) {
        console.error('Save failed:', e);
        return false;
    }
}

// Load all files from localStorage
function loadAllFiles() {
    try {
        const saved = localStorage.getItem('oarcel_all_files');
        if (saved) {
            allFiles = JSON.parse(saved);
            console.log('Files loaded from localStorage:', allFiles);
            
            // Count total files
            let total = 0;
            for (const folder in allFiles) {
                total += allFiles[folder].length;
            }
            if (total > 0) {
                showToast(`Loaded ${total} saved file${total > 1 ? 's' : ''}`, false);
            }
            return true;
        } else {
            console.log('No saved files found');
            allFiles = {};
            return false;
        }
    } catch (e) {
        console.error('Load failed:', e);
        allFiles = {};
        return false;
    }
}

// Get files for current folder
function getFilesForCurrentFolder() {
    const folderPath = currentPath.join("/");
    return allFiles[folderPath] || [];
}

// Add a file to current folder
async function addFileToCurrentFolder(file) {
    const folderPath = currentPath.join("/");
    if (!allFiles[folderPath]) {
        allFiles[folderPath] = [];
    }
    
    // Convert file to base64 for permanent storage
    const base64Data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
    
    allFiles[folderPath].push({
        name: file.name,
        dataUrl: base64Data,
        date: new Date().toISOString(),
        size: file.size
    });
    
    // Save immediately
    saveAllFiles();
    return true;
}

// Delete a file
function deleteFileFromFolder(folderPath, fileName) {
    if (allFiles[folderPath]) {
        const index = allFiles[folderPath].findIndex(f => f.name === fileName);
        if (index !== -1) {
            allFiles[folderPath].splice(index, 1);
            if (allFiles[folderPath].length === 0) {
                delete allFiles[folderPath];
            }
            saveAllFiles();
            render();
            showToast(`Deleted "${fileName}"`, false);
            return true;
        }
    }
    return false;
}

// ==================== UI FUNCTIONS ====================

function showToast(message, isError = false) {
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i><span>${message}</span>`;
    toast.style.background = isError ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #10b981, #059669)";
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
}

function updateStats() {
    let folderCount = 0;
    function countRecursive(obj) {
        for (let key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                folderCount++;
                countRecursive(obj[key]);
            }
        }
    }
    countRecursive(fileSystem);
    
    let fileCount = 0;
    for (let key in allFiles) {
        fileCount += allFiles[key].length;
    }
    
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

function createCard(icon, title, onClick, isFolder = true, showDelete = false, deleteCallback = null) {
    const card = document.createElement("div");
    card.className = "card";
    const iconColor = isFolder ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)";
    const iconClass = isFolder ? "fa-folder" : "fa-file-pdf";
    
    if (currentViewMode === "list") {
        card.innerHTML = `
            <i class="fas ${iconClass}" style="background: ${iconColor}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i>
            <span style="flex:1">${escapeHtml(title)}</span>
            ${showDelete ? `<button class="delete-btn" onclick="event.stopPropagation(); deleteFileFromFolder('${currentPath.join("/")}', '${title}')"><i class="fas fa-trash"></i></button>` : ''}
        `;
    } else {
        card.innerHTML = `
            <i class="fas ${iconClass}" style="background: ${iconColor}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.2rem;"></i>
            <span>${escapeHtml(title)}</span>
            ${showDelete ? `<button class="delete-btn-small" onclick="event.stopPropagation(); deleteFileFromFolder('${currentPath.join("/")}', '${title}')"><i class="fas fa-trash"></i></button>` : ''}
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
    
    // Show subfolders
    for (let key in folder) {
        content.appendChild(createCard(key, key, () => { currentPath.push(key); render(); }, true));
    }
    
    // Show files if leaf folder
    if (isLeafFolder) {
        const folderFiles = getFilesForCurrentFolder();
        
        if (folderFiles.length === 0 && Object.keys(folder).length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "empty-state";
            emptyDiv.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>No PDFs yet. Click Upload to add files.<br>Files are saved permanently!</p>';
            content.appendChild(emptyDiv);
        } else {
            folderFiles.forEach((f) => {
                const card = createCard(f.name, f.name, () => openPDF(f.dataUrl), false, true);
                content.appendChild(card);
            });
        }
    }
    updateStats();
}

// Upload files
function triggerUpload() { 
    fileInput.click(); 
}

fileInput.addEventListener("change", async (e) => {
    const files_list = e.target.files;
    if (!files_list.length) return;
    
    let uploadedCount = 0;
    for (let file of files_list) {
        if (file.type === "application/pdf") {
            await addFileToCurrentFolder(file);
            uploadedCount++;
        }
    }
    
    if (uploadedCount > 0) {
        showToast(`${uploadedCount} PDF${uploadedCount > 1 ? 's' : ''} saved permanently!`);
        render();
    }
    
    fileInput.value = "";
});

function goBack() { 
    if (currentPath.length > 0) { 
        currentPath.pop(); 
        render(); 
    } 
}

function openPDF(dataUrl) { 
    frame.src = dataUrl; 
    viewer.classList.remove("hidden"); 
    document.body.style.overflow = "hidden"; 
}

function closeViewer() { 
    viewer.classList.add("hidden"); 
    frame.src = ""; 
    document.body.style.overflow = "auto"; 
}

function setViewMode(mode) { 
    currentViewMode = mode; 
    render(); 
    document.getElementById("gridViewBtn").classList.toggle("active", mode === "grid"); 
    document.getElementById("listViewBtn").classList.toggle("active", mode === "list"); 
}

// Make delete function global
window.deleteFileFromFolder = (folderPath, fileName) => {
    if (confirm(`Delete "${fileName}"? This cannot be undone.`)) {
        deleteFileFromFolder(folderPath, fileName);
    }
};

pathContainer.addEventListener("click", () => { currentPath = []; render(); });
document.getElementById("gridViewBtn").addEventListener("click", () => setViewMode("grid"));
document.getElementById("listViewBtn").addEventListener("click", () => setViewMode("list"));

window.goBack = goBack;
window.triggerUpload = triggerUpload;
window.closeViewer = closeViewer;
window.openPDF = openPDF;

// ==================== INITIALIZATION ====================
// Load saved files first, then render
loadAllFiles();
render();
