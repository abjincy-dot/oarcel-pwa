// ==================== OARCEL - COMPLETE WITH SEARCH ====================

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
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
const searchInfo = document.getElementById("searchInfo");

let currentViewMode = "grid";
let allFiles = {};
let currentPath = [];
let isSearchMode = false;

// Folder structure
let fileSystem = {
    "REMELT": {
        "A": {}, "B": {}, "C": {}, "D": {}, "E": {}, "F": {}, "G": {}, "H": {},
        "I": {}, "J": {}, "K": {}, "L": {}, "M": {}, "N": {}, "O": {}, "P": {},
        "Q": {}, "R": {}, "S": {}, "T": {}, "U": {}, "V": {}, "W": {}, "X": {},
        "Y": {}, "Z": {}
    },
    "CASTER": {
        "Quality Reports": {}, "Mechanical": {}, "Maintenance": {},
        "Production Data": {}, "Testing": {}, "Checklists": {},
        "Safety": {}, "Training": {}
    },
    "HRM": {
        "Employee Records": {}, "Attendance": {}, "Performance": {},
        "Training Logs": {}, "Safety Compliance": {}, "Policies": {},
        "Reports": {}, "Certifications": {}
    },
    "CRM": {
        "PLC Programs": {}, "CAD Drawings": {}, "Electrical": {},
        "SCADA": {}, "Automation": {}, "Reports": {},
        "Configurations": {}, "Manuals": {}
    },
    "ANNEALING": {
        "Temperature Control": {}, "Process Parameters": {}, "Quality Assurance": {},
        "Maintenance": {}, "Safety": {}, "Production Logs": {},
        "Testing": {}, "SOP Documents": {}
    },
    "TLL": {
        "PLC Programs": {}, "CAD Drawings": {}, "Maintenance": {},
        "Production Logs": {}, "Process Optimization": {}, "Quality Reports": {},
        "Manuals": {}, "Safety": {}
    },
    "SLITTER": {
        "Blade Maintenance": {}, "Quality Control": {}, "Production Reports": {},
        "Mechanical": {}, "Safety": {}, "Checklists": {},
        "Training": {}, "Testing": {}
    },
    "UTILITY": {
        "Power Supply": {}, "Water System": {}, "Compressed Air": {},
        "HVAC": {}, "Reports": {}, "Safety": {},
        "Manuals": {}, "Testing": {}
    }
};

// Storage functions
function saveFolderStructure() { localStorage.setItem('oarcel_folders', JSON.stringify(fileSystem)); }
function loadFolderStructure() { const saved = localStorage.getItem('oarcel_folders'); if (saved) fileSystem = JSON.parse(saved); }
function saveAllFiles() { 
    try { 
        const toSave = {}; 
        for (const folder in allFiles) { 
            toSave[folder] = allFiles[folder].map(file => ({ name: file.name, dataUrl: file.dataUrl })); 
        } 
        localStorage.setItem('oarcel_all_files', JSON.stringify(toSave)); 
    } catch(e) {} 
}
function loadAllFiles() { 
    try { 
        const saved = localStorage.getItem('oarcel_all_files'); 
        if (saved) allFiles = JSON.parse(saved); 
    } catch(e) { allFiles = {}; } 
}
function getFilesForCurrentFolder() { return allFiles[currentPath.join("/")] || []; }
async function addFileToCurrentFolder(file) {
    const folderPath = currentPath.join("/");
    if (!allFiles[folderPath]) allFiles[folderPath] = [];
    const base64Data = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result); reader.readAsDataURL(file); });
    allFiles[folderPath].push({ name: file.name, dataUrl: base64Data });
    saveAllFiles();
}
function deleteFileFromFolder(folderPath, fileName) {
    if (allFiles[folderPath]) {
        allFiles[folderPath] = allFiles[folderPath].filter(f => f.name !== fileName);
        if (allFiles[folderPath].length === 0) delete allFiles[folderPath];
        saveAllFiles();
        render();
        showToast(`✅ Deleted "${fileName}"`);
    }
}

// Get all files for search
function getAllFiles() {
    const results = [];
    for (const folderPath in allFiles) {
        allFiles[folderPath].forEach(file => {
            results.push({
                name: file.name,
                dataUrl: file.dataUrl,
                folder: folderPath
            });
        });
    }
    return results;
}

// Search function
function searchFiles(query) {
    if (!query.trim()) return [];
    const all = getAllFiles();
    const lowerQuery = query.toLowerCase();
    return all.filter(file => file.name.toLowerCase().includes(lowerQuery));
}

// Folder management
function renameCurrentFolder() {
    if (currentPath.length === 0) { showToast("Cannot rename root", true); return; }
    const oldName = currentPath[currentPath.length - 1];
    const newName = prompt("Enter new folder name:", oldName);
    if (newName && newName !== oldName && newName.trim()) {
        const parentPath = currentPath.slice(0, -1);
        let parent = fileSystem;
        for (let p of parentPath) parent = parent[p];
        parent[newName] = parent[oldName];
        delete parent[oldName];
        const oldFolderPath = currentPath.join("/");
        const newFolderPath = [...parentPath, newName].join("/");
        if (allFiles[oldFolderPath]) { allFiles[newFolderPath] = allFiles[oldFolderPath]; delete allFiles[oldFolderPath]; }
        currentPath[parentPath.length] = newName;
        saveFolderStructure(); saveAllFiles(); render();
        showToast(`✅ Renamed to "${newName}"`);
    }
}
function addNewFolder() {
    const folderName = prompt("Enter new folder name:", "New Folder");
    if (folderName && folderName.trim()) {
        const currentFolder = getCurrentFolderObject();
        if (currentFolder && !currentFolder[folderName]) { 
            currentFolder[folderName] = {}; 
            saveFolderStructure(); 
            render(); 
            showToast(`✅ Folder "${folderName}" created`);
        } else { 
            showToast("Folder already exists!", true); 
        }
    }
}
function addNewDepartment() {
    const deptName = prompt("Enter new department name:", "New Department");
    if (deptName && deptName.trim()) {
        if (!fileSystem[deptName]) { 
            fileSystem[deptName] = {}; 
            saveFolderStructure(); 
            render(); 
            showToast(`✅ Department "${deptName}" created`);
        } else { 
            showToast("Department already exists!", true); 
        }
    }
}
function deleteCurrentFolder() {
    if (currentPath.length === 0) { showToast("Cannot delete root", true); return; }
    const folderName = currentPath[currentPath.length - 1];
    if (confirm(`Delete "${folderName}" and ALL contents?`)) {
        const folderPath = currentPath.join("/");
        if (allFiles[folderPath]) delete allFiles[folderPath];
        const parentPath = currentPath.slice(0, -1);
        let parent = fileSystem;
        for (let p of parentPath) parent = parent[p];
        delete parent[folderName];
        currentPath.pop();
        saveFolderStructure(); saveAllFiles(); render();
        showToast(`🗑️ Folder "${folderName}" deleted`);
    }
}
function getCurrentFolderObject() { 
    let folder = fileSystem; 
    for (let p of currentPath) { 
        if (folder[p]) folder = folder[p]; 
        else return null; 
    } 
    return folder; 
}

// UI functions
function showToast(message, isError = false) {
    toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i><span>${message}</span>`;
    toast.style.background = isError ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #10b981, #059669)";
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
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
    for (let key in allFiles) fileCount += allFiles[key].length;
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
function createCard(title, onClick, isFolder = true, showDelete = false, deletePath = null, deleteName = null) {
    const card = document.createElement("div");
    card.className = "card";
    const iconClass = isFolder ? "fa-folder" : "fa-file-pdf";
    const iconColor = isFolder ? "linear-gradient(135deg, #f59e0b, #ef4444)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)";
    if (currentViewMode === "list") {
        card.innerHTML = `<i class="fas ${iconClass}" style="background: ${iconColor}; -webkit-background-clip: text; -webkit-text-fill-color: transparent;"></i><span style="flex:1">${escapeHtml(title)}</span>${showDelete ? `<button class="delete-btn" onclick="event.stopPropagation(); window.deleteFileFromFolder('${deletePath}', '${deleteName}')"><i class="fas fa-trash"></i></button>` : ''}`;
    } else {
        card.innerHTML = `<i class="fas ${iconClass}" style="background: ${iconColor}; -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2rem;"></i><span>${escapeHtml(title)}</span>${showDelete ? `<button class="delete-btn-small" onclick="event.stopPropagation(); window.deleteFileFromFolder('${deletePath}', '${deleteName}')"><i class="fas fa-trash"></i></button>` : ''}`;
    }
    card.onclick = onClick;
    return card;
}
function openPDF(dataUrl) { 
    viewer.classList.remove("hidden"); 
    document.body.style.overflow = "hidden"; 
    frame.src = dataUrl; 
}
function closeViewer() { 
    viewer.classList.add("hidden"); 
    frame.src = ""; 
    document.body.style.overflow = "auto"; 
}
function goBack() { 
    if (currentPath.length > 0 && !isSearchMode) { 
        currentPath.pop(); 
        render(); 
    } else if (isSearchMode) {
        clearSearch();
    }
}
function triggerUpload() { 
    fileInput.click(); 
}
function setViewMode(mode) { 
    currentViewMode = mode; 
    render(); 
    document.getElementById("gridViewBtn").classList.toggle("active", mode === "grid"); 
    document.getElementById("listViewBtn").classList.toggle("active", mode === "list"); 
}
function clearSearch() {
    searchInput.value = "";
    isSearchMode = false;
    searchInfo.classList.add("hidden");
    clearSearchBtn.classList.add("hidden");
    render();
}

// Main render
function render() {
    const searchQuery = searchInput.value.trim().toLowerCase();
    const isSearching = searchQuery !== "";
    
    isSearchMode = isSearching;
    
    if (isSearching) {
        clearSearchBtn.classList.remove("hidden");
        const results = searchFiles(searchQuery);
        searchInfo.classList.remove("hidden");
        searchInfo.innerHTML = `<i class="fas fa-search"></i> Found ${results.length} result(s) for "${escapeHtml(searchQuery)}" <button onclick="clearSearch()" style="background:none;border:none;color:#6366f1;cursor:pointer;margin-left:10px">Clear</button>`;
        
        content.innerHTML = "";
        content.className = `content ${currentViewMode === "grid" ? "grid-view" : "list-view"}`;
        backBtn.classList.toggle("hidden", false);
        pathText.innerText = "Search Results";
        uploadBtn.classList.toggle("hidden", true);
        
        if (results.length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "empty-state";
            emptyDiv.innerHTML = '<i class="fas fa-search"></i><p>No PDFs found matching your search.</p>';
            content.appendChild(emptyDiv);
        } else {
            results.forEach(file => {
                const card = createCard(file.name, () => openPDF(file.dataUrl), false, false);
                content.appendChild(card);
            });
        }
        updateStats();
        return;
    }
    
    clearSearchBtn.classList.add("hidden");
    searchInfo.classList.add("hidden");
    
    content.innerHTML = "";
    const folder = getCurrentFolder();
    if (!folder) { 
        currentPath = []; 
        render(); 
        return; 
    }
    content.className = `content ${currentViewMode === "grid" ? "grid-view" : "list-view"}`;
    pathText.innerText = currentPath.length === 0 ? "Home" : currentPath.join(" / ");
    backBtn.classList.toggle("hidden", currentPath.length === 0);
    const isLeafFolder = Object.keys(folder).length === 0;
    const isRoot = currentPath.length === 0;
    
    if (!isRoot) {
        const actionBar = document.createElement("div");
        actionBar.className = "action-bar";
        actionBar.innerHTML = `
            <button class="action-btn rename-btn" onclick="window.renameCurrentFolder()"><i class="fas fa-edit"></i> Rename</button>
            <button class="action-btn delete-folder-btn" onclick="window.deleteCurrentFolder()"><i class="fas fa-trash-alt"></i> Delete</button>
            <button class="action-btn add-folder-btn" onclick="window.addNewFolder()"><i class="fas fa-plus"></i> Add Subfolder</button>
        `;
        content.appendChild(actionBar);
    }
    if (isRoot) {
        const actionBar = document.createElement("div");
        actionBar.className = "action-bar";
        actionBar.innerHTML = `
            <button class="action-btn add-folder-btn" onclick="window.addNewDepartment()"><i class="fas fa-building"></i> Add Department</button>
        `;
        content.appendChild(actionBar);
    }
    
    for (let key in folder) { 
        content.appendChild(createCard(key, () => { currentPath.push(key); render(); }, true)); 
    }
    
    if (isLeafFolder) {
        uploadBtn.classList.toggle("hidden", false);
        const folderFiles = getFilesForCurrentFolder();
        const folderPath = currentPath.join("/");
        if (folderFiles.length === 0 && Object.keys(folder).length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "empty-state";
            emptyDiv.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>No PDFs yet. Click Upload to add files.</p>';
            content.appendChild(emptyDiv);
        } else {
            folderFiles.forEach((f) => { 
                content.appendChild(createCard(f.name, () => openPDF(f.dataUrl), false, true, folderPath, f.name)); 
            });
        }
    } else { 
        uploadBtn.classList.toggle("hidden", true); 
    }
    updateStats();
}

// File upload
fileInput.addEventListener("change", async (e) => {
    for (let file of e.target.files) {
        if (file.type === "application/pdf") { 
            await addFileToCurrentFolder(file); 
        }
    }
    showToast(`${e.target.files.length} PDF(s) saved!`);
    render();
    fileInput.value = "";
});

// Search event
searchInput.addEventListener("input", () => { render(); });
clearSearchBtn.addEventListener("click", () => { clearSearch(); });

// Make functions global
window.deleteFileFromFolder = (folderPath, fileName) => { 
    if (confirm(`Delete "${fileName}"?`)) deleteFileFromFolder(folderPath, fileName); 
};
window.renameCurrentFolder = renameCurrentFolder;
window.deleteCurrentFolder = deleteCurrentFolder;
window.addNewFolder = addNewFolder;
window.addNewDepartment = addNewDepartment;
window.goBack = goBack;
window.triggerUpload = triggerUpload;
window.closeViewer = closeViewer;
window.openPDF = openPDF;
window.clearSearch = clearSearch;

pathContainer.addEventListener("click", () => { clearSearch(); currentPath = []; render(); });
document.getElementById("gridViewBtn").addEventListener("click", () => setViewMode("grid"));
document.getElementById("listViewBtn").addEventListener("click", () => setViewMode("list"));

// Initialize
loadFolderStructure();
loadAllFiles();
render();
console.log("App initialized with search");