
// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 6;
let db = null;
let allFiles = {};
let fileSystem = {};
let currentPath = [];
let isSearchMode = false;
let currentFilterType = 'all';
let currentViewingNote = null;

// Helper to check if a file is a note (text file)
function isNoteFile(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    return ['txt', 'md', 'note'].includes(ext);
}

function getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (['txt', 'md', 'note'].includes(ext)) return 'note';
    return 'other';
}

function openPDF(dataUrl, fileName) {
    showToast(`Opening ${fileName}...`);
    fetch(dataUrl)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            showToast(`PDF opened in new tab.`);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        })
        .catch(err => {
            console.error('PDF error:', err);
            showToast(`Failed to open PDF: ${err.message}`, true);
        });
}

function openNote(dataUrl, fileName) {
    // Extract text content from data URL
    const text = decodeURIComponent(escape(atob(dataUrl.split(',')[1])));
    currentViewingNote = { name: fileName, content: text, folderPath: currentPath.join('/') };
    document.getElementById('viewNoteTitle').innerHTML = `<i class="fas fa-file-alt"></i> ${escapeHtml(fileName)}`;
    document.getElementById('viewNoteContent').innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(text)}</pre>`;
    document.getElementById('viewNoteModal').classList.add('show');
}

function editCurrentNote() {
    if (currentViewingNote) {
        closeViewNoteModal();
        document.getElementById('noteTitle').value = currentViewingNote.name.replace(/\.(txt|md|note)$/, '');
        document.getElementById('noteContent').value = currentViewingNote.content;
        document.getElementById('noteModal').classList.add('show');
        // Remove old note after editing
        deleteFileFromFolder(currentViewingNote.folderPath, currentViewingNote.name, false);
    }
}

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

function createFurnaceDataLogs() {
    const logs = { "Data Logs": {} };
    for (let i = 1; i <= 20; i++) {
        logs[`Data Log ${i}`] = {};
    }
    return logs;
}

function migrateFurnacesDataLogs() {
    let changed = false;
    const remelt = fileSystem["REMELT"];
    if (!remelt) return false;
    const furnaces = ["FURNACE 2", "FURNACE 3", "FURNACE 4"];
    for (const furnace of furnaces) {
        const furnaceObj = remelt[furnace];
        if (furnaceObj && typeof furnaceObj === 'object') {
            const hasDataLog = Object.keys(furnaceObj).some(key => 
                key === "Data Logs" || /^Data Log \d+$/.test(key)
            );
            if (!hasDataLog) {
                Object.assign(furnaceObj, createFurnaceDataLogs());
                changed = true;
            }
        }
    }
    return changed;
}

async function loadFromIndexedDB() {
    const folderReq = db.transaction('folderStructure', 'readonly').objectStore('folderStructure').get('structure');
    folderReq.onsuccess = () => {
        if (folderReq.result) {
            fileSystem = folderReq.result.value;
            const migrated = migrateFurnacesDataLogs();
            if (migrated) {
                saveFolderStructure();
                showToast("✅ Added Data Log folders to FURNACE 2, 3, 4");
            }
        } else {
            fileSystem = {
                "REMELT": {
                    "FURNACE 1": createFurnaceDataLogs(),
                    "FURNACE 2": createFurnaceDataLogs(),
                    "FURNACE 3": createFurnaceDataLogs(),
                    "FURNACE 4": createFurnaceDataLogs(),
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
                "CASTER": { "Quality Reports": {}, "Mechanical": {}, "Maintenance": {}, "Production Data": {}, "Testing": {}, "Checklists": {}, "Safety": {}, "Training": {} },
                "HRM": { "Employee Records": {}, "Attendance": {}, "Performance": {}, "Training Logs": {}, "Safety Compliance": {}, "Policies": {}, "Reports": {}, "Certifications": {} },
                "CRM": { "PLC Programs": {}, "CAD Drawings": {}, "Electrical": {}, "SCADA": {}, "Automation": {}, "Reports": {}, "Configurations": {}, "Manuals": {} },
                "ANNEALING": { "Temperature Control": {}, "Process Parameters": {}, "Quality Assurance": {}, "Maintenance": {}, "Safety": {}, "Production Logs": {}, "Testing": {}, "SOP Documents": {} },
                "TLL": { "PLC Programs": {}, "CAD Drawings": {}, "Maintenance": {}, "Production Logs": {}, "Process Optimization": {}, "Quality Reports": {}, "Manuals": {}, "Safety": {} },
                "SLITTER": { "Blade Maintenance": {}, "Quality Control": {}, "Production Reports": {}, "Mechanical": {}, "Safety": {}, "Checklists": {}, "Training": {}, "Testing": {} },
                "UTILITY": { "Power Supply": {}, "Water System": {}, "Compressed Air": {}, "HVAC": {}, "Reports": {}, "Safety": {}, "Manuals": {}, "Testing": {} }
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

function getCurrentFolderObject() { return currentPath.reduce((o, p) => o?.[p], fileSystem); }
function getFilesForCurrentFolder() { return allFiles[currentPath.join('/')] || []; }

async function addFileToCurrentFolder(file) {
    const folderPath = currentPath.join('/');
    if (!allFiles[folderPath]) allFiles[folderPath] = [];
    const base64 = await new Promise(r => { const rd = new FileReader(); rd.onload = e => r(e.target.result); rd.readAsDataURL(file); });
    allFiles[folderPath].push({ name: file.name, dataUrl: base64 });
    await saveAllFilesToDB();
}

async function saveNoteToFolder(title, content) {
    const folderPath = currentPath.join('/');
    if (!allFiles[folderPath]) allFiles[folderPath] = [];
    const fileName = title.endsWith('.txt') ? title : title + '.txt';
    const dataUrl = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(content)));
    allFiles[folderPath].push({ name: fileName, dataUrl: dataUrl });
    await saveAllFilesToDB();
    render();
    showToast(`✅ Note "${fileName}" saved`);
}

function deleteFileFromFolder(folderPath, fileName, reRender = true) {
    if (allFiles[folderPath]) {
        allFiles[folderPath] = allFiles[folderPath].filter(f => f.name !== fileName);
        if (allFiles[folderPath].length === 0) delete allFiles[folderPath];
        saveAllFilesToDB();
        if (reRender) render();
        showToast(`✅ Deleted "${fileName}"`);
    }
}

function renameFileInFolder(folderPath, oldName, newName) {
    if (allFiles[folderPath]) {
        const idx = allFiles[folderPath].findIndex(f => f.name === oldName);
        if (idx !== -1) {
            const file = allFiles[folderPath][idx];
            const oldExt = oldName.split('.').pop();
            const newExt = newName.split('.').pop();
            if (oldExt !== newExt && !newName.includes('.')) {
                newName += '.' + oldExt;
            }
            allFiles[folderPath][idx].name = newName;
            saveAllFilesToDB();
            render();
            showToast(`✅ Renamed to "${newName}"`);
        }
    }
}

function selectDepartment(d) { currentPath = [d]; render(); }
function goBack() { if (currentPath.length && !isSearchMode) { currentPath.pop(); render(); } else if (isSearchMode) { clearSearch(); } }
function triggerUpload() { document.getElementById('fileInput').click(); }
function clearSearch() { document.getElementById('searchInput').value = ''; isSearchMode = false; document.getElementById('searchInfo').classList.add('hidden'); document.getElementById('clearSearchBtn').classList.add('hidden'); render(); }

function searchFiles(q) {
    if (!q.trim()) return [];
    const all = [];
    for (const path in allFiles) {
        if (allFiles[path]) {
            allFiles[path].forEach(f => all.push({ ...f, folder: path }));
        }
    }
    return all.filter(f => f.name.toLowerCase().includes(q.toLowerCase()));
}

function createCard(title, onClick, isFolder = false, showDel = false, delPath = null, delName = null, showRename = false, showView = false) {
    const div = document.createElement('div');
    const fileType = !isFolder ? getFileType(title) : null;
    div.className = isFolder ? 'card glow-folder' : (fileType === 'note' ? 'card note-card' : 'card');
    div.innerHTML = `
        <div class="card-icon"><i class="fas ${isFolder ? 'fa-folder' : (fileType === 'note' ? 'fa-file-alt' : 'fa-file-pdf')}"></i></div>
        <div class="card-filename">${escapeHtml(title)}</div>
        <div class="card-buttons">
            ${showView ? `<button class="view-btn" onclick="event.stopPropagation(); window.viewFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-eye"></i> View</button>` : ''}
            ${showRename ? `<button class="rename-file-btn" onclick="event.stopPropagation(); window.renameFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-edit"></i> Rename</button>` : ''}
            ${showDel ? `<button class="delete-btn" onclick="event.stopPropagation(); window.deleteFile('${delPath}','${escapeHtml(delName)}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
        </div>
    `;
    div.onclick = onClick;
    return div;
}

function render() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (query) {
        isSearchMode = true;
        document.getElementById('clearSearchBtn').classList.remove('hidden');
        let results = searchFiles(query);
        if (currentFilterType !== 'all') {
            results = results.filter(f => getFileType(f.name) === currentFilterType);
        }
        document.getElementById('searchInfo').classList.remove('hidden');
        document.getElementById('searchInfo').innerHTML = `<i class="fas fa-search"></i> Found ${results.length} result(s) for "${escapeHtml(query)}" <button onclick="clearSearch()">Clear</button>`;
        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = '';
        document.getElementById('backBtn').classList.remove('hidden');
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('createNoteBtn').classList.add('hidden');
        document.getElementById('departmentsSection').innerHTML = '';
        document.getElementById('breadcrumb').innerHTML = '';
        if (!results.length) {
            contentDiv.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No documents found.</p></div>';
        } else {
            results.forEach(f => {
                const isNote = getFileType(f.name) === 'note';
                contentDiv.appendChild(createCard(f.name, 
                    () => isNote ? openNote(f.dataUrl, f.name) : openPDF(f.dataUrl, f.name), 
                    false, false, null, null, false, false));
            });
        }
        updateStats();
        return;
    }
    
    isSearchMode = false;
    document.getElementById('clearSearchBtn').classList.add('hidden');
    document.getElementById('searchInfo').classList.add('hidden');
    document.getElementById('content').innerHTML = '';
    
    const folder = getCurrentFolderObject();
    if (!folder) { currentPath = []; render(); return; }
    
    document.getElementById('backBtn').classList.toggle('hidden', currentPath.length === 0);
    
    const bcDiv = document.getElementById('breadcrumb');
    bcDiv.innerHTML = `<div class="breadcrumb-item" onclick="navigateToBreadcrumb(-1)"><i class="fas fa-home"></i> Home</div>`;
    currentPath.forEach((f, i) => {
        bcDiv.innerHTML += `<span class="breadcrumb-separator">/</span><div class="breadcrumb-item" onclick="navigateToBreadcrumb(${i})">${escapeHtml(f)}</div>`;
    });
    
    const isRoot = currentPath.length === 0;
    
    if (isRoot) {
        let html = '<div class="section-title"><i class="fas fa-building"></i> Departments</div><div class="departments-grid">';
        for (let dept in fileSystem) {
            const sub = Object.keys(fileSystem[dept]).length;
            const fcount = allFiles[dept] ? allFiles[dept].length : 0;
            html += `<div class="dept-card" data-dept="${dept}" onclick="selectDepartment('${dept}')"><div class="dept-oval"><span>${dept}</span></div><div class="dept-arrow"><i class="fas fa-chevron-right"></i></div><div class="dept-info">${sub + fcount} items</div></div>`;
        }
        html += '</div>';
        document.getElementById('departmentsSection').innerHTML = html;
        // HIDE buttons on departments page
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('createNoteBtn').classList.add('hidden');
    } else {
        document.getElementById('departmentsSection').innerHTML = '';
    }
    
    const hasSubfolders = Object.keys(folder).length > 0;
    const isLeafFolder = !isRoot && !hasSubfolders;
    
    // Show/hide action buttons based on folder type
    if (isLeafFolder) {
        document.getElementById('uploadBtn').classList.remove('hidden');
        document.getElementById('createNoteBtn').classList.remove('hidden');
    } else {
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('createNoteBtn').classList.add('hidden');
    }
    
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-bar';
    if (!isRoot) {
        actionDiv.innerHTML = `
            <button class="action-btn" onclick="renameCurrentFolder()"><i class="fas fa-edit"></i> Rename Folder</button>
            <button class="action-btn" onclick="deleteCurrentFolder()"><i class="fas fa-trash-alt"></i> Delete Folder</button>
            <button class="action-btn" onclick="addNewFolder()"><i class="fas fa-plus"></i> Add Subfolder</button>
        `;
    } else {
        actionDiv.innerHTML = `<button class="action-btn" onclick="addNewDepartment()"><i class="fas fa-building"></i> Add Department</button>`;
    }
    document.getElementById('content').appendChild(actionDiv);
    
    if (!isRoot && hasSubfolders) {
        for (let key in folder) {
            document.getElementById('content').appendChild(createCard(key, () => { currentPath.push(key); render(); }, true));
        }
    }
    
    if (isLeafFolder) {
        let files = getFilesForCurrentFolder();
        if (currentFilterType !== 'all') {
            files = files.filter(f => getFileType(f.name) === currentFilterType);
        }
        const path = currentPath.join('/');
        if (files.length) {
            files.forEach(f => {
                const isNote = getFileType(f.name) === 'note';
                document.getElementById('content').appendChild(createCard(f.name, 
                    () => isNote ? openNote(f.dataUrl, f.name) : openPDF(f.dataUrl, f.name), 
                    false, true, path, f.name, true, isNote));
            });
        } else {
            const emptyMsg = currentFilterType === 'pdf' ? 'No PDFs yet. Click Upload to add files.' :
                            (currentFilterType === 'note' ? 'No notes yet. Click "New Note" to create one.' :
                            'No files yet. Click Upload to add PDFs or New Note to create notes.');
            document.getElementById('content').innerHTML += `<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><p>${emptyMsg}</p></div>`;
        }
    }
    
    updateStats();
}

function navigateToBreadcrumb(idx) {
    if (idx === -1) { currentPath = []; } 
    else { currentPath = currentPath.slice(0, idx + 1); }
    render();
}

function renameCurrentFolder() {
    if (!currentPath.length) return;
    const old = currentPath[currentPath.length - 1];
    const newName = prompt("New folder name:", old);
    if (newName && newName !== old && newName.trim()) {
        const parent = currentPath.slice(0, -1).reduce((o, p) => o[p], fileSystem);
        parent[newName] = parent[old];
        delete parent[old];
        const oldPath = currentPath.join('/');
        const newPath = [...currentPath.slice(0, -1), newName].join('/');
        if (allFiles[oldPath]) { allFiles[newPath] = allFiles[oldPath]; delete allFiles[oldPath]; }
        currentPath[currentPath.length - 1] = newName;
        saveFolderStructure();
        saveAllFilesToDB();
        render();
        showToast(`✅ Renamed to "${newName}"`);
    }
}

function deleteCurrentFolder() {
    if (!currentPath.length) return;
    const name = currentPath[currentPath.length - 1];
    if (confirm(`Delete "${name}" and all contents?`)) {
        const path = currentPath.join('/');
        delete allFiles[path];
        const parent = currentPath.slice(0, -1).reduce((o, p) => o[p], fileSystem);
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
    if (name && name.trim()) {
        const cur = getCurrentFolderObject();
        if (cur && !cur[name]) {
            cur[name] = {};
            saveFolderStructure();
            render();
            showToast(`✅ Folder "${name}" created`);
        } else { showToast("Exists", true); }
    }
}

function addNewDepartment() {
    const name = prompt("Department name:");
    if (name && name.trim() && !fileSystem[name]) {
        fileSystem[name] = {};
        saveFolderStructure();
        render();
        showToast(`✅ Department "${name}" created`);
    } else if (fileSystem[name]) { showToast("Department exists", true); }
}

function updateStats() {
    let folderCount = 0, pdfCount = 0, noteCount = 0;
    function countFolders(obj) { for (let k in obj) { if (typeof obj[k] === 'object') { folderCount++; countFolders(obj[k]); } } }
    countFolders(fileSystem);
    for (let k in allFiles) { 
        if (allFiles[k]) { 
            allFiles[k].forEach(f => {
                if (getFileType(f.name) === 'pdf') pdfCount++;
                else if (getFileType(f.name) === 'note') noteCount++;
            });
        }
    }
    document.getElementById('folderCount').textContent = folderCount;
    document.getElementById('pdfCount').textContent = pdfCount;
    document.getElementById('noteCount').textContent = noteCount;
}

function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.querySelector('span').textContent = msg;
    toast.style.background = isErr ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)";
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hidden');
    }, 3000);
}

function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

function toggleTheme() { document.body.classList.toggle('light-mode'); localStorage.setItem('oarcel_theme', document.body.classList.contains('light-mode') ? 'light-mode' : ''); updateThemeIcon(); }

function updateThemeIcon() {
    const isDark = !document.body.classList.contains('light-mode');
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) { themeBtn.innerHTML = `<div class="theme-icon-wrapper"><i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i></div>`; }
}

function openNoteModal() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('noteModal').classList.add('show');
}

function closeNoteModal() {
    document.getElementById('noteModal').classList.remove('show');
}

function closeViewNoteModal() {
    document.getElementById('viewNoteModal').classList.remove('show');
    currentViewingNote = null;
}

function saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value;
    if (!title) {
        showToast("Please enter a title", true);
        return;
    }
    saveNoteToFolder(title, content);
    closeNoteModal();
}

function setFilter(type) {
    currentFilterType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
        if (btn.dataset.type === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    render();
}

// Global functions
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
window.openNote = openNote;
window.renameFile = (p, old) => { const nu = prompt("New name:", old.replace(/\.[^/.]+$/, '')); if (nu && nu.trim()) renameFileInFolder(p, old, nu.trim()); };
window.deleteFile = (p, n) => { if (confirm(`Delete "${n}"?`)) deleteFileFromFolder(p, n); };
window.viewFile = (p, n) => {
    const file = allFiles[p]?.find(f => f.name === n);
    if (file) {
        if (getFileType(n) === 'note') {
            openNote(file.dataUrl, n);
        } else {
            openPDF(file.dataUrl, n);
        }
    }
};
window.openNoteModal = openNoteModal;
window.closeNoteModal = closeNoteModal;
window.closeViewNoteModal = closeViewNoteModal;
window.saveNote = saveNote;
window.setFilter = setFilter;
window.editCurrentNote = editCurrentNote;

document.addEventListener('DOMContentLoaded', async () => {
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.onclick = toggleTheme;
    if (localStorage.getItem('oarcel_theme') === 'light-mode') { document.body.classList.add('light-mode'); }
    updateThemeIcon();
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            let pdfCount = 0, noteCount = 0;
            for (let f of files) {
                if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
                    await addFileToCurrentFolder(f);
                    pdfCount++;
                } else if (f.name.endsWith('.txt') || f.name.endsWith('.md')) {
                    await addFileToCurrentFolder(f);
                    noteCount++;
                } else {
                    showToast(`Skipping unsupported file: ${f.name}`, true);
                }
            }
            if (pdfCount + noteCount > 0) {
                showToast(`${pdfCount} PDF(s) and ${noteCount} note(s) saved!`);
            }
            render();
            e.target.value = '';
        });
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) { searchInput.addEventListener('input', () => render()); }
    
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) { clearSearchBtn.addEventListener('click', clearSearch); }
    
    const backBtn = document.getElementById('backBtn');
    if (backBtn) { backBtn.addEventListener('click', goBack); }
    
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) { uploadBtn.addEventListener('click', triggerUpload); }
    
    const createNoteBtn = document.getElementById('createNoteBtn');
    if (createNoteBtn) { createNoteBtn.addEventListener('click', openNoteModal); }
    
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.type));
    });
    
    try {
        await initDB();
        await loadFromIndexedDB();
    } catch (e) { console.error(e); showToast('Database error', true); }
});
