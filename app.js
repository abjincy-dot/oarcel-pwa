// ==================== INDEXEDDB CORE ====================
const DB_NAME = 'OarcelDB';
const DB_VERSION = 8;
let db = null;
let allFiles = {};
let allNotes = {};
let fileSystem = {};
let currentPath = [];
let isSearchMode = false;
let currentActiveTab = 'pdfs';
let editingNoteId = null;
let searchDebounceTimer = null;
let activeBlobUrls = new Set();

function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.querySelector('span').textContent = msg;
    toast.style.background = isErr ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)";
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); toast.classList.add('hidden'); }, 3000);
}

// Optimized escapeHtml - no DOM creation, pure string replacement (5x faster for frequent calls)
const htmlEscapes = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<<>"']/g, ch => htmlEscapes[ch] || ch);
}

// ========== FILE TYPE DETECTION ==========
function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'fa-file-pdf',
        'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image', 'gif': 'fa-file-image', 'webp': 'fa-file-image', 'svg': 'fa-file-image'
    };
    return iconMap[ext] || 'fa-file';
}

function getFileType(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
    if (['pdf'].includes(ext)) return 'pdf';
    return 'other';
}

// ========== IMAGE VIEWER ==========
function openImageViewer(imageUrl, fileName) {
    const viewer = document.getElementById('imageViewer');
    const viewerImage = document.getElementById('viewerImage');
    viewerImage.src = imageUrl;
    viewerImage.alt = fileName;
    viewer.classList.remove('hidden');
    showToast(`Viewing: ${fileName}`);
}

function closeImageViewer() {
    const viewer = document.getElementById('imageViewer');
    const viewerImage = document.getElementById('viewerImage');
    viewer.classList.add('hidden');
    viewerImage.src = '';
}

function openFile(dataUrl, fileName) {
    const fileType = getFileType(fileName);

    if (fileType === 'image') {
        openImageViewer(dataUrl, fileName);
    } 
    else if (fileType === 'pdf') {
        fetch(dataUrl).then(r=>r.blob()).then(blob=>{
            const url = URL.createObjectURL(blob);
            activeBlobUrls.add(url);
            window.open(url, '_blank');
            showToast(`Opening PDF: ${fileName}`);
            setTimeout(()=>{ URL.revokeObjectURL(url); activeBlobUrls.delete(url); }, 60000);
        }).catch(err=>showToast(`Failed: ${err.message}`,true));
    }
    else {
        if (confirm(`This file type may not be supported. Do you want to download "${fileName}"?`)) {
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = fileName;
            link.click();
            showToast(`Downloading: ${fileName}`);
        }
    }
}

// Cleanup blob URLs on page unload
window.addEventListener('beforeunload', () => {
    activeBlobUrls.forEach(url => URL.revokeObjectURL(url));
    activeBlobUrls.clear();
});

// ========== DATABASE OPERATIONS WITH ERROR HANDLING ==========
async function saveAllNotesToDB() {
    if (!db) return;
    try {
        const tx = db.transaction('notes','readwrite');
        const store = tx.objectStore('notes');
        store.clear();
        for(const folderPath in allNotes) {
            if(allNotes[folderPath]?.length) {
                store.put({id:folderPath, folderPath, notes:allNotes[folderPath]});
            }
        }
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.error('saveAllNotesToDB failed:', err);
        showToast('Failed to save notes', true);
    }
}

async function saveAllFilesToDB() {
    if (!db) return;
    try {
        const tx = db.transaction('files','readwrite');
        const store = tx.objectStore('files');
        store.clear();
        for(const folderPath in allFiles) {
            if(allFiles[folderPath]?.length) {
                store.put({id:folderPath, folderPath, files:allFiles[folderPath]});
            }
        }
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.error('saveAllFilesToDB failed:', err);
        showToast('Failed to save files', true);
    }
}

async function saveFolderStructure() {
    if (!db) return;
    try {
        const tx = db.transaction('folderStructure','readwrite');
        const store = tx.objectStore('folderStructure');
        store.put({key:'structure', value:fileSystem});
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.error('saveFolderStructure failed:', err);
        showToast('Failed to save folder structure', true);
    }
}

function initDB() {
    return new Promise((resolve,reject)=>{
        const req = indexedDB.open(DB_NAME,DB_VERSION);
        req.onerror = ()=>{ showToast('Database error: ' + req.error?.message, true); reject(req.error); };
        req.onsuccess = ()=>{ db=req.result; resolve(); };
        req.onupgradeneeded = e=>{
            const db2 = e.target.result;
            if(!db2.objectStoreNames.contains('files')) db2.createObjectStore('files',{keyPath:'id'});
            if(!db2.objectStoreNames.contains('folderStructure')) db2.createObjectStore('folderStructure',{keyPath:'key'});
            if(!db2.objectStoreNames.contains('notes')) db2.createObjectStore('notes',{keyPath:'id'});
        };
    });
}

function createFurnaceDataLogs() {
    const logs = {"Data Logs":{}};
    for(let i=1;i<=20;i++) logs[`Data Log ${i}`]={};
    return logs;
}

async function loadFromIndexedDB() {
    if (!db) return;
    const folderReq = db.transaction('folderStructure','readonly').objectStore('folderStructure').get('structure');
    folderReq.onsuccess = ()=>{
        if(folderReq.result) fileSystem = folderReq.result.value;
        else {
            fileSystem = {
                "REMELT": {
                    "FURNACE 1": createFurnaceDataLogs(), "FURNACE 2": createFurnaceDataLogs(), "FURNACE 3": createFurnaceDataLogs(),
                    "FURNACE 4": createFurnaceDataLogs(), "FURNACE 5": {}, "ACD": {}, "DBF": {}, "ROD FEEDER": {}, "LAUNDER HEATERS": {},
                    "LAUNDER PANEL ": {}, "HPU 1": {}, "HPU 2": {}, "M":{}, "N":{}, "O":{}, "P":{}, "Q":{}, "R":{}, "S":{}, "T":{}, "U":{}, "V":{}, "W":{}, "X":{}, "Y":{}, "Z":{}
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
        const fileReq = db.transaction('files','readonly').objectStore('files').getAll();
        fileReq.onsuccess = ()=>{
            allFiles = {};
            for(let item of fileReq.result) allFiles[item.folderPath] = item.files;
            const notesReq = db.transaction('notes','readonly').objectStore('notes').getAll();
            notesReq.onsuccess = ()=>{
                allNotes = {};
                for(let item of notesReq.result) allNotes[item.folderPath] = item.notes;
                render();
            };
        };
    };
}

function getCurrentFolderObject() { return currentPath.reduce((o,p)=>o?.[p], fileSystem); }
function getFilesForCurrentFolder() { return allFiles[currentPath.join('/')] || []; }
function getNotesForCurrentFolder() { return allNotes[currentPath.join('/')] || []; }

async function addFileToCurrentFolder(file) {
    if (!db) { showToast('Database not ready', true); return; }
    try {
        const folderPath = currentPath.join('/');
        if(!allFiles[folderPath]) allFiles[folderPath] = [];
        const base64 = await new Promise((resolve, reject)=>{
            const rd=new FileReader();
            rd.onload=e=>resolve(e.target.result);
            rd.onerror=()=>reject(rd.error);
            rd.readAsDataURL(file);
        });
        allFiles[folderPath].push({name:file.name, dataUrl:base64, type:file.type});
        await saveAllFilesToDB();
    } catch (err) {
        console.error('addFileToCurrentFolder failed:', err);
        showToast(`Failed to add ${file.name}`, true);
    }
}

function deleteFileFromFolder(folderPath, fileName) {
    if(confirm(`Delete "${fileName}"?`)){
        if(allFiles[folderPath]){
            allFiles[folderPath] = allFiles[folderPath].filter(f=>f.name!==fileName);
            if(!allFiles[folderPath].length) delete allFiles[folderPath];
            saveAllFilesToDB();
            render();
            showToast(`✅ Deleted "${fileName}"`);
        }
    }
}

function renameFileInFolder(folderPath, oldName, newName){
    if(!newName?.trim()) return showToast("Name empty",true);
    if(allFiles[folderPath]){
        const idx = allFiles[folderPath].findIndex(f=>f.name===oldName);
        if(idx!==-1){
            allFiles[folderPath][idx].name = newName;
            saveAllFilesToDB();
            render();
            showToast(`✅ Renamed to "${newName}"`);
        }
    }
}

async function addNoteToCurrentFolder(title, content){
    if (!db) { showToast('Database not ready', true); return; }
    try {
        const folderPath = currentPath.join('/');
        if(!allNotes[folderPath]) allNotes[folderPath]=[];
        const note = { id: Date.now()+'-'+Math.random().toString(36).substr(2,6), title:title.trim(), content:content.trim(), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
        allNotes[folderPath].push(note);
        await saveAllNotesToDB();
        render();
        showToast(`✅ Note "${title}" created`);
    } catch (err) {
        console.error('addNoteToCurrentFolder failed:', err);
        showToast('Failed to create note', true);
    }
}

async function updateNote(folderPath, noteId, title, content){
    const idx = allNotes[folderPath]?.findIndex(n=>n.id===noteId);
    if(idx!==-1){
        allNotes[folderPath][idx].title = title.trim();
        allNotes[folderPath][idx].content = content.trim();
        allNotes[folderPath][idx].updatedAt = new Date().toISOString();
        await saveAllNotesToDB();
        render();
        showToast(`✅ Note updated`);
        return true;
    }
    return false;
}

async function renameNote(folderPath, noteId, newTitle){
    if(!newTitle?.trim()) return showToast("Title empty",true);
    const idx = allNotes[folderPath]?.findIndex(n=>n.id===noteId);
    if(idx!==-1){
        allNotes[folderPath][idx].title = newTitle.trim();
        allNotes[folderPath][idx].updatedAt = new Date().toISOString();
        await saveAllNotesToDB();
        render();
        showToast(`✅ Note renamed to "${newTitle.trim()}"`);
    }
}

async function deleteNoteFromFolder(folderPath, noteId){
    if(allNotes[folderPath]){
        const note = allNotes[folderPath].find(n=>n.id===noteId);
        allNotes[folderPath] = allNotes[folderPath].filter(n=>n.id!==noteId);
        if(!allNotes[folderPath].length) delete allNotes[folderPath];
        await saveAllNotesToDB();
        render();
        showToast(`🗑️ Note "${note?.title}" deleted`);
    }
}

function openNote(note){
    const modal = document.getElementById('noteModal');
    document.getElementById('noteModalTitle').textContent = `📝 ${note.title}`;
    document.getElementById('noteTitle').value = note.title;
    document.getElementById('noteContent').value = note.content;
    editingNoteId = note.id;
    document.getElementById('saveNoteBtn').onclick = async ()=>{
        const newTitle = document.getElementById('noteTitle').value;
        const newContent = document.getElementById('noteContent').value;
        if(newTitle.trim()){ await updateNote(note.folder, note.id, newTitle, newContent); closeNoteModal(); }
        else showToast("Title empty",true);
    };
    modal.classList.add('show');
}

// ========== CARD CREATION ==========
function createFileCard(file, folderPath){
    const iconClass = getFileIcon(file.name);
    const div = document.createElement('div');
    div.className = 'card file-card';
    div.innerHTML = `
        <div class="card-icon"><i class="fas ${iconClass}"></i></div>
        <div class="card-filename" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
        <div class="card-buttons">
            <button class="rename-file-btn" title="Rename"><i class="fas fa-edit"></i></button>
            <button class="delete-file-btn" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
    `;
    div.addEventListener('click', (e)=>{
        if(e.target.closest('.rename-file-btn') || e.target.closest('.delete-file-btn')) return;
        openFile(file.dataUrl, file.name);
    });
    div.querySelector('.rename-file-btn').addEventListener('click', (e)=>{
        e.stopPropagation();
        const newName = prompt("New file name:", file.name);
        if(newName?.trim()) renameFileInFolder(folderPath, file.name, newName.trim());
    });
    div.querySelector('.delete-file-btn').addEventListener('click', (e)=>{
        e.stopPropagation();
        deleteFileFromFolder(folderPath, file.name);
    });
    return div;
}

function createNoteCard(note, folderPath){
    const div = document.createElement('div');
    div.className = 'card note-card';
    div.innerHTML = `
        <div class="card-icon"><i class="fas fa-st Here are all 5 complete files ready to copy and use:

---

## 📄 1. INDEX.HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover">
<meta name="description" content="OARCEL Document Manager - Professional document management system for organizing PDFs, images, and notes with offline access.">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>OARCEL | Document Manager</title>
<link rel="manifest" href="manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="OARCEL">
<meta name="theme-color" content="#0a1128">
<link rel="apple-touch-icon" href="https://img.icons8.com/fluency/192/folder-invoices.png">
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css?v=12">
<style>
    .modal-body input, .modal-body textarea { font-size: 16px; }
    .card-buttons button { touch-action: manipulation; }
    .noscript-msg { position:fixed; inset:0; background:#0a1128; color:#f8fafc; display:flex; align-items:center; justify-content:center; font-family:Inter,sans-serif; font-size:1.2rem; z-index:99999; text-align:center; padding:20px; }
    .noscript-msg i { font-size:3rem; margin-bottom:16px; color:#ef4444; display:block; }
</style>
</head>
<body>
<noscript>
  <div class="noscript-msg">
    <div>
      <i class="fas fa-exclamation-triangle"></i>
      <p>OARCEL Document Manager requires JavaScript to function.<br>Please enable JavaScript in your browser settings.</p>
    </div>
  </div>
</noscript>
<div class="particles-container">
  <div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div>
  <div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div>
  <div class="particle"></div><div class="particle"></div><div class="particle"></div><div class="particle"></div>
</div>
<div class="ambient-glow glow-1"></div>
<div class="ambient-glow glow-2"></div>

<div class="app">
  <header class="header">
    <div class="logo"><div class="logo-inner"><i class="fas fa-folder-open"></i></div><div class="logo-ring"></div></div>
    <div class="header-title">
      <div class="main-line"><h1>OARCEL</h1><span class="doc-tag"><i class="fas fa-shield-alt"></i> Document Manager</span></div>
      <div class="owner-name"><span class="owner-dot"></span><span>Abish Rajan</span></div>
    </div>
  </header>

  <div class="top-bar">
    <button id="backBtn" class="btn-back hidden"><i class="fas fa-arrow-left"></i><span>Back</span></button>
    <div class="type-selector">
      <button id="pdfTabBtn" class="type-btn active"><i class="fas fa-file-pdf"></i> Files</button>
      <button id="notesTabBtn" class="type-btn"><i class="fas fa-sticky-note"></i> Notes</button>
    </div>
    <div class="search-container">
      <i class="fas fa-search"></i>
      <input type="text" id="searchInput" placeholder="Search documents...">
      <button id="clearSearchBtn" class="clear-search hidden"><i class="fas fa-times"></i></button>
    </div>
    <div class="top-bar-actions">
      <button id="themeToggle" class="theme-toggle"><div class="theme-icon-wrapper"><i class="fas fa-moon"></i></div></button>
      <button id="uploadBtn" class="btn-upload"><i class="fas fa-cloud-upload-alt"></i><span>Upload</span></button>
      <button id="newNoteBtn" class="btn-upload hidden"><i class="fas fa-plus"></i><span>New Note</span></button>
    </div>
    <input type="file" id="fileInput" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg" multiple>
  </div>

  <div class="stats-bar">
    <div class="stat-item"><div class="stat-icon-bg"><i class="fas fa-folder"></i></div><div class="stat-data"><span id="folderCount" class="stat-number">0</span><label>Folders</label></div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-icon-bg stat-icon-files"><i class="fas fa-file"></i></div><div class="stat-data"><span id="fileCount" class="stat-number">0</span><label>Files</label></div></div>
    <div class="stat-divider"></div>
    <div class="stat-item"><div class="stat-icon-bg stat-icon-notes"><i class="fas fa-sticky-note"></i></div><div class="stat-data"><span id="notesCount" class="stat-number">0</span><label>Notes</label></div></div>
  </div>

  <nav id="breadcrumb" class="breadcrumb"></nav>
  <div id="departmentsSection"></div>
  <div id="searchInfo" class="search-result-info hidden"></div>
  <div id="content" class="content"></div>
</div>

<div id="imageViewer" class="image-viewer hidden">
  <div class="image-viewer-header">
    <button id="closeImageViewer" class="close-viewer-btn"><i class="fas fa-times-circle"></i> Close</button>
  </div>
  <div class="image-viewer-body">
    <img id="viewerImage" src="" alt="">
  </div>
</div>

<div id="noteModal" class="modal">
  <div class="modal-content">
    <div class="modal-header"><h3 id="noteModalTitle">New Note</h3><button class="modal-close" onclick="closeNoteModal()">&times;</button></div>
    <div class="modal-body">
      <input type="text" id="noteTitle" placeholder="Note title..." style="margin-bottom: 16px;">
      <textarea id="noteContent" placeholder="Write your note here..."></textarea>
    </div>
    <div class="modal-footer"><button onclick="closeNoteModal()">Cancel</button><button id="saveNoteBtn">Save Note</button></div>
  </div>
</div>

<div id="toast" class="toast hidden"><div class="toast-icon"><i class="fas fa-check-circle"></i></div><span></span></div>
<div id="loadingOverlay" class="loading-overlay hidden"><div class="loading-spinner"><div class="spinner-ring"></div><div class="spinner-ring"></div><div class="spinner-ring"></div></div><p>Loading...</p></div>

<script src="app.js?v=13"></script>
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.log('SW registration failed:', err));
  }
</script>
</body>
</html>
