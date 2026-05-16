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

function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    toast.querySelector('span').textContent = msg;
    toast.style.background = isErr ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,#10b981,#059669)";
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => { toast.classList.remove('show'); toast.classList.add('hidden'); }, 3000);
}

function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }

// ========== 3D PAGE CURL ANIMATION (350ms) ==========
function animateContent(direction, callback) {
    const contentDiv = document.getElementById('content');
    const deptSection = document.getElementById('departmentsSection');
    const elementsToAnimate = [contentDiv, deptSection];
    
    elementsToAnimate.forEach(el => {
        if (el && !el.classList.contains('hidden')) {
            el.classList.add(direction === 'forward' ? 'page-flip-forward' : 'page-flip-back');
        }
    });
    
    setTimeout(() => {
        callback();
        elementsToAnimate.forEach(el => {
            if (el) el.classList.remove('page-flip-forward', 'page-flip-back');
        });
    }, 350); // matches CSS animation duration
}

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
            window.open(url, '_blank');
            showToast(`Opening PDF: ${fileName}`);
            setTimeout(()=>URL.revokeObjectURL(url),60000);
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

async function saveAllNotesToDB() {
    const tx = db.transaction('notes','readwrite');
    const store = tx.objectStore('notes');
    store.clear();
    for(const folderPath in allNotes) if(allNotes[folderPath]?.length) store.put({id:folderPath, folderPath, notes:allNotes[folderPath]});
    tx.commit();
}
async function saveAllFilesToDB() {
    const tx = db.transaction('files','readwrite');
    const store = tx.objectStore('files');
    store.clear();
    for(const folderPath in allFiles) if(allFiles[folderPath]?.length) store.put({id:folderPath, folderPath, files:allFiles[folderPath]});
    tx.commit();
}
function saveFolderStructure() {
    db.transaction('folderStructure','readwrite').objectStore('folderStructure').put({key:'structure', value:fileSystem});
}

function initDB() {
    return new Promise((resolve,reject)=>{
        const req = indexedDB.open(DB_NAME,DB_VERSION);
        req.onerror = ()=>reject(req.error);
        req.onsuccess = ()=>{ db=req.result; resolve(); };
        req.onupgradeneeded = e=>{
            const db2 = e.target.result;
            if(!db2.objectStoreNames.contains('files')) db2.createObjectStore('files',{keyPath:'id'});
            if(!db2.objectStoreNames.contains('folderStructure')) db2.createObjectStore('folderStructure',{keyPath:'key'});
            if(!db2.objectStoreNames.contains('notes')) db2.createObjectStore('notes',{keyPath:'id'});
        };
    });
}

// ========== EACH FURNACE HAS ITS OWN UNIQUE FOLDERS ==========
function createFurnace1Logs() {
    return {
        "Temperature Records F1": {},
        "Pressure Data F1": {},
        "Quality Check F1": {},
        "Maintenance Log F1": {},
        "Production Report F1": {},
        "Safety Checklist F1": {},
        "Morning Shift F1": {},
        "Evening Shift F1": {},
        "Night Shift F1": {},
        "Raw Material F1": {},
        "Finished Goods F1": {},
        "Defect Report F1": {},
        "Efficiency Data F1": {},
        "Downtime Records F1": {},
        "Operator Notes F1": {},
        "Supervisor Log F1": {},
        "Weekly Summary F1": {},
        "Monthly Report F1": {},
        "Inspection Log F1": {},
        "Calibration Data F1": {}
    };
}

function createFurnace2Logs() {
    return {
        "Temp Records F2": {},
        "Pressure Logs F2": {},
        "Quality Data F2": {},
        "Maintenance Records F2": {},
        "Production Stats F2": {},
        "Safety Reports F2": {},
        "Shift A F2": {},
        "Shift B F2": {},
        "Raw Material Log F2": {},
        "Output Data F2": {},
        "Defects F2": {},
        "Performance F2": {},
        "Downtime F2": {},
        "Operator Log F2": {},
        "Supervisor Notes F2": {},
        "Weekly Report F2": {},
        "Monthly Data F2": {},
        "Annual Report F2": {},
        "Inspection F2": {},
        "Calibration F2": {}
    };
}

function createFurnace3Logs() {
    return {
        "Temperature F3": {},
        "Pressure F3": {},
        "Quality F3": {},
        "Maintenance F3": {},
        "Production F3": {},
        "Safety F3": {},
        "Shift-1 F3": {},
        "Shift-2 F3": {},
        "Raw F3": {},
        "Finished F3": {},
        "Defect F3": {},
        "Efficiency F3": {},
        "Downtime F3": {},
        "Operator F3": {},
        "Supervisor F3": {},
        "Weekly F3": {},
        "Monthly F3": {},
        "Annual F3": {},
        "Inspect F3": {},
        "Calibrate F3": {}
    };
}

function createFurnace4Logs() {
    return {
        "Temperature Log F4": {},
        "Pressure Log F4": {},
        "Quality Log F4": {},
        "Maintenance Log F4": {},
        "Production Log F4": {},
        "Safety Log F4": {},
        "Shift Morning F4": {},
        "Shift Evening F4": {},
        "Shift Night F4": {},
        "Raw Material F4": {},
        "Finished Product F4": {},
        "Defect Tracking F4": {},
        "Efficiency F4": {},
        "Downtime F4": {},
        "Operator Record F4": {},
        "Supervisor Record F4": {},
        "Weekly Record F4": {},
        "Monthly Record F4": {},
        "Inspection Record F4": {},
        "Calibration Record F4": {}
    };
}

async function loadFromIndexedDB() {
    const folderReq = db.transaction('folderStructure','readonly').objectStore('folderStructure').get('structure');
    folderReq.onsuccess = ()=>{
        if(folderReq.result) fileSystem = folderReq.result.value;
        else {
            fileSystem = {
                "REMELT": {
                    "FURNACE 1": createFurnace1Logs(), 
                    "FURNACE 2": createFurnace2Logs(), 
                    "FURNACE 3": createFurnace3Logs(),
                    "FURNACE 4": createFurnace4Logs(), 
                    "FURNACE 5": {}, 
                    "ACD": {}, 
                    "DBF": {}, 
                    "ROD FEEDER": {}, 
                    "LAUNDER HEATERS": {},
                    "LAUNDER PANEL ": {}, 
                    "HPU 1": {}, 
                    "HPU 2": {}, 
                    "M":{}, 
                    "N":{}, 
                    "O":{}, 
                    "P":{}, 
                    "Q":{}, 
                    "R":{}, 
                    "S":{}, 
                    "T":{}, 
                    "U":{}, 
                    "V":{}, 
                    "W":{}, 
                    "X":{}, 
                    "Y":{}, 
                    "Z":{}
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
    const folderPath = currentPath.join('/');
    if(!allFiles[folderPath]) allFiles[folderPath] = [];
    const base64 = await new Promise(r=>{const rd=new FileReader(); rd.onload=e=>r(e.target.result); rd.readAsDataURL(file);});
    allFiles[folderPath].push({name:file.name, dataUrl:base64, type:file.type});
    await saveAllFilesToDB();
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
    const folderPath = currentPath.join('/');
    if(!allNotes[folderPath]) allNotes[folderPath]=[];
    const note = { id: Date.now()+'-'+Math.random().toString(36).substr(2,6), title:title.trim(), content:content.trim(), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
    allNotes[folderPath].push(note);
    await saveAllNotesToDB();
    render();
    showToast(`✅ Note "${title}" created`);
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
        <div class="card-icon"><i class="fas fa-sticky-note"></i></div>
        <div class="card-filename" title="${escapeHtml(note.title)}">${escapeHtml(note.title)}</div>
        <div class="card-buttons">
            <button class="rename-note-btn" title="Rename Note"><i class="fas fa-edit"></i></button>
            <button class="delete-note-btn" title="Delete Note"><i class="fas fa-trash"></i></button>
        </div>
    `;
    div.addEventListener('click', (e)=>{
        if(e.target.closest('.rename-note-btn') || e.target.closest('.delete-note-btn')) return;
        openNote({...note, folder:folderPath});
    });
    div.querySelector('.rename-note-btn').addEventListener('click', (e)=>{
        e.stopPropagation();
        const newTitle = prompt("New note title:", note.title);
        if(newTitle?.trim()) renameNote(folderPath, note.id, newTitle.trim());
    });
    div.querySelector('.delete-note-btn').addEventListener('click', (e)=>{
        e.stopPropagation();
        if(confirm(`Delete note "${note.title}"?`)) deleteNoteFromFolder(folderPath, note.id);
    });
    return div;
}

function createCard(title, onClick, isFolder=false){
    const div = document.createElement('div');
    div.className = isFolder ? 'card glow-folder' : 'card';
    div.innerHTML = `<div class="card-icon"><i class="fas ${isFolder ? 'fa-folder' : 'fa-folder-open'}"></i></div><div class="card-filename">${escapeHtml(title)}</div><div class="card-buttons"></div>`;
    div.onclick = onClick;
    return div;
}

// ========== NAVIGATION WITH 3D PAGE CURL ==========
function selectDepartment(d){ 
    animateContent('forward', () => {
        currentPath = [d]; 
        render();
    });
}

function goBack(){ 
    if(currentPath.length && !isSearchMode){ 
        animateContent('back', () => {
            currentPath.pop(); 
            render();
        });
    } else if(isSearchMode) { 
        clearSearch(); 
    }
}

function navigateToBreadcrumb(idx){
    const isGoingBack = idx < currentPath.length - 1;
    animateContent(isGoingBack ? 'back' : 'forward', () => {
        if(idx===-1) currentPath=[];
        else currentPath = currentPath.slice(0,idx+1);
        render();
    });
}

function render(){
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    if(query){
        isSearchMode=true;
        document.getElementById('clearSearchBtn').classList.remove('hidden');
        const results=[];
        for(const path in allFiles) if(allFiles[path]) allFiles[path].forEach(f=>{ if(f.name.toLowerCase().includes(query)) results.push({...f, folder:path, type:'file'});});
        for(const path in allNotes) if(allNotes[path]) allNotes[path].forEach(n=>{ if(n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)) results.push({...n, folder:path, type:'note'});});
        document.getElementById('searchInfo').classList.remove('hidden');
        document.getElementById('searchInfo').innerHTML = `<i class="fas fa-search"></i> Found ${results.length} result(s) for "${escapeHtml(query)}" <button onclick="clearSearch()">Clear</button>`;
        const contentDiv = document.getElementById('content');
        contentDiv.innerHTML = '';
        document.getElementById('backBtn').classList.remove('hidden');
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('newNoteBtn').classList.add('hidden');
        document.getElementById('departmentsSection').innerHTML = '';
        document.getElementById('breadcrumb').innerHTML = '';
        document.querySelector('.type-selector').style.display = 'none';
        if(!results.length) contentDiv.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No results found.</p></div>';
        else results.forEach(item => { if(item.type==='file') contentDiv.appendChild(createFileCard(item, item.folder)); else contentDiv.appendChild(createNoteCard(item, item.folder)); });
        updateStats();
        attachPressEffects();
        return;
    }
    isSearchMode=false;
    document.getElementById('clearSearchBtn').classList.add('hidden');
    document.getElementById('searchInfo').classList.add('hidden');
    document.getElementById('content').innerHTML = '';
    const folder = getCurrentFolderObject();
    if(!folder){ currentPath=[]; render(); return; }
    document.getElementById('backBtn').classList.toggle('hidden', currentPath.length===0);
    const bcDiv = document.getElementById('breadcrumb');
    bcDiv.innerHTML = `<div class="breadcrumb-item" onclick="navigateToBreadcrumb(-1)"><i class="fas fa-home"></i> Home</div>`;
    currentPath.forEach((f,i)=>{ bcDiv.innerHTML += `<span class="breadcrumb-separator">/</span><div class="breadcrumb-item" onclick="navigateToBreadcrumb(${i})">${escapeHtml(f)}</div>`; });
    const isRoot = currentPath.length===0;
    if(isRoot){
        let html = '<div class="section-title"><i class="fas fa-building"></i> Departments</div><div class="departments-grid">';
        for(let dept in fileSystem){
            const sub = Object.keys(fileSystem[dept]).length;
            const fcount = allFiles[dept]?.length||0;
            const ncount = allNotes[dept]?.length||0;
            html += `<div class="dept-card" data-dept="${dept}"><div class="dept-oval" onclick="selectDepartment('${dept}')"><span>${dept}</span></div><div class="dept-arrow"><i class="fas fa-chevron-right"></i></div><div class="dept-info">${sub+fcount+ncount} items</div></div>`;
        }
        html += '</div>';
        document.getElementById('departmentsSection').innerHTML = html;
        document.getElementById('uploadBtn').classList.add('hidden');
        document.getElementById('newNoteBtn').classList.add('hidden');
        attachDepartmentPressEffects();
    } else document.getElementById('departmentsSection').innerHTML = '';
    
    const hasSubfolders = Object.keys(folder).length>0;
    const isLeafFolder = !isRoot && !hasSubfolders;
    const typeSelector = document.querySelector('.type-selector');
    if(typeSelector) typeSelector.style.display = isLeafFolder ? 'flex' : 'none';
    if(isLeafFolder){
        if(currentActiveTab==='pdfs'){ document.getElementById('uploadBtn').classList.remove('hidden'); document.getElementById('newNoteBtn').classList.add('hidden'); }
        else { document.getElementById('uploadBtn').classList.add('hidden'); document.getElementById('newNoteBtn').classList.remove('hidden'); }
    } else { document.getElementById('uploadBtn').classList.add('hidden'); document.getElementById('newNoteBtn').classList.add('hidden'); }
    const actionDiv = document.createElement('div');
    actionDiv.className = 'action-bar';
    if(!isRoot){
        actionDiv.innerHTML = `<button class="action-btn" onclick="renameCurrentFolder()"><i class="fas fa-edit"></i> Rename Folder</button>
                               <button class="action-btn" onclick="deleteCurrentFolder()"><i class="fas fa-trash-alt"></i> Delete Folder</button>
                               <button class="action-btn" onclick="addNewFolder()"><i class="fas fa-plus"></i> Add Subfolder</button>`;
    } else actionDiv.innerHTML = `<button class="action-btn" onclick="addNewDepartment()"><i class="fas fa-building"></i> Add Department</button>`;
    document.getElementById('content').appendChild(actionDiv);
    
    if(!isRoot && hasSubfolders){
        for(let key in folder) {
            const folderCard = createCard(key, () => { 
                animateContent('forward', () => {
                    currentPath.push(key); 
                    render();
                });
            }, true);
            document.getElementById('content').appendChild(folderCard);
        }
    }
    
    if(isLeafFolder){
        if(currentActiveTab==='pdfs'){
            const files = getFilesForCurrentFolder();
            const path = currentPath.join('/');
            if(files.length) files.forEach(f=>document.getElementById('content').appendChild(createFileCard(f,path)));
            else document.getElementById('content').innerHTML += '<div class="empty-state"><i class="fas fa-cloud-upload-alt"></i><p>No files yet. Click Upload to add PDFs or Images.</p></div>';
        } else {
            const notes = getNotesForCurrentFolder();
            const path = currentPath.join('/');
            if(notes.length) notes.forEach(n=>document.getElementById('content').appendChild(createNoteCard(n,path)));
            else document.getElementById('content').innerHTML += '<div class="empty-state empty-state-note"><i class="fas fa-sticky-note"></i><p>No notes yet. Click + New Note to add.</p></div>';
        }
    }
    updateStats();
    attachPressEffects();
}

function attachDepartmentPressEffects() {
    document.querySelectorAll('.dept-oval').forEach(oval => {
        oval.addEventListener('touchstart', () => {}, { passive: false });
    });
}

function triggerUpload(){ document.getElementById('fileInput').click(); }
function triggerNewNote(){ openNewNoteModal(); }
function clearSearch(){
    document.getElementById('searchInput').value='';
    isSearchMode=false;
    document.getElementById('searchInfo').classList.add('hidden');
    document.getElementById('clearSearchBtn').classList.add('hidden');
    render();
}
function renameCurrentFolder(){
    if(!currentPath.length) return;
    const old = currentPath[currentPath.length-1];
    const newName = prompt("New folder name:", old);
    if(newName && newName!==old && newName.trim()){
        const parent = currentPath.slice(0,-1).reduce((o,p)=>o[p], fileSystem);
        parent[newName] = parent[old];
        delete parent[old];
        const oldPath = currentPath.join('/');
        const newPath = [...currentPath.slice(0,-1), newName].join('/');
        if(allFiles[oldPath]){ allFiles[newPath]=allFiles[oldPath]; delete allFiles[oldPath]; }
        if(allNotes[oldPath]){ allNotes[newPath]=allNotes[oldPath]; delete allNotes[oldPath]; }
        currentPath[currentPath.length-1]=newName;
        saveFolderStructure(); saveAllFilesToDB(); saveAllNotesToDB();
        render();
        showToast(`✅ Renamed to "${newName}"`);
    }
}
function deleteCurrentFolder(){
    if(!currentPath.length) return;
    const name = currentPath[currentPath.length-1];
    if(confirm(`Delete "${name}" and all contents?`)){
        const path = currentPath.join('/');
        delete allFiles[path];
        delete allNotes[path];
        const parent = currentPath.slice(0,-1).reduce((o,p)=>o[p], fileSystem);
        delete parent[name];
        currentPath.pop();
        saveFolderStructure(); saveAllFilesToDB(); saveAllNotesToDB();
        render();
        showToast(`🗑️ Folder "${name}" deleted`);
    }
}
function addNewFolder(){
    const name = prompt("Folder name:");
    if(name && name.trim()){
        const cur = getCurrentFolderObject();
        if(cur && !cur[name]){ cur[name]={}; saveFolderStructure(); render(); showToast(`✅ Folder "${name}" created`); }
        else showToast("Exists",true);
    }
}
function addNewDepartment(){
    const name = prompt("Department name:");
    if(name && name.trim() && !fileSystem[name]){ fileSystem[name]={}; saveFolderStructure(); render(); showToast(`✅ Department "${name}" created`); }
    else if(fileSystem[name]) showToast("Department exists",true);
}
function updateStats(){
    let folderCount=0, fileCount=0, notesCount=0;
    function countFolders(obj){ for(let k in obj) if(typeof obj[k]==='object'){ folderCount++; countFolders(obj[k]); } }
    countFolders(fileSystem);
    for(let k in allFiles) if(allFiles[k]) fileCount += allFiles[k].length;
    for(let k in allNotes) if(allNotes[k]) notesCount += allNotes[k].length;
    document.getElementById('folderCount').textContent = folderCount;
    document.getElementById('fileCount').textContent = fileCount;
    document.getElementById('notesCount').textContent = notesCount;
}
function setActiveTab(tab){
    currentActiveTab = tab;
    const pdfBtn = document.getElementById('pdfTabBtn');
    const notesBtn = document.getElementById('notesTabBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const newNoteBtn = document.getElementById('newNoteBtn');
    if(tab==='pdfs'){ pdfBtn.classList.add('active'); notesBtn.classList.remove('active'); uploadBtn.classList.remove('hidden'); newNoteBtn.classList.add('hidden'); }
    else { pdfBtn.classList.remove('active'); notesBtn.classList.add('active'); uploadBtn.classList.add('hidden'); newNoteBtn.classList.remove('hidden'); }
    render();
}
function openNewNoteModal(){
    editingNoteId = null;
    document.getElementById('noteModalTitle').textContent = 'New Note';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';
    document.getElementById('saveNoteBtn').onclick = async ()=>{
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        if(title.trim()){ await addNoteToCurrentFolder(title, content); closeNoteModal(); }
        else showToast("Title empty",true);
    };
    document.getElementById('noteModal').classList.add('show');
}
function closeNoteModal(){ document.getElementById('noteModal').classList.remove('show'); editingNoteId = null; }
function toggleTheme(){ document.body.classList.toggle('light-mode'); localStorage.setItem('oarcel_theme', document.body.classList.contains('light-mode') ? 'light-mode' : ''); updateThemeIcon(); }
function updateThemeIcon(){
    const isDark = !document.body.classList.contains('light-mode');
    const themeBtn = document.getElementById('themeToggle');
    if(themeBtn) themeBtn.innerHTML = `<div class="theme-icon-wrapper"><i class="fas ${isDark ? 'fa-sun' : 'fa-moon'}"></i></div>`;
}
function addDepthEffect(element, event){
    if(!element || element.hasAttribute('data-press-animating')) return;
    element.setAttribute('data-press-animating','true');
    element.classList.add('press-depth-3d');
    if(window.navigator?.vibrate) window.navigator.vibrate(12);
    const ripple = document.createElement('span');
    ripple.classList.add('touch-ripple');
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    ripple.style.pointerEvents = 'none';
    ripple.style.transform = 'scale(0)';
    ripple.style.transition = 'transform 0.4s ease-out, opacity 0.3s ease-out';
    let clientX, clientY;
    if(event.touches){ clientX = event.touches[0].clientX; clientY = event.touches[0].clientY; }
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
    setTimeout(()=>{
        element.classList.remove('press-depth-3d');
        if(ripple?.parentNode) ripple.parentNode.removeChild(ripple);
        element.removeAttribute('data-press-animating');
    },150);
}
function pressHandler(e){
    if(this.hasAttribute('data-press-animating') || (e.button===2)) return;
    if(e.type==='touchstart' && this.hasAttribute('data-touch-processing')) return;
    if(e.type==='touchstart'){ this.setAttribute('data-touch-processing','true'); setTimeout(()=>this.removeAttribute('data-touch-processing'),200); }
    addDepthEffect(this,e);
}
function attachPressEffects(){
    const selectors = ['#backBtn','.type-btn','.theme-toggle','#uploadBtn','#newNoteBtn','.action-btn','.rename-file-btn','.delete-file-btn','.rename-note-btn','.delete-note-btn','.clear-search','.modal-close','.modal-footer button','.breadcrumb-item','.card','.dept-oval','#closeImageViewer'];
    document.querySelectorAll(selectors.join(',')).forEach(el=>{
        el.removeEventListener('click', pressHandler);
        el.removeEventListener('touchstart', pressHandler);
        el.removeEventListener('mousedown', pressHandler);
        el.addEventListener('mousedown', pressHandler);
        el.addEventListener('touchstart', pressHandler, {passive:false});
        if(window.getComputedStyle(el).cursor==='auto') el.style.cursor='pointer';
    });
}
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
window.openFile = openFile;
window.openNote = openNote;
window.closeNoteModal = closeNoteModal;
window.renameNote = renameNote;
window.deleteNoteFromFolder = deleteNoteFromFolder;
window.closeImageViewer = closeImageViewer;

document.addEventListener('DOMContentLoaded', async ()=>{
    const themeBtn = document.getElementById('themeToggle');
    if(themeBtn) themeBtn.onclick = toggleTheme;
    if(localStorage.getItem('oarcel_theme') === 'light-mode') document.body.classList.add('light-mode');
    updateThemeIcon();
    document.getElementById('pdfTabBtn').onclick = ()=>setActiveTab('pdfs');
    document.getElementById('notesTabBtn').onclick = ()=>setActiveTab('notes');
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeImageViewer();
        }
    });
    
    const closeBtn = document.getElementById('closeImageViewer');
    if(closeBtn) closeBtn.onclick = closeImageViewer;
    
    const viewer = document.getElementById('imageViewer');
    if(viewer) {
        viewer.addEventListener('click', (e) => {
            if (e.target === viewer) closeImageViewer();
        });
    }
    
    document.getElementById('fileInput').addEventListener('change', async (e)=>{
        const files = Array.from(e.target.files);
        for(let f of files) {
            const fileType = getFileType(f.name);
            if (fileType === 'image' || fileType === 'pdf') {
                await addFileToCurrentFolder(f);
            } else {
                showToast(`Skipped: ${f.name} (not supported)`, true);
            }
        }
        showToast(`${files.length} file(s) saved!`);
        render();
        e.target.value = '';
    });
    document.getElementById('newNoteBtn').onclick = triggerNewNote;
    document.getElementById('searchInput').addEventListener('input', ()=>render());
    document.getElementById('clearSearchBtn').addEventListener('click', clearSearch);
    document.getElementById('backBtn').addEventListener('click', goBack);
    document.getElementById('uploadBtn').addEventListener('click', triggerUpload);
    await initDB();
    await loadFromIndexedDB();
    attachPressEffects();
});