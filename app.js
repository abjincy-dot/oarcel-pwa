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

function saveFlag(key, value) {
    const tx = db.transaction('folderStructure', 'readwrite');
    tx.objectStore('folderStructure').put({ key: key, value: value });
    tx.commit();
}

function getFlag(key) {
    return new Promise((resolve) => {
        const tx = db.transaction('folderStructure', 'readonly');
        const req = tx.objectStore('folderStructure').get(key);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => resolve(null);
    });
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

// One‑time creation of Data Log 1‑20 inside FURNACE 1
async function ensureFurnace1DataLogsOnce() {
    const alreadyDone = await getFlag('dataLogsInitialized');
    if (alreadyDone) return; // never run again

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
        // optional: keep old "Data Logs" for compatibility
        if (!furnace1["Data Logs"]) {
            furnace1["Data Logs"] = {};
            changed = true;
        }
        if (changed) {
            saveFolderStructure();
            showToast("✅ Added Data Log 1‑20 folders inside FURNACE 1");
        }
        // Set flag so this never runs again
        saveFlag('dataLogsInitialized', true);
    }
}

async function loadFromIndexedDB() {
    const folderReq = db.transaction('folderStructure', 'readonly').objectStore('folderStructure').get('structure');
    folderReq.onsuccess = async () => {
        if (folderReq.result) {
            fileSystem = folderReq.result.value;
            // Run the one‑time creator (will skip if already done)
            await ensureFurnace1DataLogsOnce();
        } else {
            // Fresh install: create full structure with Data Log 1‑20
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
            // For fresh install, also set the flag so future loads don't recreate
            saveFlag('dataLogsInitialized', true);
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

// Rename any folder (updates fileSystem and allFiles keys)
function renameFolder(parentPath, oldName, newName) {
    if (!newName || newName.trim() === "") return;
    newName = newName.trim();
    let parent = fileSystem;
    if (parentPath.length > 0) {
        parent = parentPath.split('/').reduce((o, p) => o?.[p], fileSystem);
    }
    if (parent && parent[oldName]) {
        parent[newName] = parent[oldName];
        delete parent[oldName];
        const oldFolderPath = parentPath ? `${parentPath}/${oldName}` : oldName;
        const newFolderPath = parentPath ? `${parentPath}/${newName}` : newName;
        if (allFiles[oldFolderPath]) {
            allFiles[newFolderPath] = allFiles[oldFolderPath];
            delete allFiles[oldFolderPath];
        }
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

// createCard with Rename button for folders
function createCard(title, onClick, isFolder=false, showDel=false, delPath=null, delName=null, showRename=false, folderParentPath=null) {
    const div = document.createElement('div'); 
    div.className = 'card';
    let renameButton = '';
    if (isFolder) {
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