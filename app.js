// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 4;
let db = null;
let allFiles = {};
let fileSystem = {};
let currentPath = [];
let isSearchMode = false;

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
        if (folderReq.result) fileSystem = folderReq.result.value;
        else {
            fileSystem = {
                "REMELT":{"A":{},"B":{},"C":{},"D":{},"E":{},"F":{},"G":{},"H":{},"I":{},"J":{},"K":{},"L":{},"M":{},"N":{},"O":{},"P":{},"Q":{},"R":{},"S":{},"T":{},"U":{},"V":{},"W":{},"X":{},"Y":{},"Z":{}},
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
    // Store as blob directly (not dataURL) to avoid memory issues
    const blob = file.slice(0, file.size, file.type);
    allFiles[folderPath].push({ name: file.name, blob: blob });
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

// Open PDF in new tab using browser's native viewer (guaranteed multi-page support)
function openPDF(fileBlob, fileName) {
    const blobUrl = URL.createObjectURL(fileBlob);
    window.open(blobUrl, '_blank');
    showToast(`Opening ${fileName} in new tab. Close tab to return.`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

function selectDepartment(d) { currentPath = [d]; render(); }
function goBack() { if(currentPath.length && !isSearchMode) { currentPath.pop(); render(); } else if(isSearchMode) clearSearch(); }
function triggerUpload() { document.getElementById('fileInput').click(); }
function clearSearch() { document.getElementById('searchInput').value = ''; isSearchMode = false; document.getElementById('searchInfo').classList.add('hidden'); document.getElementById('clearSearchBtn').classList.add('hidden'); render(); }

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

function createCard(title, onClick, isFolder=false, showDel=false, delPath=null, delName=null, showRename=false) {
    const div = document.createElement('div'); div.className = 'card';
    div.innerHTML = `
        <div class="card-icon"><i class="fas ${isFolder ? 'fa-folder' : 'fa-file-pdf'}" style="color:${isFolder ? '#fbbf24' : '#60a5fa'}"></i></div>
        <div class="card-filename">${escapeHtml(title)}</div>
        <div class="card-buttons">
            ${showRename ? `<button class="rename-file-btn" onclick="event.stopPropagation(); window.renameFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-edit"></i> Rename</button>` : ''}
            ${showDel ? `<button class="delete-btn" onclick="event.stopPropagation(); window.deleteFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
        </div>
    `;
    div.onclick = onClick; return div;
}

function render() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    if(query) {
        isSearchMode = true;
        document.getElementById('clearSearchBtn').classList.remove('hidden');
        const results = searchFiles(query);
        document.getElementById('searchInfo').classList.remove('hidden');
        document.getElementById('searchInfo').innerHTML = `<i class="fas fa-search"></i> Found ${results.length} result(s) for "${escapeHtml(query)}" <button onclick="clearSearch()" style="background:none;border:none;color:#60a5fa;cursor:pointer;margin-left:10px;">Clear</button>`;
        const contentDiv = document.getElementById('content'); contentDiv.innerHTML = '';
        document.getElementById('backBtn').classList.remove('hidden');
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('departmentsSection').innerHTML = '';
        document.getElementById('breadcrumb').innerHTML = '';
        if(!results.length) contentDiv.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No PDFs found.</p></div>';
        else results.forEach(f => contentDiv.appendChild(createCard(f.name, () => openPDF(f.blob, f.name), false)));
        updateStats(); return;
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
    } else document.getElementById('departmentsSection').innerHTML = '';
    
    const isLeaf = Object.keys(folder).length === 0;
    const isRoot = currentPath.length === 0;
    document.getElementById('uploadBtn').classList.toggle('hidden', !(isLeaf && !isRoot));
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-bar';
    if(!isRoot) actionDiv.innerHTML = `<button class="action-btn" onclick="renameCurrentFolder()"><i class="fas fa-edit"></i> Rename Folder</button><button class="action-btn" onclick="deleteCurrentFolder()"><i class="fas fa-trash-alt"></i> Delete Folder</button><button class="action-btn" onclick="addNewFolder()"><i class="fas fa-plus"></i> Add Subfolder</button>`;
    else actionDiv.innerHTML = `<button class="action-btn" onclick="addNewDepartment()"><i class="fas fa-building"></i> Add Department</button>`;
    document.getElementById('content').appendChild(actionDiv);
    
    if(!isRoot && !isLeaf) for(let key in folder) document.getElementById('content').appendChild(createCard(key, () => { currentPath.push(key); render(); }, true));
    if(isLeaf && !isRoot){
        const files = getFilesForCurrentFolder();
        const path = currentPath.join('/');
        if(!files.length) document.getElementById('content').innerHTML += '<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><p>No PDFs yet. Click Upload to add files.</p></div>';
        else files.forEach(f => document.getElementById('content').appendChild(createCard(f.name, () => openPDF(f.blob, f.name), false, true, path, f.name, true)));
    }
    updateStats();
}

function navigateToBreadcrumb(idx) { if(idx === -1) currentPath = []; else currentPath = currentPath.slice(0, idx+1); render(); }
function renameCurrentFolder() { 
    if(!currentPath.length) return;
    const old = currentPath[currentPath.length-1], newName = prompt("New folder name:", old);
    if(newName && newName !== old && newName.trim()){
        const parent = currentPath.slice(0,-1).reduce((o,p)=>o[p], fileSystem);
        parent[newName] = parent[old]; delete parent[old];
        const oldPath = currentPath.join('/'), newPath = [...currentPath.slice(0,-1), newName].join('/');
        if(allFiles[oldPath]){ allFiles[newPath] = allFiles[oldPath]; delete allFiles[oldPath]; }
        currentPath[currentPath.length-1] = newName;
        saveFolderStructure(); saveAllFilesToDB(); render(); showToast(`✅ Renamed to "${newName}"`);
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
        saveFolderStructure(); saveAllFilesToDB(); render(); showToast(`🗑️ Folder "${name}" deleted`);
    }
}
function addNewFolder() {
    const name = prompt("Folder name:");
    if(name && name.trim()){
        const cur = getCurrentFolderObject();
        if(cur && !cur[name]){ cur[name] = {}; saveFolderStructure(); render(); showToast(`✅ Folder "${name}" created`); }
        else showToast("Exists", true);
    }
}
function addNewDepartment() {
    const name = prompt("Department name:");
    if(name && name.trim() && !fileSystem[name]){ fileSystem[name] = {}; saveFolderStructure(); render(); showToast(`✅ Department "${name}" created`); }
    else if(fileSystem[name]) showToast("Department exists", true);
}
function updateStats() {
    let folderCount = 0, fileCount = 0;
    function countFolders(obj) { for(let k in obj) { if(typeof obj[k] === 'object') { folderCount++; countFolders(obj[k]); } } }
    countFolders(fileSystem);
    for(let k in allFiles) fileCount += allFiles[k].length;
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
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function toggleTheme() { document.body.classList.toggle('light-mode'); localStorage.setItem('oarcel_theme', document.body.classList.contains('light-mode') ? 'light-mode' : ''); updateThemeIcon(); }
function updateThemeIcon() { const isDark = !document.body.classList.contains('light-mode'); document.getElementById('themeToggle').innerHTML = isDark ? '<i class="fas fa-sun"></i><span>Light</span>' : '<i class="fas fa-moon"></i><span>Dark</span>'; }

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('themeToggle').onclick = toggleTheme;
    if(localStorage.getItem('oarcel_theme') === 'light-mode') document.body.classList.add('light-mode');
    updateThemeIcon();
    document.getElementById('fileInput').addEventListener('change', async(e) => {
        const files = Array.from(e.target.files);
        for(let f of files) if(f.type === 'application/pdf') await addFileToCurrentFolder(f);
        showToast(`${files.length} PDF(s) saved!`); render(); e.target.value = '';
    });
    document.getElementById('searchInput').addEventListener('input', () => render());
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    window.deleteFile = (p,n) => { if(confirm(`Delete "${n}"?`)) deleteFileFromFolder(p,n); };
    window.renameFile = (p,old) => { const nu = prompt("New name:", old.replace('.pdf','')); if(nu?.trim()) renameFileInFolder(p, old, nu.trim()); };
    
    try {
        await initDB();
        await loadFromIndexedDB();
    } catch(e) {
        console.error(e);
        showToast('Database error', true);
    }
});

window.goBack = goBack; 
window.triggerUpload = triggerUpload; 
window.selectDepartment = selectDepartment; 
window.navigateToBreadcrumb = navigateToBreadcrumb;
window.renameCurrentFolder = renameCurrentFolder; 
window.deleteCurrentFolder = deleteCurrentFolder; 
window.addNewFolder = addNewFolder; 
window.addNewDepartment = addNewDepartment;
window.openPDF = openPDF;
window.clearSearch = clearSearch;