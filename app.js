// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 6;
let db = null;
let allFiles = {};
let allNotes = {};
let fileSystem = {};
let currentPath = [];
let isSearchMode = false;
let currentActiveTab = 'pdfs';
let editingNoteId = null;

let currentPdfBlob = null;
let currentPdfFileName = null;
let currentPdfObjectUrl = null;

// ==================== PDF MODAL VIEWER ====================
function openPDFModal(dataUrl, fileName) {
    closePDFModal();
    currentPdfFileName = fileName;
    document.getElementById('pdfModalTitle').innerHTML = `<i class="fas fa-file-pdf"></i> ${escapeHtml(fileName)}`;
    
    const spinner = document.getElementById('pdfLoadingSpinner');
    const iframe = document.getElementById('pdfIframe');
    if (spinner) spinner.style.display = 'block';
    if (iframe) iframe.style.display = 'none';
    
    let blobUrl;
    if (dataUrl.startsWith('data:')) {
        const blob = dataURLToBlob(dataUrl);
        blobUrl = URL.createObjectURL(blob);
        currentPdfBlob = blob;
    } else if (dataUrl.startsWith('blob:')) {
        blobUrl = dataUrl;
        fetch(blobUrl).then(res => res.blob()).then(b => currentPdfBlob = b);
    } else {
        blobUrl = dataUrl;
    }
    currentPdfObjectUrl = blobUrl;
    
    iframe.onload = () => {
        if (spinner) spinner.style.display = 'none';
        if (iframe) iframe.style.display = 'block';
    };
    iframe.src = blobUrl;
    document.getElementById('pdfModal').classList.add('show');
}

function closePDFModal() {
    const modal = document.getElementById('pdfModal');
    if (modal) modal.classList.remove('show');
    const iframe = document.getElementById('pdfIframe');
    if (iframe) iframe.src = 'about:blank';
    const spinner = document.getElementById('pdfLoadingSpinner');
    if (spinner) spinner.style.display = 'none';
    if (currentPdfObjectUrl) {
        URL.revokeObjectURL(currentPdfObjectUrl);
        currentPdfObjectUrl = null;
    }
    currentPdfBlob = null;
}

function downloadCurrentPDF() {
    if (currentPdfBlob) {
        const url = URL.createObjectURL(currentPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentPdfFileName || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`📥 Downloading ${currentPdfFileName}`);
    } else if (currentPdfObjectUrl) {
        fetch(currentPdfObjectUrl).then(res => res.blob()).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = currentPdfFileName || 'document.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
}

function dataURLToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}

// Override original openPDF to use modal
function openPDF(dataUrl, fileName) {
    openPDFModal(dataUrl, fileName);
}

// ==================== NOTE FUNCTIONS ====================
function getNotesForCurrentFolder() {
    const folderPath = currentPath.join('/');
    return allNotes[folderPath] || [];
}

async function addNoteToCurrentFolder(title, content) {
    const folderPath = currentPath.join('/');
    if (!allNotes[folderPath]) allNotes[folderPath] = [];
    const note = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 6),
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    allNotes[folderPath].push(note);
    await saveAllNotesToDB();
    render();
    showToast(`✅ Note "${title}" created`);
    return note;
}

async function updateNote(folderPath, noteId, title, content) {
    if (allNotes[folderPath]) {
        const index = allNotes[folderPath].findIndex(n => n.id === noteId);
        if (index !== -1) {
            allNotes[folderPath][index].title = title.trim();
            allNotes[folderPath][index].content = content.trim();
            allNotes[folderPath][index].updatedAt = new Date().toISOString();
            await saveAllNotesToDB();
            render();
            showToast(`✅ Note updated`);
            return true;
        }
    }
    return false;
}

async function deleteNoteFromFolder(folderPath, noteId) {
    if (allNotes[folderPath]) {
        const note = allNotes[folderPath].find(n => n.id === noteId);
        allNotes[folderPath] = allNotes[folderPath].filter(n => n.id !== noteId);
        if (allNotes[folderPath].length === 0) delete allNotes[folderPath];
        await saveAllNotesToDB();
        render();
        showToast(`🗑️ Note "${note?.title || 'unknown'}" deleted`);
    }
}

async function saveAllNotesToDB() {
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');
    store.clear();
    for (const folderPath in allNotes) {
        if (allNotes[folderPath] && allNotes[folderPath].length > 0) {
            store.put({ id: folderPath, folderPath, notes: allNotes[folderPath] });
        }
    }
    tx.commit();
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
            if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
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
    for (let i = 1; i <= 20; i++) logs[`Data Log ${i}`] = {};
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
            const hasDataLog = Object.keys(furnaceObj).some(key => key === "Data Logs" || /^Data Log \d+$/.test(key));
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
            if (migrated) { saveFolderStructure(); showToast("✅ Added Data Log folders to FURNACE 2, 3, 4"); }
        } else {
            fileSystem = {
                "REMELT": {
                    "FURNACE 1": createFurnaceDataLogs(),
                    "FURNACE 2": createFurnaceDataLogs(),
                    "FURNACE 3": createFurnaceDataLogs(),
                    "FURNACE 4": createFurnaceDataLogs(),
                    "FURNACE 5": {},
                    "ACD": {}, "DBF": {}, "ROD FEEDER": {}, "LAUNDER HEATERS": {}, "LAUNDER PANEL ": {},
                    "HPU 1": {}, "HPU 2": {}, "M": {}, "N": {}, "O": {}, "P": {}, "Q": {}, "R": {}, "S": {}, "T": {}, "U": {}, "V": {}, "W": {}, "X": {}, "Y": {}, "Z": {}
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
            for (let item of fileReq.result) allFiles[item.folderPath] = item.files;
            const notesReq = db.transaction('notes', 'readonly').objectStore('notes').getAll();
            notesReq.onsuccess = () => {
                allNotes = {};
                for (let item of notesReq.result) allNotes[item.folderPath] = item.notes;
                render();
            };
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
function goBack() { if (currentPath.length && !isSearchMode) { currentPath.pop(); render(); } else if (isSearchMode) { clearSearch(); } }
function triggerUpload() { document.getElementById('fileInput').click(); }
function triggerNewNote() { openNewNoteModal(); }

function clearSearch() { 
    document.getElementById('searchInput').value = ''; 
    isSearchMode = false; 
    document.getElementById('searchInfo').classList.add('hidden'); 
    document.getElementById('clearSearchBtn').classList.add('hidden'); 
    render(); 
}

function searchFiles(q) {
    if (!q.trim()) return [];
    const results = [];
    for (const path in allFiles) if (allFiles[path]) allFiles[path].forEach(f => { if (f.name.toLowerCase().includes(q.toLowerCase())) results.push({ ...f, folder: path, type: 'pdf' }); });
    for (const path in allNotes) if (allNotes[path]) allNotes[path].forEach(n => { if (n.title.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase())) results.push({ ...n, folder: path, type: 'note' }); });
    return results;
}

function openNote(note) {
    const modal = document.getElementById('noteModal');
    document.getElementById('noteModalTitle').textContent = `📝 ${note.title}`;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    editingNoteId = note.id;
    const saveBtn = document.getElementById('saveNoteBtn');
    saveBtn.onclick = () => {
        const newTitle = document.getElementById('noteTitle').value;
        const newContent = document.getElementById('noteContent').value;
        if (newTitle.trim()) { updateNote(note.folder, note.id, newTitle, newContent); closeNoteModal(); }
        else showToast("Title cannot be empty", true);
    };
    modal.classList.add('show');
}

function createNoteCard(note, folderPath) {
    const div = document.createElement('div');
    div.className = 'card note-card';
    const preview = note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content;
    div.innerHTML = `
        <div class="card-icon"><i class="fas fa-sticky-note"></i></div>
        <div class="card-filename">${escapeHtml(note.title)}</div>
        <div class="note-preview">${escapeHtml(preview)}</div>
        <div class="card-buttons">
            <button class="edit-note-btn" onclick="event.stopPropagation(); editNote('${folderPath}','${note.id}')"><i class="fas fa-edit"></i> Edit</button>
            <button class="delete-note-btn" onclick="event.stopPropagation(); deleteNote('${folderPath}','${note.id}')"><i class="fas fa-trash"></i> Delete</button>
        </div>
    `;
    div.onclick = () => openNote({ ...note, folder: folderPath });
    return div;
}

function createPdfCard(file, folderPath) {
    return createCard(file.name, () => openPDF(file.dataUrl, file.name), false, true, folderPath, file.name, true);
}

function openNewNoteModal() {
    editingNoteId = null;
    document.getElementById('noteModalTitle').textContent = 'New Note';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    const saveBtn = document.getElementById('saveNoteBtn');
    saveBtn.onclick = () => {
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        if (title.trim()) { addNoteToCurrentFolder(title, content); closeNoteModal(); }
        else showToast("Title cannot be empty", true);
    };
    document.getElementById('noteModal').classList.add('show');
}

function closeNoteModal() { document.getElementById('noteModal').classList.remove('show'); editingNoteId = null; }

function editNote(folderPath, noteId) {
    const note = allNotes[folderPath]?.find(n => n.id === noteId);
    if (note) {
        document.getElementById('noteModalTitle').textContent = `✏️ Edit Note`;
        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        editingNoteId = noteId;
        const saveBtn = document.getElementById('saveNoteBtn');
        saveBtn.onclick = () => {
            const newTitle = document.getElementById('noteTitle').value;
            const newContent = document.getElementById('noteContent').value;
            if (newTitle.trim()) { updateNote(folderPath, noteId, newTitle, newContent); closeNoteModal(); }
            else showToast("Title cannot be empty", true);
        };
        document.getElementById('noteModal').classList.add('show');
    }
}

function deleteNote(folderPath, noteId) { if (confirm('Delete this note?')) deleteNoteFromFolder(folderPath, noteId); }

function setActiveTab(tab) {
    currentActiveTab = tab;
    const pdfTabBtn = document.getElementById('pdfTabBtn');
    const notesTabBtn = document.getElementById('notesTabBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const newNoteBtn = document.getElementById('newNoteBtn');
    if (tab === 'pdfs') {
        pdfTabBtn.classList.add('active');
        notesTabBtn.classList.remove('active');
        uploadBtn.classList.remove('hidden');
        newNoteBtn.classList.add('hidden');
    } else {
        pdfTabBtn.classList.remove('active');
        notesTabBtn.classList.add('active');
        uploadBtn.classList.add('hidden');
        newNoteBtn.classList.remove('hidden');
    }
    render();
}

function createCard(title, onClick, isFolder = false, showDel = false, delPath = null, delName = null, showRename = false) {
    const div = document.createElement('div');
    div.className = isFolder ? 'card glow-folder' : 'card';
    div.innerHTML = `
        <div class="card-icon"><i class="fas ${isFolder ? 'fa-folder' : 'fa-file-pdf'}"></i></div>
        <div class="card-filename">${escapeHtml(title)}</div>
        <div class="card-buttons">
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
        const results = searchFiles(query);
        document.getElementById('searchInfo').classList.remove('hidden');
        document.getElementById('searchInfo').innerHTML = `<i class="fas fa-search"></i> Found ${results.length} result(s) for "${escapeHtml(query)}" <button onclick="clearSearch()">Clear</button>`;
        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = '';
        document.getElementById('backBtn').classList.remove('hidden');
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('newNoteBtn').classList.add('hidden');
        document.getElementById('departmentsSection').innerHTML = '';
        document.getElementById('breadcrumb').innerHTML = '';
        const typeSelector = document.querySelector('.type-selector');
        if (typeSelector) typeSelector.style.display = 'none';
        if (!results.length) contentDiv.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No results found.</p></div>';
        else results.forEach(item => { if (item.type === 'pdf') contentDiv.appendChild(createPdfCard(item, item.folder)); else contentDiv.appendChild(createNoteCard(item, item.folder)); });
        updateStats();
        attachPressEffects();
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
    currentPath.forEach((f, i) => { bcDiv.innerHTML += `<span class="breadcrumb-separator">/</span><div class="breadcrumb-item" onclick="navigateToBreadcrumb(${i})">${escapeHtml(f)}</div>`; });
    const isRoot = currentPath.length === 0;
    if (isRoot) {
        let html = '<div class="section-title"><i class="fas fa-building"></i> Departments</div><div class="departments-grid">';
        for (let dept in fileSystem) {
            const sub = Object.keys(fileSystem[dept]).length;
            const fcount = allFiles[dept] ? allFiles[dept].length : 0;
            const ncount = allNotes[dept] ? allNotes[dept].length : 0;
            html += `<div class="dept-card" data-dept="${dept}" onclick="selectDepartment('${dept}')"><div class="dept-oval"><span>${dept}</span></div><div class="dept-arrow"><i class="fas fa-chevron-right"></i></div><div class="dept-info">${sub + fcount + ncount} items</div></div>`;
        }
        html += '</div>';
        document.getElementById('departmentsSection').innerHTML = html;
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('newNoteBtn').classList.add('hidden');
    } else document.getElementById('departmentsSection').innerHTML = '';
    const hasSubfolders = Object.keys(folder).length > 0;
    const isLeafFolder = !isRoot && !hasSubfolders;
    const typeSelector = document.querySelector('.type-selector');
    if (typeSelector) typeSelector.style.display = isLeafFolder ? 'flex' : 'none';
    if (isLeafFolder) {
        if (currentActiveTab === 'pdfs') { document.getElementById('uploadBtn').classList.remove('hidden'); document.getElementById('newNoteBtn').classList.add('hidden'); }
        else { document.getElementById('uploadBtn').classList.add('hidden'); document.getElementById('newNoteBtn').classList.remove('hidden'); }
    } else { document.getElementById('uploadBtn').classList.add('hidden'); document.getElementById('newNoteBtn').classList.add('hidden'); }
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-bar';
    if (!isRoot) actionDiv.innerHTML = `<button class="action-btn" onclick="renameCurrentFolder()"><i class="fas fa-edit"></i> Rename Folder</button><button class="action-btn" onclick="deleteCurrentFolder()"><i class="fas fa-trash-alt"></i> Delete Folder</button><button class="action-btn" onclick="addNewFolder()"><i class="fas fa-plus"></i> Add Subfolder</button>`;
    else actionDiv.innerHTML = `<button class="action-btn" onclick="addNewDepartment()"><i class="fas fa-building"></i> Add Department</button>`;
    document.getElementById('content').appendChild(actionDiv);
    if (!isRoot && hasSubfolders) for (let key in folder) document.getElementById('content').appendChild(createCard(key, () => { currentPath.push(key); render(); }, true));
    if (isLeafFolder) {
        if (currentActiveTab === 'pdfs') {
            const files = getFilesForCurrentFolder();
            const path = currentPath.join('/');
            if (files.length) files.forEach(f => document.getElementById('content').appendChild(createPdfCard(f, path)));
            else document.getElementById('content').innerHTML += '<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><p>No PDFs yet. Click Upload to add files.</p></div>';
        } else {
            const notes = getNotesForCurrentFolder();
            const path = currentPath.join('/');
            if (notes.length) notes.forEach(n => document.getElementById('content').appendChild(createNoteCard(n, path)));
            else document.getElementById('content').innerHTML += '<div class="empty-state empty-state-note"><i class="fas fa-sticky-note"></i><p>No notes yet. Click + New Note to add.</p></div>';
        }
    }
    updateStats();
    attachPressEffects();
}

function navigateToBreadcrumb(idx) { if (idx === -1) currentPath = []; else currentPath = currentPath.slice(0, idx + 1); render(); }
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
        if (allNotes[oldPath]) { allNotes[newPath] = allNotes[oldPath]; delete allNotes[oldPath]; }
        currentPath[currentPath.length - 1] = newName;
        saveFolderStructure(); saveAllFilesToDB(); saveAllNotesToDB(); render();
        showToast(`✅ Renamed to "${newName}"`);
    }
}
function deleteCurrentFolder() {
    if (!currentPath.length) return;
    const name = currentPath[currentPath.length - 1];
    if (confirm(`Delete "${name}" and all contents?`)) {
        const path = currentPath.join('/');
        delete allFiles[path]; delete allNotes[path];
        const parent = currentPath.slice(0, -1).reduce((o, p) => o[p], fileSystem);
        delete parent[name];
        currentPath.pop();
        saveFolderStructure(); saveAllFilesToDB(); saveAllNotesToDB(); render();
        showToast(`🗑️ Folder "${name}" deleted`);
    }
}
function addNewFolder() {
    const name = prompt("Folder name:");
    if (name && name.trim()) {
        const cur = getCurrentFolderObject();
        if (cur && !cur[name]) { cur[name] = {}; saveFolderStructure(); render(); showToast(`✅ Folder "${name}" created`); }
        else showToast("Exists", true);
    }
}
function addNewDepartment() {
    const name = prompt("Department name:");
    if (name && name.trim() && !fileSystem[name]) { fileSystem[name] = {}; saveFolderStructure(); render(); showToast(`✅ Department "${name}" created`); }
    else if (fileSystem[name]) showToast("Department exists", true);
}
function updateStats() {
    let folderCount = 0, fileCount = 0, notesCount = 0;
    function countFolders(obj) { for (let k in obj) { if (typeof obj[k] === 'object') { folderCount++; countFolders(obj[k]); } } }
    countFolders(fileSystem);
    for (let k in allFiles) if (allFiles[k]) fileCount += allFiles[k].length;
    for (let k in allNotes) if (allNotes[k]) notesCount += allNotes[k].length;
    document.getElementById('folderCount').textContent = folderCount;
    document.getElementById('fileCount').textContent = fileCount;
    document.getElementById('notesCount').textContent = notesCount;
}
function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.querySelector('span').textContent = msg;
    toast.style.background = isErr ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)";
    toast.classList.remove('hidden', 'show');
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); toast.classList.add('hidden'); }, 3000);
}
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function toggleTheme() { document.body.classList.toggle('light-mode'); localStorage.setItem('oarcel_theme', document.body.classList.contains('light-mode') ? 'light-mode' : ''); updateThemeIcon(); }
function updateThemeIcon() {
    const isDark = !document.body.classList.contains('light-mode');
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.innerHTML = `<div class="theme-icon-wrapper"><i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i></div>`;
}

// ========== 3D DEPTH TOUCH EFFECT ==========
function addDepthEffect(element, event) {
    if (!element || element.hasAttribute('data-press-animating')) return;
    element.setAttribute('data-press-animating', 'true');
    element.classList.add('press-depth-3d');
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(12);
    const ripple = document.createElement('span');
    ripple.classList.add('touch-ripple');
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    ripple.style.pointerEvents = 'none';
    ripple.style.transform = 'scale(0)';
    ripple.style.transition = 'transform 0.4s ease-out, opacity 0.3s ease-out';
    let clientX, clientY;
    if (event.touches) { clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
    else { clientX = event.clientX; clientY = event.clientY; }
    const rect = element.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.style.width = '0';
    ripple.style.height = '0';
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = size * 2 + 'px';
    ripple.style.height = size * 2 + 'px';
    ripple.style.transform = 'scale(1)';
    ripple.style.opacity = '0';
    setTimeout(() => {
        element.classList.remove('press-depth-3d');
        if (ripple && ripple.parentNode) ripple.parentNode.removeChild(ripple);
        element.removeAttribute('data-press-animating');
    }, 150);
}
function pressHandler(e) {
    if (this.hasAttribute('data-press-animating') || (e.button === 2)) return;
    if (e.type === 'touchstart' && this.hasAttribute('data-touch-processing')) return;
    if (e.type === 'touchstart') { this.setAttribute('data-touch-processing', 'true'); setTimeout(() => this.removeAttribute('data-touch-processing'), 200); }
    addDepthEffect(this, e);
}
function attachPressEffects() {
    const selectors = ['#backBtn', '.type-btn', '.theme-toggle', '#uploadBtn', '#newNoteBtn', '.action-btn', '.rename-file-btn', '.edit-note-btn', '.delete-btn', '.delete-note-btn', '.clear-search', '.modal-close', '.modal-footer button', '.breadcrumb-item', '.dept-card', '.card'];
    document.querySelectorAll(selectors.join(',')).forEach(el => {
        el.removeEventListener('click', pressHandler);
        el.removeEventListener('touchstart', pressHandler);
        el.removeEventListener('mousedown', pressHandler);
        el.addEventListener('mousedown', pressHandler);
        el.addEventListener('touchstart', pressHandler, { passive: false });
        if (window.getComputedStyle(el).cursor === 'auto') el.style.cursor = 'pointer';
    });
}
function styleActionBar() {
    const actionBar = document.querySelector('.action-bar');
    if (actionBar) {
        actionBar.style.setProperty('background', '#0f172a', 'important');
        actionBar.style.setProperty('backdrop-filter', 'blur(20px)', 'important');
        actionBar.style.setProperty('border', '1px solid rgba(255,255,255,0.2)', 'important');
        actionBar.style.setProperty('border-radius', '60px', 'important');
        actionBar.style.setProperty('padding', '10px 16px', 'important');
        actionBar.style.setProperty('margin', '16px 0 20px 0', 'important');
        actionBar.style.setProperty('box-shadow', '0 8px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)', 'important');
        const btns = actionBar.querySelectorAll('.action-btn');
        btns.forEach(btn => {
            btn.style.setProperty('background', '#1e293b', 'important');
            btn.style.setProperty('border', '1px solid #3b82f6', 'important');
            btn.style.setProperty('border-radius', '40px', 'important');
            btn.style.setProperty('padding', '8px 18px', 'important');
            btn.style.setProperty('color', '#f1f5f9', 'important');
            btn.style.setProperty('box-shadow', '0 3px 8px rgba(0,0,0,0.2)', 'important');
        });
    }
}
function fixSearchBarZoom() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('blur', () => { setTimeout(() => { const viewport = document.querySelector('meta[name=viewport]'); if (viewport) viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'); window.scrollTo(0, 0); }, 10); });
}

const originalRender = render;
render = function() { originalRender(); setTimeout(() => { styleActionBar(); attachPressEffects(); }, 30); };

// Global handlers
window.selectDepartment = selectDepartment;
window.goBack = goBack;
window.triggerUpload = triggerUpload;
window.triggerNewNote = triggerNewNote;
window.clearSearch = clearSearch;
window.navigateToBreadcrumb = navigateToBreadcrumb;
window.renameCurrentFolder = renameCurrentFolder;
window.deleteCurrentFolder = deleteCurrentFolder;
window.addNewFolder = addNewFolder;
window.addNewDepartment = addNewDepartment;
window.openPDF = openPDF;
window.openNote = openNote;
window.editNote = editNote;
window.deleteNote = deleteNote;
window.closeNoteModal = closeNoteModal;
window.closePDFModal = closePDFModal;
window.downloadCurrentPDF = downloadCurrentPDF;
window.renameFile = (p, old) => { const nu = prompt("New name:", old.replace('.pdf', '')); if (nu && nu.trim()) renameFileInFolder(p, old, nu.trim()); };
window.deleteFile = (p, n) => { if (confirm(`Delete "${n}"?`)) deleteFileFromFolder(p, n); };

document.addEventListener('DOMContentLoaded', async () => {
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) themeBtn.onclick = toggleTheme;
    if (localStorage.getItem('oarcel_theme') === 'light-mode') document.body.classList.add('light-mode');
    updateThemeIcon();
    document.getElementById('pdfTabBtn').onclick = () => setActiveTab('pdfs');
    document.getElementById('notesTabBtn').onclick = () => setActiveTab('notes');
    const downloadBtn = document.getElementById('downloadPdfBtn');
    if (downloadBtn) downloadBtn.onclick = downloadCurrentPDF;
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (let f of files) {
                if (f.type === 'application/pdf') await addFileToCurrentFolder(f);
            }
            showToast(`${files.length} PDF(s) saved!`);
            render();
            e.target.value = '';
        });
    }
    const newNoteBtn = document.getElementById('newNoteBtn');
    if (newNoteBtn) newNoteBtn.onclick = triggerNewNote;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', () => render());
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) clearSearchBtn.addEventListener('click', clearSearch);
    const backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.addEventListener('click', goBack);
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) uploadBtn.addEventListener('click', triggerUpload);
    try { await initDB(); await loadFromIndexedDB(); } catch (e) { console.error(e); showToast('Database error', true); }
    setTimeout(() => { attachPressEffects(); styleActionBar(); fixSearchBarZoom(); }, 200);
});