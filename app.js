// ==================== OARCEL DOCUMENT MANAGER WITH FULL FOLDER MANAGEMENT ====================

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
let fileSystem = {
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

// Save folder structure to localStorage
function saveFolderStructure() {
    localStorage.setItem('oarcel_folders', JSON.stringify(fileSystem));
}

// Load folder structure from localStorage
function loadFolderStructure() {
    const saved = localStorage.getItem('oarcel_folders');
    if (saved) {
        fileSystem = JSON.parse(saved);
        console.log('Folder structure loaded');
    }
}

// ==================== PERMANENT STORAGE FUNCTIONS ====================

function saveAllFiles() {
    try {
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
        return true;
    } catch (e) {
        console.error('Save failed:', e);
        return false;
    }
}

function loadAllFiles() {
    try {
        const saved = localStorage.getItem('oarcel_all_files');
        if (saved) {
            allFiles = JSON.parse(saved);
            let total = 0;
            for (const folder in allFiles) {
                total += allFiles[folder].length;
            }
            if (total > 0) {
                showToast(`Loaded ${total} saved file${total > 1 ? 's' : ''}`, false);
            }
            return true;
        } else {
            allFiles = {};
            return false;
        }
    } catch (e) {
        console.error('Load failed:', e);
        allFiles = {};
        return false;
    }
}

function getFilesForCurrentFolder() {
    const folderPath = currentPath.join("/");
    return allFiles[folderPath] || [];
}

async function addFileToCurrentFolder(file) {
    const folderPath = currentPath.join("/");
    if (!allFiles[folderPath]) {
        allFiles[folderPath] = [];
    }
    
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
    
    saveAllFiles();
    return true;
}

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

// ==================== FOLDER MANAGEMENT FUNCTIONS ====================

// Rename current folder
function renameCurrentFolder() {
    if (currentPath.length === 0) {
        showToast("Cannot rename root folder", true);
        return;
    }
    
    const oldName = currentPath[currentPath.length - 1];
    const newName = prompt("📁 Enter new folder name:", oldName);
    
    if (newName && newName !== oldName && newName.trim() !== "") {
        // Navigate to parent
        const parentPath = currentPath.slice(0, -1);
        let parent = fileSystem;
        for (let p of parentPath) {
            parent = parent[p];
        }
        
        // Move folder content
        parent[newName] = parent[oldName];
        delete parent[oldName];
        
        // Update file paths
        const oldFolderPath = currentPath.join("/");
        const newFolderPath = [...parentPath, newName].join("/");
        
        if (allFiles[oldFolderPath]) {
            allFiles[newFolderPath] = allFiles[oldFolderPath];
            delete allFiles[oldFolderPath];
        }
        
        // Update current path
        currentPath[parentPath.length] = newName;
        
        saveFolderStructure();
        saveAllFiles();
        render();
        showToast(`✅ Renamed to "${newName}"`, false);
    } else if (newName === "") {
        showToast("Folder name cannot be empty", true);
    }
}

// Add new folder inside current folder
function addNewFolder() {
    const folderName = prompt("📁 Enter new folder name:", "New Folder");
    
    if (folderName && folderName.trim() !== "") {
        const currentFolder = getCurrentFolderObject();
        if (currentFolder && !currentFolder[folderName]) {
            currentFolder[folderName] = {};
            saveFolderStructure();
            render();
            showToast(`✅ Folder "${folderName}" created`, false);
        } else if (currentFolder && currentFolder[folderName]) {
            showToast("❌ Folder already exists!", true);
        }
    } else if (folderName === "") {
        showToast("Folder name cannot be empty", true);
    }
}

// Add new department at root level
function addNewDepartment() {
    const deptName = prompt("🏭 Enter new department name:", "New Department");
    
    if (deptName && deptName.trim() !== "") {
        if (!fileSystem[deptName]) {
            fileSystem[deptName] = {};
            saveFolderStructure();
            render();
            showToast(`✅ Department "${deptName}" created`, false);
        } else {
            showToast("❌ Department already exists!", true);
        }
    }
}

// Delete current folder
function deleteCurrentFolder() {
    if (currentPath.length === 0) {
        showToast("Cannot delete root folder", true);
        return;
    }
    
    const folderName = currentPath[currentPath.length - 1];
    if (confirm(`⚠️ Delete folder "${folderName}" and ALL its contents?\n\nThis action CANNOT be undone!`)) {
        // Remove files in this folder
        const folderPath = currentPath.join("/");
        if (allFiles[folderPath]) {
            delete allFiles[folderPath];
        }
        
        // Remove from structure
        const parentPath = currentPath.slice(0, -1);
        let parent = fileSystem;
        for (let p of parentPath) {
            parent = parent[p];
        }
        delete parent[folderName];
        
        // Go back
        currentPath.pop();
        
        saveFolderStructure();
        saveAllFiles();
        render();
        showToast(`🗑️ Folder "${folderName}" deleted`, false);
    }
}

// Get current folder object
function getCurrentFolderObject() {
    let folder = fileSystem;
    for (let p of currentPath) {
        if (folder[p]) folder = folder[p];
        else return null;
    }
    return folder;
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

function createCard(icon, title, onClick, isFolder = true, showDelete = false) {
    const card = document.createElement("div");
    card.className = "card";
    const iconColor = isFolder ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)";
    const iconClass = isFolder ? "fa-folder" : "fa-file-pdf";
    
    if (currentViewMode === "list") {
        card.innerHTML = `
            <i class="fas ${iconClass}" style="background: ${iconColor}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i>
            <span style="flex:1">${escapeHtml(title)}</span>
            ${showDelete ? `<button class="delete-btn" onclick="event.stopPropagation(); window.deleteFileFromFolder('${currentPath.join("/")}', '${title}')"><i class="fas fa-trash"></i></button>` : ''}
        `;
    } else {
        card.innerHTML = `
            <i class="fas ${iconClass}" style="background: ${iconColor}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2rem;"></i>
            <span>${escapeHtml(title)}</span>
            ${showDelete ? `<button class="delete-btn-small" onclick="event.stopPropagation(); window.deleteFileFromFolder('${currentPath.join("/")}', '${title}')"><i class="fas fa-trash"></i></button>` : ''}
        `;
    }
    card.onclick = onClick;
    return card;
}

// ==================== PDF ZOOM FUNCTION ====================
function openPDF(dataUrl) {
    viewer.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    frame.src = "about:blank";
    
    if (dataUrl.startsWith('data:application/pdf')) {
        fetch(dataUrl)
            .then(res => res.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                const viewerUrl = `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(blobUrl)}`;
                frame.src = viewerUrl;
            })
            .catch(err => {
                console.error('Error loading PDF:', err);
                frame.src = dataUrl;
            });
        return;
    }
    
    const viewerUrl = `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(dataUrl)}`;
    frame.src = viewerUrl;
}

function closeViewer() { 
    viewer.classList.add("hidden"); 
    frame.src = ""; 
    document.body.style.overflow = "auto"; 
}

function goBack() { 
    if (currentPath.length > 0) { 
        currentPath.pop(); 
        render(); 
    } 
}

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

function setViewMode(mode) { 
    currentViewMode = mode; 
    render(); 
    document.getElementById("gridViewBtn").classList.toggle("active", mode === "grid"); 
    document.getElementById("listViewBtn").classList.toggle("active", mode === "list"); 
}

function render() {
    content.innerHTML = "";
    const folder = getCurrentFolder();
    if (!folder) { currentPath = []; render(); return; }
    
    content.className = `content ${currentViewMode === "grid" ? "grid-view" : "list-view"}`;
    pathText.innerText = currentPath.length === 0 ? "Home" : currentPath.join(" / ");
    backBtn.classList.toggle("hidden", currentPath.length === 0);
    
    const isLeafFolder = Object.keys(folder).length === 0;
    const isRoot = currentPath.length === 0;
    
    // Action Buttons - Add, Rename, Delete Folder
    if (!isRoot) {
        const actionBar = document.createElement("div");
        actionBar.className = "action-bar";
        actionBar.innerHTML = `
            <button class="action-btn rename-btn" onclick="window.renameCurrentFolder()"><i class="fas fa-edit"></i><span>Rename</span></button>
            <button class="action-btn delete-folder-btn" onclick="window.deleteCurrentFolder()"><i class="fas fa-trash-alt"></i><span>Delete</span></button>
            <button class="action-btn add-folder-btn" onclick="window.addNewFolder()"><i class="fas fa-plus"></i><span>Add Subfolder</span></button>
        `;
        content.appendChild(actionBar);
    }
    
    // Add Department button at root
    if (isRoot) {
        const actionBar = document.createElement("div");
        actionBar.className = "action-bar";
        actionBar.innerHTML = `
            <button class="action-btn add-folder-btn" onclick="window.addNewDepartment()"><i class="fas fa-building"></i><span>Add Department</span></button>
        `;
        content.appendChild(actionBar);
    }
    
    // Show subfolders
    for (let key in folder) {
        content.appendChild(createCard(key, key, () => { currentPath.push(key); render(); }, true));
    }
    
    // Show upload button and files
    if (isLeafFolder) {
        uploadBtn.classList.toggle("hidden", false);
        const folderFiles = getFilesForCurrentFolder();
        
        if (folderFiles.length === 0 && Object.keys(folder).length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "empty-state";
            emptyDiv.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>No PDFs yet. Click Upload to add files.<br>📁 Use the buttons above to manage folders</p>';
            content.appendChild(emptyDiv);
        } else {
            folderFiles.forEach((f) => {
                const card = createCard(f.name, f.name, () => openPDF(f.dataUrl), false, true);
                content.appendChild(card);
            });
        }
    } else {
        uploadBtn.classList.toggle("hidden", true);
    }
    updateStats();
}

// Make functions global
window.deleteFileFromFolder = (folderPath, fileName) => {
    if (confirm(`Delete "${fileName}"? This cannot be undone.`)) {
        deleteFileFromFolder(folderPath, fileName);
    }
};
window.renameCurrentFolder = renameCurrentFolder;
window.deleteCurrentFolder = deleteCurrentFolder;
window.addNewFolder = addNewFolder;
window.addNewDepartment = addNewDepartment;

pathContainer.addEventListener("click", () => { currentPath = []; render(); });
document.getElementById("gridViewBtn").addEventListener("click", () => setViewMode("grid"));
document.getElementById("listViewBtn").addEventListener("click", () => setViewMode("list"));

window.goBack = goBack;
window.triggerUpload = triggerUpload;
window.closeViewer = closeViewer;
window.openPDF = openPDF;

// ==================== INITIALIZATION ====================
loadFolderStructure();
loadAllFiles();
render();
