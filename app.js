// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 4;
let db = null;
let allFiles = {};
let fileSystem = {};
let currentPath = [];
let isSearchMode = false;

// ==================== PDF VIEWER - Opens in new tab ====================
function openPDF(dataUrl, fileName) {
    showToast(`Opening ${fileName}...`);
    fetch(dataUrl)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            showToast(`PDF opened in new tab. Close tab to return.`);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        })
        .catch(err => {
            console.error('PDF error:', err);
            showToast(`Failed to open PDF: ${err.message}`, true);
        });
}

// ==================== INDEXEDDB FUNCTIONS ====================
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { db = request.result; resolve(); };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('folderStructure')) db.createObjectStore('folderStructure', { keyPath: 'key' });
        };
    });
}

function saveFolderStructure() {
    const tx = db.transaction('folderStructure', 'readwrite');
    tx.objectStore('folderStructure').put({ key: 'structure', value: fileSystem });
    tx.commit();
}
function saveAllFilesToDB() {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    store.clear();
    for (const folderPath in allFiles) {
        if (allFiles[folderPath] && allFiles[folderPath].length > 0) {
            store.put({ id: folderPath, folderPath, files: allFiles[folderPath] });
        }
    }
    tx.commit();
}

// Helper: ensure Data Log 1‑20 folders inside FURNACE 1
function ensureFurnace1DataLogs() {
    if (fileSystem["REMELT"] && fileSystem["REMELT"]["FURNACE 1"]) {
        const furnace1 = fileSystem["REMELT"]["FURNACE 1"];
        let changed = false;
        for (let i = 1; i <= 20; i++) {
            const folderName = `Data Log ${i}`;
            if (!furnace1[folderName]) {
                furnace1[folderName] = {};
                changed = true;
            }
        }
        if (!furnace1["Data Logs"]) {
            furnace1["Data Logs"] = {};
            changed = true;
        }
        if (changed) {
            saveFolderStructure();
            showToast("✅ Added Data Log 1‑20 folders inside FURNACE 1");
        }
    }
}

async function loadFromIndexedDB() {
    const folderReq = db.transaction('folderStructure', 'readonly').objectStore('folderStructure').get('structure');
    folderReq.onsuccess = () => {
        if (folderReq.result) {
            fileSystem = folderReq.result.value;
            ensureFurnace1DataLogs();
        } else {
            const furnace1Content = { "Data Logs": {} };
            for (let i = 1; i <= 20; i++) {
                furnace1Content[`Data Log ${i}`] = {};
            }
            fileSystem = {
                "REMELT": {
                    "FURNACE 1": furnace1Content,
                    "FURNACE 2": {},
                    "FURNACE 3": {},
                    "FURNACE 4": {},
                    "FURNACE 5": {},
                    "ACD": {},
                    "DBF": {},
                    "ROD FEEDER": {},
                    "LAUNDER HEATERS": {},
                    "LAUNDER PANEL ": {},
                    "HPU 1": {},
                    "HPU 2": {},
                    "M": {}, "N": {}, "O": {}, "P": {}, "Q": {}, "R": {}, "S": {}, "T": {}, "U": {}, "V": {}, "W": {}, "X": {}, "Y": {}, "Z": {}
                },
                "CASTER":{"Quality Reports":{},"Mechanical":{},"Maintenance":{},"Production Data":{},"Testing":{},"Checklists":{},"Safety":{},"Training":{}},
                "HRM":{"Employee Records":{},"Attendance":{},"Performance":{},"Training Logs":{},"Safety Compliance":{},"Policies":{},"Reports":{},"Certifications":{}},
                "CRM":{"PLC Programs":{},"CAD Drawings":{},"Electrical":{},"SCADA":{},"Automation":{},"Reports":{},"Configurations":{},"Manuals":{}},
                "ANNEALING":{"Temperature Control":{},"Process Parameters":{},"Quality Assurance":{},"Maintenance":{},"Safety":{},"Production Logs":{},"Testing":{},"SOP Documents":{}},
                "TLL":{"PLC Programs":{},"CAD Drawings":{},"Maintenance":{},"Production Logs":{},"Process Optimization":{},"Quality Reports":{},"Manuals":{},"Safety":{}},
                "SLITTER":{"Blade Maintenance":{},"Quality Control":{},"Production Reports":{},"Mechanical":{},"Safety":{},"Checklists":{},"Training":{},"Testing":{}},
                "UTILITY":{"Power Supply":{},"Water System":{},"Compressed Air":{},"HVAC":{},"Reports":{},"Safety":{},"Manuals":{},"Testing":{}}
            };
            saveFolderStructure();
        }
        const fileReq = db.transaction('files', 'readonly').objectStore('files').getAll();
        fileReq.onsuccess = () => {
            allFiles = {};
            for (let item of fileReq.result) {
                allFiles[item.folderPath] = item.files;
            }
            render();
        };
    };
}

function getCurrentFolderObject() { return currentPath.reduce((o,p) => o?.[p], fileSystem); }
function getFilesForCurrentFolder() { return allFiles[currentPath.join('/')] || []; }

async function addFileToCurrentFolder(file) {
    const folderPath = currentPath.join('/');
    if (!allFiles[folderPath]) allFiles[folderPath] = [];
    const base64 = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(file); });
    allFiles[folderPath].push({ name: file.name, dataUrl: base64 });
    await saveAllFilesToDB();
}

function deleteFileFromFolder(folderPath, fileName) {
    if (allFiles[folderPath]) {
        allFiles[folderPath] = allFiles[folderPath].filter(f => f.name !== fileName);
        if (allFiles[folderPath].length === 0) delete allFiles[folderPath];
        saveAllFilesToDB();
        render();
        showToast(`✅ Deleted "${fileName}"`);
    }
}

function renameFileInFolder(folderPath, oldName, newName) {
    if (allFiles[folderPath]) {
        const idx = allFiles[folderPath].findIndex(f => f.name === oldName);
        if (idx !== -1) {
            if (!newName.toLowerCase().endsWith('.pdf')) newName += '.pdf';
            allFiles[folderPath][idx].name = newName;
            saveAllFilesToDB();
            render();
            showToast(`✅ Renamed to "${newName}"`);
        }
    }
}

// NEW: Rename any folder (updates fileSystem and allFiles keys)
function renameFolder(parentPath, oldName, newName) {
    if (!newName || newName.trim() === "") return;
    newName = newName.trim();
    // Navigate to parent folder object
    let parent = fileSystem;
    if (parentPath.length > 0) {
        parent = parentPath.split('/').reduce((o, p) => o?.[p], fileSystem);
    }
    if (parent && parent[oldName]) {
        // Move the folder content
        parent[newName] = parent[oldName];
        delete parent[oldName];
        // Update allFiles keys: oldPath -> newPath
        const oldFolderPath = parentPath ? `${parentPath}/${oldName}` : oldName;
        const newFolderPath = parentPath ? `${parentPath}/${newName}` : newName;
        if (allFiles[oldFolderPath]) {
            allFiles[newFolderPath] = allFiles[oldFolderPath];
            delete allFiles[oldFolderPath];
        }
        // Also update any subfolders' paths in allFiles (if files exist deeper)
        const prefix = oldFolderPath + '/';
        for (const fullPath in allFiles) {
            if (fullPath.startsWith(prefix)) {
                const newFullPath = fullPath.replace(prefix, newFolderPath + '/');
                allFiles[newFullPath] = allFiles[fullPath];
                delete allFiles[fullPath];
            }
        }
        saveFolderStructure();
        saveAllFilesToDB();
        render();
        showToast(`✅ Folder renamed to "${newName}"`);
    }
}

function selectDepartment(d) { 
    currentPath = [d]; 
    render(); 
}

function goBack() { 
    if(currentPath.length && !isSearchMode) { 
        currentPath.pop(); 
        render(); 
    } else if(isSearchMode) { 
        clearSearch(); 
    } 
}

function triggerUpload() { 
    document.getElementById('fileInput').click(); 
}

function clearSearch() { 
    document.getElementById('searchInput').value = ''; 
    isSearchMode = false; 
    document.getElementById('searchInfo').classList.add('hidden'); 
    document.getElementById('clearSearchBtn').classList.add('hidden'); 
    render(); 
}

function searchFiles(q) {
    if(!q.trim()) return [];
    const all = [];
    for(const path in allFiles) {
        if(allFiles[path]) {
            allFiles[path].forEach(f => all.push({...f, folder:path}));
        }
    }
    return all.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
}

// Updated createCard: adds Rename button for folders
function createCard(title, onClick, isFolder=false, showDel=false, delPath=null, delName=null, showRename=false, folderParentPath=null) {
    const div = document.createElement('div'); 
    div.className = 'card';
    let renameButton = '';
    if (isFolder) {
        // For folders, add rename button using the new renameFolder function
        const parentPath = currentPath.join('/');
        renameButton = `<button class="rename-folder-btn" onclick="event.stopPropagation(); window.renameFolderPrompt('${parentPath}','${escapeHtml(title)}')"><i class="fas fa-edit"></i> Rename</button>`;
    } else if (showRename) {
        renameButton = `<button class="rename-file-btn" onclick="event.stopPropagation(); window.renameFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-edit"></i> Rename</button>`;
    }
    div.innerHTML = `
        <div class="card-icon"><i class="fas ${isFolder ? 'fa-folder' : 'fa-file-pdf'}" style="color:${isFolder ? '#fbbf24' : '#60a5fa'}"></i></div>
        <div class="card-filename">${escapeHtml(title)}</div>
        <div class="card-buttons">
            ${renameButton}
            ${showDel ? `<button class="delete-btn" onclick="event.stopPropagation(); window.deleteFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
        </div>
    `;
    div.onclick = onClick; 
    return div;
}

function render() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    if(query) {
        isSearchMode = true;
        document.getElementById('clearSearchBtn').classList.remove('hidden');
        const results = searchFiles(query);
        document.getElementById('searchInfo').classList.remove('hidden');
        document.getElementById('searchInfo').innerHTML = `<i class="fas fa-search"></i> Found ${results.length} result(s) for "${escapeHtml(query)}" <button onclick="clearSearch()" style="background:none;border:none;color:#60a5fa;cursor:pointer;margin-left:10px;">Clear</button>`;
        const contentDiv = document.getElementById('content'); 
        contentDiv.innerHTML = '';
        document.getElementById('backBtn').classList.remove('hidden');
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('departmentsSection').innerHTML = '';
        document.getElementById('breadcrumb').innerHTML = '';
        if(!results.length) {
            contentDiv.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No PDFs found.</p></div>';
        } else {
            results.forEach(f => contentDiv.appendChild(createCard(f.name, () => openPDF(f.dataUrl, f.name), false)));
        }
        updateStats(); 
        return;
    }
    isSearchMode = false;
    document.getElementById('clearSearchBtn').classList.add('hidden');
    document.getElementById('searchInfo').classList.add('hidden');
    document.getElementById('content').innerHTML = '';
    const folder = getCurrentFolderObject();
    if(!folder) { 
        currentPath = []; 
        render(); 
        return; 
    }
    document.getElementById('backBtn').classList.toggle('hidden', currentPath.length === 0);
    
    const bcDiv = document.getElementById('breadcrumb');
    bcDiv.innerHTML = `<div class="breadcrumb-item" onclick="navigateToBreadcrumb(-1)"><i class="fas fa-home"></i> Home</div>`;
    currentPath.forEach((f,i) => { 
        bcDiv.innerHTML += `<span class="breadcrumb-separator">/</span><div class="breadcrumb-item" onclick="navigateToBreadcrumb(${i})">${escapeHtml(f)}</div>`; 
    });
    
    if(currentPath.length === 0){
        let html = '<div class="section-title"><i class="fas fa-building"></i> Departments</div><div class="departments-grid">';
        for(let dept in fileSystem){
            const sub = Object.keys(fileSystem[dept]).length;
            const fcount = allFiles[dept] ? allFiles[dept].length : 0;
            html += `<div class="dept-card" data-dept="${dept}" onclick="selectDepartment('${dept}')"><div class="dept-oval"><span>${dept}</span></div><div class="dept-arrow"><i class="fas fa-chevron-right"></i></div><div class="dept-info">${sub+fcount} items</div></div>`;
        }
        html += '</div>';
        document.getElementById('departmentsSection').innerHTML = html;
    } else {
        document.getElementById('departmentsSection').innerHTML = '';
    }
    
    const isLeaf = Object.keys(folder).length === 0;
    const isRoot = currentPath.length === 0;
    document.getElementById('uploadBtn').classList.toggle('hidden', !(isLeaf && !isRoot));
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-bar';
    if(!isRoot) {
        actionDiv.innerHTML = `<button class="action-btn" onclick="renameCurrentFolder()"><i class="fas fa-edit"></i> Rename This Folder</button><button class="action-btn" onclick="deleteCurrentFolder()"><i class="fas fa-trash-alt"></i> Delete This Folder</button><button class="action-btn" onclick="addNewFolder()"><i class="fas fa-plus"></i> Add Subfolder</button>`;
    } else {
        actionDiv.innerHTML = `<button class="action-btn" onclick="addNewDepartment()"><i class="fas fa-building"></i> Add Department</button>`;
    }
    document.getElementById('content').appendChild(actionDiv);
    
    // Display folders (with rename button on each)
    if(!isRoot && !isLeaf) {
        for(let key in folder) {
            const folderCard = createCard(key, () => { currentPath.push(key); render(); }, true);
            document.getElementById('content').appendChild(folderCard);
        }
    }
    if(isLeaf && !isRoot){
        const files = getFilesForCurrentFolder();
        const path = currentPath.join('/');
        if(!files.length) {
            document.getElementById('content').innerHTML += '<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><p>No PDFs yet. Click Upload to add files.</p></div>';
        } else {
            files.forEach(f => document.getElementById('content').appendChild(createCard(f.name, () => openPDF(f.dataUrl, f.name), false, true, path, f.name, true)));
        }
    }
    updateStats();
}

function navigateToBreadcrumb(idx) { 
    if(idx === -1) {
        currentPath = []; 
    } else {
        currentPath = currentPath.slice(0, idx+1); 
    }
    render(); 
}

function renameCurrentFolder() { 
    if(!currentPath.length) return;
    const old = currentPath[currentPath.length-1];
    const newName = prompt("New folder name:", old);
    if(newName && newName !== old && newName.trim()){
        const parentPath = currentPath.slice(0,-1).join('/');
        renameFolder(parentPath, old, newName.trim());
    }
}

function deleteCurrentFolder() {
    if(!currentPath.length) return;
    const name = currentPath[currentPath.length-1];
    if(confirm(`Delete "${name}" and all contents?`)){
        const path = currentPath.join('/');
        delete allFiles[path];
        const parent = currentPath.slice(0,-1).reduce((o,p)=>o[p], fileSystem);
        delete parent[name];
        currentPath.pop();
        saveFolderStructure(); 
        saveAllFilesToDB(); 
        render(); 
        showToast(`🗑️ Folder "${name}" deleted`);
    }
}

function addNewFolder() {
    const name = prompt("Folder name:");
    if(name && name.trim()){
        const cur = getCurrentFolderObject();
        if(cur && !cur[name]){ 
            cur[name] = {}; 
            saveFolderStructure(); 
            render(); 
            showToast(`✅ Folder "${name}" created`); 
        } else {
            showToast("Exists", true);
        }
    }
}

function addNewDepartment() {
    const name = prompt("Department name:");
    if(name && name.trim() && !fileSystem[name]){ 
        fileSystem[name] = {}; 
        saveFolderStructure(); 
        render(); 
        showToast(`✅ Department "${name}" created`); 
    } else if(fileSystem[name]) {
        showToast("Department exists", true);
    }
}

function updateStats() {
    let folderCount = 0, fileCount = 0;
    function countFolders(obj) { 
        for(let k in obj) { 
            if(typeof obj[k] === 'object') { 
                folderCount++; 
                countFolders(obj[k]); 
            } 
        } 
    }
    countFolders(fileSystem);
    for(let k in allFiles) {
        if(allFiles[k]) {
            fileCount += allFiles[k].length;
        }
    }
    document.getElementById('folderCount').textContent = folderCount;
    document.getElementById('fileCount').textContent = fileCount;
}

function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.querySelector('span').textContent = msg;
    toast.style.background = isErr ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)";
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function escapeHtml(str) { 
    const div = document.createElement('div'); 
    div.textContent = str; 
    return div.innerHTML; 
}

function toggleTheme() { 
    document.body.classList.toggle('light-mode'); 
    localStorage.setItem('oarcel_theme', document.body.classList.contains('light-mode') ? 'light-mode' : ''); 
    updateThemeIcon(); 
}

function updateThemeIcon() { 
    const isDark = !document.body.classList.contains('light-mode'); 
    const themeBtn = document.getElementById('themeToggle');
    if(themeBtn) {
        themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i><span>Light</span>' : '<i class="fas fa-moon"></i><span>Dark</span>';
    }
}

// Expose global functions
window.selectDepartment = selectDepartment;
window.goBack = goBack;
window.triggerUpload = triggerUpload;
window.clearSearch = clearSearch;
window.navigateToBreadcrumb = navigateToBreadcrumb;
window.renameCurrentFolder = renameCurrentFolder;
window.deleteCurrentFolder = deleteCurrentFolder;
window.addNewFolder = addNewFolder;
window.addNewDepartment = addNewDepartment;
window.openPDF = openPDF;
window.renameFile = (p, old) => { 
    const nu = prompt("New name:", old.replace('.pdf', '')); 
    if(nu && nu.trim()) renameFileInFolder(p, old, nu.trim()); 
};
window.deleteFile = (p, n) => { 
    if(confirm(`Delete "${n}"?`)) deleteFileFromFolder(p, n); 
};
window.renameFolderPrompt = (parentPath, oldName) => {
    const newName = prompt("New folder name:", oldName);
    if (newName && newName.trim() && newName !== oldName) {
        renameFolder(parentPath, oldName, newName.trim());
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const themeBtn = document.getElementById('themeToggle');
    if(themeBtn) themeBtn.onclick = toggleTheme;
    
    if(localStorage.getItem('oarcel_theme') === 'light-mode') {
        document.body.classList.add('light-mode');
    }
    updateThemeIcon();
    
    const fileInput = document.getElementById('fileInput');
    if(fileInput) {
        fileInput.addEventListener('change', async(e) => {
            const files = Array.from(e.target.files);
            for(let f of files) {
                if(f.type === 'application/pdf') {
                    await addFileToCurrentFolder(f);
                }
            }
            showToast(`${files.length} PDF(s) saved!`);
            render();
            e.target.value = '';
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', () => render());
    }
    
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if(clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }
    
    const backBtn = document.getElementById('backBtn');
    if(backBtn) {
        backBtn.addEventListener('click', goBack);
    }
    
    const uploadBtn = document.getElementById('uploadBtn');
    if(uploadBtn) {
        uploadBtn.addEventListener('click', triggerUpload);
    }
    
    try {
        await initDB();
        await loadFromIndexedDB();
    } catch(e) {
        console.error(e);
        showToast('Database error', true);
    }
});