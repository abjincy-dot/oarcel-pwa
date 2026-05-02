<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
    <title>Oarcel Document Manager</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            transition: all 0.2s ease;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #f1f5f9;
            min-height: 100vh;
            padding: 20px;
        }

        body.light-mode {
            background: #f1f5f9;
            color: #0f172a;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 25px;
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(10px);
            padding: 15px 25px;
            border-radius: 2rem;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .light-mode .header {
            background: rgba(255,255,255,0.7);
            border-color: rgba(0,0,0,0.05);
        }
        .logo h1 {
            font-size: 1.6rem;
            background: linear-gradient(135deg, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
        }
        .stats {
            display: flex;
            gap: 20px;
        }
        .stat {
            background: rgba(0,0,0,0.3);
            padding: 5px 12px;
            border-radius: 40px;
            font-size: 0.85rem;
            font-weight: 500;
        }
        .light-mode .stat {
            background: rgba(0,0,0,0.05);
        }
        .theme-btn {
            background: #334155;
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
        }
        .light-mode .theme-btn {
            background: #e2e8f0;
            color: #0f172a;
        }

        /* Search Bar */
        .search-section {
            margin-bottom: 25px;
        }
        .search-wrapper {
            display: flex;
            gap: 10px;
            background: #1e293b;
            border-radius: 60px;
            padding: 5px 20px;
            align-items: center;
            border: 1px solid #334155;
        }
        .light-mode .search-wrapper {
            background: white;
            border-color: #cbd5e1;
        }
        .search-wrapper i {
            color: #94a3b8;
        }
        #searchInput {
            flex: 1;
            background: none;
            border: none;
            padding: 14px 0;
            font-size: 1rem;
            color: inherit;
            outline: none;
        }
        #clearSearchBtn {
            background: none;
            border: none;
            color: #f87171;
            cursor: pointer;
            font-size: 1.2rem;
        }
        #searchInfo {
            margin-top: 12px;
            font-size: 0.85rem;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
        }
        .hidden {
            display: none !important;
        }

        /* Breadcrumb + Actions */
        .nav-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
            margin-bottom: 20px;
        }
        .breadcrumb {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            background: #1e293b;
            padding: 8px 18px;
            border-radius: 60px;
            gap: 5px;
        }
        .light-mode .breadcrumb {
            background: #e2e8f0;
        }
        .breadcrumb-item {
            cursor: pointer;
            font-weight: 500;
            padding: 4px 8px;
            border-radius: 30px;
            transition: 0.1s;
        }
        .breadcrumb-item:hover {
            background: #334155;
        }
        .light-mode .breadcrumb-item:hover {
            background: #cbd5e1;
        }
        .breadcrumb-separator {
            color: #64748b;
        }
        .action-buttons {
            display: flex;
            gap: 10px;
        }
        .icon-btn {
            background: #3b82f6;
            border: none;
            color: white;
            padding: 8px 18px;
            border-radius: 40px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .icon-btn.outline {
            background: transparent;
            border: 1px solid #3b82f6;
            color: #3b82f6;
        }
        .light-mode .icon-btn.outline {
            border-color: #2563eb;
            color: #2563eb;
        }

        /* Departments Grid */
        .section-title {
            font-size: 1.2rem;
            margin: 20px 0 15px 5px;
            font-weight: 600;
        }
        .departments-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 18px;
            margin-bottom: 30px;
        }
        .dept-card {
            background: linear-gradient(145deg, #1e293b, #0f172a);
            border-radius: 1.5rem;
            padding: 1rem 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid #334155;
        }
        .light-mode .dept-card {
            background: white;
            border-color: #e2e8f0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        .dept-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 20px rgba(0,0,0,0.2);
        }
        .dept-oval {
            background: #3b82f6;
            padding: 10px 20px;
            border-radius: 60px;
            font-weight: bold;
        }
        .dept-arrow i {
            font-size: 1.4rem;
            color: #64748b;
        }
        .dept-info {
            font-size: 0.8rem;
            color: #94a3b8;
        }

        /* Cards (Folders + PDFs) */
        .content-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .card {
            background: #1e293b;
            border-radius: 1.2rem;
            padding: 18px 12px 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #334155;
            position: relative;
        }
        .light-mode .card {
            background: white;
            border-color: #e2e8f0;
        }
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 25px rgba(0,0,0,0.2);
        }
        .card-icon i {
            font-size: 3rem;
            margin-bottom: 10px;
        }
        .card-filename {
            font-weight: 500;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 12px;
        }
        .card-buttons {
            display: flex;
            justify-content: center;
            gap: 12px;
        }
        .delete-btn, .rename-file-btn {
            background: #ef4444;
            border: none;
            color: white;
            padding: 4px 10px;
            border-radius: 30px;
            font-size: 0.7rem;
            cursor: pointer;
        }
        .rename-file-btn {
            background: #f59e0b;
        }

        .action-bar {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 1px solid #334155;
        }
        .action-btn {
            background: #2d3748;
            border: none;
            padding: 8px 18px;
            border-radius: 40px;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .light-mode .action-btn {
            background: #e2e8f0;
            color: #0f172a;
        }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #64748b;
        }
        .empty-state i {
            font-size: 4rem;
            margin-bottom: 15px;
        }

        /* Toast */
        #toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg,#10b981,#059669);
            color: white;
            padding: 12px 24px;
            border-radius: 60px;
            font-weight: 500;
            z-index: 1000;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            transition: opacity 0.3s;
        }
        @media (max-width: 700px) {
            .header { flex-direction: column; align-items: stretch; }
            .stats { justify-content: center; }
        }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div class="logo"><h1><i class="fas fa-database"></i> Oarcel Vault</h1></div>
        <div class="stats"><div class="stat"><i class="fas fa-folder"></i> Folders: <span id="folderCount">0</span></div><div class="stat"><i class="fas fa-file-pdf"></i> PDFs: <span id="fileCount">0</span></div></div>
        <button id="themeToggle" class="theme-btn"><i class="fas fa-moon"></i><span>Dark</span></button>
    </div>
    <div class="search-section"><div class="search-wrapper"><i class="fas fa-search"></i><input type="text" id="searchInput" placeholder="Search PDFs..."><button id="clearSearchBtn" class="hidden"><i class="fas fa-times-circle"></i></button></div><div id="searchInfo" class="hidden"></div></div>
    <div class="nav-bar"><div class="breadcrumb" id="breadcrumb"></div><div class="action-buttons"><button id="backBtn" class="icon-btn outline hidden"><i class="fas fa-arrow-left"></i> Back</button><button id="uploadBtn" class="icon-btn hidden"><i class="fas fa-upload"></i> Upload PDF</button></div></div>
    <div id="departmentsSection"></div>
    <div id="content" class="content-grid"></div>
</div>
<input type="file" id="fileInput" accept=".pdf" multiple style="display:none">
<div id="toast" class="hidden"><span></span></div>

<script>
// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 4;
let db = null;
let allFiles = {};
let fileSystem = {};
let currentPath = [];
let isSearchMode = false;

// ==================== PDF VIEWER - Opens in new tab for full multi-page support ====================
function openPDF(dataUrl, fileName) {
    showToast(`Opening ${fileName}...`);
    fetch(dataUrl).then(response => response.blob()).then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        showToast(`PDF opened in new tab. Close tab to return.`);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }).catch(err => { console.error('PDF error:', err); showToast(`Failed to open PDF: ${err.message}`, true); });
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

async function loadFromIndexedDB() {
    const folderReq = db.transaction('folderStructure', 'readonly').objectStore('folderStructure').get('structure');
    folderReq.onsuccess = () => {
        if (folderReq.result) {
            fileSystem = folderReq.result.value;
        } else {
            // ***** MODIFICATION: Added a subfolder "Data Logs" inside FURNACE 1 *****
            fileSystem = {
                "REMELT": {
                    "FURNACE 1": { "Data Logs": {} },   // <-- Folder added inside FURNACE 1
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
                    "M": {},
                    "N": {},
                    "O": {},
                    "P": {},
                    "Q": {},
                    "R": {},
                    "S": {},
                    "T": {},
                    "U": {},
                    "V": {},
                    "W": {},
                    "X": {},
                    "Y": {},
                    "Z": {}
                },
                "CASTER": {"Quality Reports":{},"Mechanical":{},"Maintenance":{},"Production Data":{},"Testing":{},"Checklists":{},"Safety":{},"Training":{}},
                "HRM": {"Employee Records":{},"Attendance":{},"Performance":{},"Training Logs":{},"Safety Compliance":{},"Policies":{},"Reports":{},"Certifications":{}},
                "CRM": {"PLC Programs":{},"CAD Drawings":{},"Electrical":{},"SCADA":{},"Automation":{},"Reports":{},"Configurations":{},"Manuals":{}},
                "ANNEALING": {"Temperature Control":{},"Process Parameters":{},"Quality Assurance":{},"Maintenance":{},"Safety":{},"Production Logs":{},"Testing":{},"SOP Documents":{}},
                "TLL": {"PLC Programs":{},"CAD Drawings":{},"Maintenance":{},"Production Logs":{},"Process Optimization":{},"Quality Reports":{},"Manuals":{},"Safety":{}},
                "SLITTER": {"Blade Maintenance":{},"Quality Control":{},"Production Reports":{},"Mechanical":{},"Safety":{},"Checklists":{},"Training":{},"Testing":{}},
                "UTILITY": {"Power Supply":{},"Water System":{},"Compressed Air":{},"HVAC":{},"Reports":{},"Safety":{},"Manuals":{},"Testing":{}}
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

function selectDepartment(d) { currentPath = [d]; render(); }
function goBack() { if(currentPath.length && !isSearchMode) { currentPath.pop(); render(); } else if(isSearchMode) { clearSearch(); } }
function triggerUpload() { document.getElementById('fileInput').click(); }
function clearSearch() { document.getElementById('searchInput').value = ''; isSearchMode = false; document.getElementById('searchInfo').classList.add('hidden'); document.getElementById('clearSearchBtn').classList.add('hidden'); render(); }
function searchFiles(q) { if(!q.trim()) return []; const all = []; for(const path in allFiles) { if(allFiles[path]) { allFiles[path].forEach(f => all.push({...f, folder:path})); } } return all.filter(f => f.name.toLowerCase().includes(q.toLowerCase())); }

function createCard(title, onClick, isFolder=false, showDel=false, delPath=null, delName=null, showRename=false) {
    const div = document.createElement('div'); 
    div.className = 'card';
    div.innerHTML = `<div class="card-icon"><i class="fas ${isFolder ? 'fa-folder' : 'fa-file-pdf'}" style="color:${isFolder ? '#fbbf24' : '#60a5fa'}"></i></div><div class="card-filename">${escapeHtml(title)}</div><div class="card-buttons">${showRename ? `<button class="rename-file-btn" onclick="event.stopPropagation(); window.renameFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-edit"></i> Rename</button>` : ''}${showDel ? `<button class="delete-btn" onclick="event.stopPropagation(); window.deleteFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-trash"></i> Delete</button>` : ''}</div></div>`;
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
    if(!folder) { currentPath = []; render(); return; }
    document.getElementById('backBtn').classList.toggle('hidden', currentPath.length === 0);
    
    const bcDiv = document.getElementById('breadcrumb');
    bcDiv.innerHTML = `<div class="breadcrumb-item" onclick="navigateToBreadcrumb(-1)"><i class="fas fa-home"></i> Home</div>`;
    currentPath.forEach((f,i) => { bcDiv.innerHTML += `<span class="breadcrumb-separator">/</span><div class="breadcrumb-item" onclick="navigateToBreadcrumb(${i})">${escapeHtml(f)}</div>`; });
    
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
        actionDiv.innerHTML = `<button class="action-btn" onclick="renameCurrentFolder()"><i class="fas fa-edit"></i> Rename Folder</button><button class="action-btn" onclick="deleteCurrentFolder()"><i class="fas fa-trash-alt"></i> Delete Folder</button><button class="action-btn" onclick="addNewFolder()"><i class="fas fa-plus"></i> Add Subfolder</button>`;
    } else {
        actionDiv.innerHTML = `<button class="action-btn" onclick="addNewDepartment()"><i class="fas fa-building"></i> Add Department</button>`;
    }
    document.getElementById('content').appendChild(actionDiv);
    
    if(!isRoot && !isLeaf) {
        for(let key in folder) {
            document.getElementById('content').appendChild(createCard(key, () => { currentPath.push(key); render(); }, true));
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

function navigateToBreadcrumb(idx) { if(idx === -1) { currentPath = []; } else { currentPath = currentPath.slice(0, idx+1); } render(); }
function renameCurrentFolder() { if(!currentPath.length) return; const old = currentPath[currentPath.length-1]; const newName = prompt("New folder name:", old); if(newName && newName !== old && newName.trim()){ const parent = currentPath.slice(0,-1).reduce((o,p)=>o[p], fileSystem); parent[newName] = parent[old]; delete parent[old]; const oldPath = currentPath.join('/'); const newPath = [...currentPath.slice(0,-1), newName].join('/'); if(allFiles[oldPath]){ allFiles[newPath] = allFiles[oldPath]; delete allFiles[oldPath]; } currentPath[currentPath.length-1] = newName; saveFolderStructure(); saveAllFilesToDB(); render(); showToast(`✅ Renamed to "${newName}"`); } }
function deleteCurrentFolder() { if(!currentPath.length) return; const name = currentPath[currentPath.length-1]; if(confirm(`Delete "${name}" and all contents?`)){ const path = currentPath.join('/'); delete allFiles[path]; const parent = currentPath.slice(0,-1).reduce((o,p)=>o[p], fileSystem); delete parent[name]; currentPath.pop(); saveFolderStructure(); saveAllFilesToDB(); render(); showToast(`🗑️ Folder "${name}" deleted`); } }
function addNewFolder() { const name = prompt("Folder name:"); if(name && name.trim()){ const cur = getCurrentFolderObject(); if(cur && !cur[name]){ cur[name] = {}; saveFolderStructure(); render(); showToast(`✅ Folder "${name}" created`); } else { showToast("Exists", true); } } }
function addNewDepartment() { const name = prompt("Department name:"); if(name && name.trim() && !fileSystem[name]){ fileSystem[name] = {}; saveFolderStructure(); render(); showToast(`✅ Department "${name}" created`); } else if(fileSystem[name]) { showToast("Department exists", true); } }
function updateStats() { let folderCount = 0, fileCount = 0; function countFolders(obj) { for(let k in obj) { if(typeof obj[k] === 'object') { folderCount++; countFolders(obj[k]); } } } countFolders(fileSystem); for(let k in allFiles) { if(allFiles[k]) { fileCount += allFiles[k].length; } } document.getElementById('folderCount').textContent = folderCount; document.getElementById('fileCount').textContent = fileCount; }
function showToast(msg, isErr = false) { const toast = document.getElementById('toast'); toast.querySelector('span').textContent = msg; toast.style.background = isErr ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)"; toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 3000); }
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function toggleTheme() { document.body.classList.toggle('light-mode'); localStorage.setItem('oarcel_theme', document.body.classList.contains('light-mode') ? 'light-mode' : ''); updateThemeIcon(); }
function updateThemeIcon() { const isDark = !document.body.classList.contains('light-mode'); const themeBtn = document.getElementById('themeToggle'); if(themeBtn) { themeBtn.innerHTML = isDark ? '<i class="fas fa-sun"></i><span>Light</span>' : '<i class="fas fa-moon"></i><span>Dark</span>'; } }

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
window.renameFile = (p, old) => { const nu = prompt("New name:", old.replace('.pdf', '')); if(nu && nu.trim()) renameFileInFolder(p, old, nu.trim()); };
window.deleteFile = (p, n) => { if(confirm(`Delete "${n}"?`)) deleteFileFromFolder(p, n); };

document.addEventListener('DOMContentLoaded', async () => {
    const themeBtn = document.getElementById('themeToggle');
    if(themeBtn) themeBtn.onclick = toggleTheme;
    if(localStorage.getItem('oarcel_theme') === 'light-mode') { document.body.classList.add('light-mode'); }
    updateThemeIcon();
    const fileInput = document.getElementById('fileInput');
    if(fileInput) { fileInput.addEventListener('change', async(e) => { const files = Array.from(e.target.files); for(let f of files) { if(f.type === 'application/pdf') { await addFileToCurrentFolder(f); } } showToast(`${files.length} PDF(s) saved!`); render(); e.target.value = ''; }); }
    const searchInput = document.getElementById('searchInput'); if(searchInput) { searchInput.addEventListener('input', () => render()); }
    const clearSearchBtn = document.getElementById('clearSearchBtn'); if(clearSearchBtn) { clearSearchBtn.addEventListener('click', clearSearch); }
    const backBtn = document.getElementById('backBtn'); if(backBtn) { backBtn.addEventListener('click', goBack); }
    const uploadBtn = document.getElementById('uploadBtn'); if(uploadBtn) { uploadBtn.addEventListener('click', triggerUpload); }
    try { await initDB(); await loadFromIndexedDB(); } catch(e) { console.error(e); showToast('Database error', true); }
});
</script>
</body>
</html>